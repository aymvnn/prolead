import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type AIModel = "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";

// ─────────────────────────────────────────────────────────────
// Plain text generation (kept for callers that just want raw text)
// ─────────────────────────────────────────────────────────────
interface GenerateOptions {
  model?: AIModel;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateAIResponse({
  model = "claude-sonnet-4-6",
  systemPrompt,
  userMessage,
  maxTokens = 4096,
  temperature = 0.7,
}: GenerateOptions): Promise<string> {
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}

// ─────────────────────────────────────────────────────────────
// Structured generation (Zod-validated, prompt-cached, retrying)
// ─────────────────────────────────────────────────────────────

export interface GenerateStructuredArgs<T> {
  system: string;
  userMessage: string;
  model: string;
  maxTokens: number;
  temperature: number;
  schema: z.ZodType<T>;
  schemaName: string;
  fallback: T;
  // Optional tool-use mode for guaranteed JSON (Haiku classifiers)
  tools?: Anthropic.Tool[];
  toolChoice?: Anthropic.ToolChoice;
}

function stripMarkdownFences(text: string): string {
  const trimmed = text.trim();
  // ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

function tryParseJson(raw: string): unknown | null {
  const stripped = stripMarkdownFences(raw);
  try {
    return JSON.parse(stripped);
  } catch {
    const objectMatch = stripped.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isRetriableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    status?: number;
    type?: string;
    error?: { type?: string };
    name?: string;
  };
  if (typeof e.status === "number" && e.status >= 500 && e.status < 600) {
    return true;
  }
  if (e.status === 429) return true;
  const type = e.error?.type || e.type || "";
  if (type === "overloaded_error" || type === "rate_limit_error") return true;
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAnthropicWithBackoff(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  const delays = [1000, 3000, 9000];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return (await anthropic.messages.create(params)) as Anthropic.Message;
    } catch (err) {
      lastError = err;
      if (!isRetriableError(err) || attempt === 2) {
        throw err;
      }
      await sleep(delays[attempt]);
    }
  }

  throw lastError;
}

export async function generateStructured<T>(
  args: GenerateStructuredArgs<T>,
): Promise<T> {
  const {
    system,
    userMessage,
    model,
    maxTokens,
    temperature,
    schema,
    schemaName,
    fallback,
    tools,
    toolChoice,
  } = args;

  // Cached system block — prompts are stable across calls
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: system,
      cache_control: { type: "ephemeral" },
    },
  ];

  const useTools = Boolean(tools && toolChoice);

  const buildParams = (
    userContent: string,
  ): Anthropic.MessageCreateParamsNonStreaming => {
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemBlocks,
      messages: [{ role: "user", content: userContent }],
    };
    if (useTools) {
      params.tools = tools;
      params.tool_choice = toolChoice;
    }
    return params;
  };

  const extractRaw = (msg: Anthropic.Message): unknown | null => {
    if (useTools) {
      const toolUse = msg.content.find(
        (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
      );
      return toolUse ? toolUse.input : null;
    }
    const textBlock = msg.content.find(
      (c): c is Anthropic.TextBlock => c.type === "text",
    );
    return textBlock ? tryParseJson(textBlock.text) : null;
  };

  // ── Attempt 1 ──────────────────────────────────────────────
  try {
    const message = await callAnthropicWithBackoff(buildParams(userMessage));
    const raw = extractRaw(message);
    if (raw !== null) {
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;

      // ── Attempt 2: tell model what was wrong ─────────────
      const errorSummary = JSON.stringify(parsed.error.issues);
      const retryMessage =
        userMessage +
        `\n\nYour previous response was invalid JSON for the ${schemaName} schema. ` +
        `Errors: ${errorSummary}. Return ONLY the object, no prose, no markdown fences.`;

      try {
        const retry = await callAnthropicWithBackoff(buildParams(retryMessage));
        const retryRaw = extractRaw(retry);
        if (retryRaw !== null) {
          const retryParsed = schema.safeParse(retryRaw);
          if (retryParsed.success) return retryParsed.data;
          console.error(
            `[generateStructured:${schemaName}] Second validation failed`,
            retryParsed.error.issues,
          );
        } else {
          console.error(
            `[generateStructured:${schemaName}] Second call returned no parseable content`,
          );
        }
      } catch (retryErr) {
        console.error(
          `[generateStructured:${schemaName}] Retry call failed`,
          retryErr,
        );
      }
    } else {
      console.error(
        `[generateStructured:${schemaName}] First call returned no parseable content`,
      );
    }
  } catch (err) {
    console.error(`[generateStructured:${schemaName}] First call failed`, err);
  }

  return fallback;
}

export { anthropic };
