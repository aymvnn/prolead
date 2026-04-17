import type Anthropic from "@anthropic-ai/sdk";
import { generateStructured } from "../claude";
import {
  INTENT_AGENT_SYSTEM_PROMPT,
  buildIntentPrompt,
} from "../prompts/intent";
import {
  IntentSchema,
  intentFallback,
  intentToolInputSchema,
  type IntentResult,
} from "../schemas/intent";

export type { IntentResult };

const tools: Anthropic.Tool[] = [
  {
    name: "output",
    description: "Return the structured intent classification result",
    input_schema: intentToolInputSchema,
  },
];

const toolChoice: Anthropic.ToolChoice = { type: "tool", name: "output" };

export async function detectIntent(
  message: string,
  language: string = "en",
): Promise<IntentResult> {
  const userMessage = buildIntentPrompt(message, language);

  return generateStructured<IntentResult>({
    system: INTENT_AGENT_SYSTEM_PROMPT,
    userMessage,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 512,
    temperature: 0.1,
    schema: IntentSchema,
    schemaName: "Intent",
    fallback: intentFallback,
    tools,
    toolChoice,
  });
}
