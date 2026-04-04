import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type AIModel = "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";

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

interface StructuredOptions<T> {
  model?: AIModel;
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  parseResponse: (text: string) => T;
}

export async function generateStructuredResponse<T>({
  model = "claude-sonnet-4-6",
  systemPrompt,
  userMessage,
  maxTokens = 4096,
  temperature = 0.3,
  parseResponse,
}: StructuredOptions<T>): Promise<T> {
  const text = await generateAIResponse({
    model,
    systemPrompt,
    userMessage,
    maxTokens,
    temperature,
  });

  return parseResponse(text);
}

export { anthropic };
