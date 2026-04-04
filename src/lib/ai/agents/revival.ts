import { generateStructuredResponse } from "@/lib/ai/claude";
import {
  REVIVAL_AGENT_SYSTEM_PROMPT,
  buildRevivalPrompt,
} from "@/lib/ai/prompts/revival";

export interface RevivalResult {
  should_revive: boolean;
  revival_score: number;
  trigger_relevance: string;
  recommended_channel: string;
  recommended_delay_hours: number;
  subject: string;
  body: string;
  reasoning: string;
  talking_points: string[];
}

export async function generateRevivalEmail(
  leadName: string,
  company: string,
  previousInteraction: string,
  triggerEvent: {
    type: string;
    data: Record<string, unknown>;
    detected_at: string;
  },
  originalCampaignContext?: string,
): Promise<RevivalResult> {
  const userMessage = buildRevivalPrompt(
    leadName,
    company,
    previousInteraction,
    triggerEvent,
    originalCampaignContext,
  );

  return generateStructuredResponse<RevivalResult>({
    model: "claude-sonnet-4-6",
    systemPrompt: REVIVAL_AGENT_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 2048,
    temperature: 0.5,
    parseResponse: (text) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in revival response");
      return JSON.parse(jsonMatch[0]);
    },
  });
}
