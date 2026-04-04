import { generateAIResponse } from "../claude";
import {
  RESPONDER_AGENT_SYSTEM_PROMPT,
  buildRespondPrompt,
} from "../prompts/responder";
import type { IntentClassification } from "@/types/database";

interface AutoResponse {
  intent: IntentClassification;
  confidence: number;
  should_respond: boolean;
  should_escalate: boolean;
  escalation_reason: string | null;
  response_subject: string;
  response_body: string;
  response_body_html: string;
  internal_note: string;
}

export async function generateAutoResponse(params: {
  incomingMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  leadInfo: {
    first_name: string;
    company: string;
  };
  businessContext?: string;
}): Promise<AutoResponse> {
  const prompt = buildRespondPrompt(params);

  const response = await generateAIResponse({
    model: "claude-sonnet-4-6",
    systemPrompt: RESPONDER_AGENT_SYSTEM_PROMPT,
    userMessage: prompt,
    temperature: 0.4,
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Responder Agent returned invalid response format");
  }

  return JSON.parse(jsonMatch[0]) as AutoResponse;
}
