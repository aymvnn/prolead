import type Anthropic from "@anthropic-ai/sdk";
import { generateStructured } from "@/lib/ai/claude";
import {
  SCHEDULER_AGENT_SYSTEM_PROMPT,
  buildSchedulerPrompt,
} from "@/lib/ai/prompts/scheduler";
import {
  SchedulerSchema,
  schedulerFallback,
  schedulerToolInputSchema,
  type SchedulerResult,
} from "@/lib/ai/schemas/scheduler";

export type { SchedulerResult };

const tools: Anthropic.Tool[] = [
  {
    name: "output",
    description: "Return the structured scheduling proposal",
    input_schema: schedulerToolInputSchema,
  },
];

const toolChoice: Anthropic.ToolChoice = { type: "tool", name: "output" };

export interface ScheduleMeetingOptions {
  senderTimezone?: string;
  leadRegion?: string;
  language?: string;
}

export async function scheduleMeeting(
  leadName: string,
  company: string,
  conversationHistory: string,
  availableSlots?: string,
  options: ScheduleMeetingOptions = {},
): Promise<SchedulerResult> {
  const userMessage = buildSchedulerPrompt({
    leadName,
    company,
    conversationHistory,
    availableSlots,
    senderTimezone: options.senderTimezone,
    leadRegion: options.leadRegion,
    language: options.language,
  });

  return generateStructured<SchedulerResult>({
    system: SCHEDULER_AGENT_SYSTEM_PROMPT,
    userMessage,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 2048,
    temperature: 0.3,
    schema: SchedulerSchema,
    schemaName: "Scheduler",
    fallback: schedulerFallback,
    tools,
    toolChoice,
  });
}
