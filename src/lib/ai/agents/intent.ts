import { generateAIResponse } from "../claude";
import {
  INTENT_AGENT_SYSTEM_PROMPT,
  buildIntentPrompt,
} from "../prompts/intent";
import type { IntentClassification } from "@/types/database";

export interface IntentResult {
  intent: IntentClassification;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative";
  meeting_signals: string[];
  urgency: "high" | "medium" | "low";
  summary: string;
}

export async function detectIntent(message: string): Promise<IntentResult> {
  const prompt = buildIntentPrompt(message);

  const response = await generateAIResponse({
    model: "claude-haiku-4-5-20251001",
    systemPrompt: INTENT_AGENT_SYSTEM_PROMPT,
    userMessage: prompt,
    maxTokens: 512,
    temperature: 0.1,
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Intent Agent returned invalid response format");
  }

  return JSON.parse(jsonMatch[0]) as IntentResult;
}
