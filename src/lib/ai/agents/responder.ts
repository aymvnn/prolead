import { generateStructured } from "../claude";
import {
  RESPONDER_AGENT_SYSTEM_PROMPT,
  buildRespondPrompt,
} from "../prompts/responder";
import {
  ResponderSchema,
  responderFallback,
  type ResponderResult,
} from "../schemas/responder";

export type AutoResponse = ResponderResult;

export async function generateAutoResponse(params: {
  incomingMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  leadInfo: {
    first_name: string;
    company: string;
  };
  businessContext?: string;
  language?: string;
  leadRegion?: string;
}): Promise<AutoResponse> {
  const userMessage = buildRespondPrompt(params);

  return generateStructured<ResponderResult>({
    system: RESPONDER_AGENT_SYSTEM_PROMPT,
    userMessage,
    model: "claude-sonnet-4-6",
    maxTokens: 1536,
    temperature: 0.4,
    schema: ResponderSchema,
    schemaName: "Responder",
    fallback: responderFallback,
  });
}
