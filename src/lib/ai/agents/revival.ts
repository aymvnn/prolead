import type Anthropic from "@anthropic-ai/sdk";
import { generateStructured } from "@/lib/ai/claude";
import {
  REVIVAL_AGENT_SYSTEM_PROMPT,
  REVIVAL_GATE_SYSTEM_PROMPT,
  buildRevivalPrompt,
  buildRevivalGatePrompt,
} from "@/lib/ai/prompts/revival";
import {
  RevivalSchema,
  RevivalGateSchema,
  revivalFallback,
  revivalGateFallback,
  revivalGateToolInputSchema,
  type RevivalResult,
  type RevivalGateResult,
} from "@/lib/ai/schemas/revival";

export type { RevivalResult, RevivalGateResult };

const gateTools: Anthropic.Tool[] = [
  {
    name: "output",
    description: "Return the revival gate decision",
    input_schema: revivalGateToolInputSchema,
  },
];

const gateToolChoice: Anthropic.ToolChoice = { type: "tool", name: "output" };

/**
 * Cheap Haiku pre-check to decide whether a lead is worth reviving at all.
 * Returns `should_revive: false` if the trigger isn't concrete or recent enough.
 */
export async function shouldReviveLead(
  leadName: string,
  company: string,
  previousInteraction: string,
  triggerEvent: {
    type: string;
    data: Record<string, unknown>;
    detected_at: string;
  },
  language: string = "en",
): Promise<RevivalGateResult> {
  const userMessage = buildRevivalGatePrompt(
    leadName,
    company,
    previousInteraction,
    triggerEvent,
    language,
  );

  return generateStructured<RevivalGateResult>({
    system: REVIVAL_GATE_SYSTEM_PROMPT,
    userMessage,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 256,
    temperature: 0.1,
    schema: RevivalGateSchema,
    schemaName: "RevivalGate",
    fallback: revivalGateFallback,
    tools: gateTools,
    toolChoice: gateToolChoice,
  });
}

/**
 * Two-pass revival:
 * 1. Haiku gate decides whether to continue.
 * 2. Sonnet generates the full revival email only if the gate says yes.
 *
 * If the gate says no, returns the fallback (no Sonnet call = no spend).
 */
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
  language: string = "en",
  leadRegion: string = "nl",
): Promise<RevivalResult> {
  // Pass 1: cheap gate
  const gate = await shouldReviveLead(
    leadName,
    company,
    previousInteraction,
    triggerEvent,
    language,
  );

  if (!gate.should_revive) {
    return {
      ...revivalFallback,
      should_revive: false,
      reasoning: gate.reason || revivalFallback.reasoning,
    };
  }

  // Pass 2: full Sonnet generator
  const userMessage = buildRevivalPrompt(
    leadName,
    company,
    previousInteraction,
    triggerEvent,
    originalCampaignContext,
    language,
    leadRegion,
  );

  return generateStructured<RevivalResult>({
    system: REVIVAL_AGENT_SYSTEM_PROMPT,
    userMessage,
    model: "claude-sonnet-4-6",
    maxTokens: 2048,
    temperature: 0.5,
    schema: RevivalSchema,
    schemaName: "Revival",
    fallback: revivalFallback,
  });
}
