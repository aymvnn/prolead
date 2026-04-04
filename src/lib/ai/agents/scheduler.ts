import { generateStructuredResponse } from "@/lib/ai/claude";
import {
  SCHEDULER_AGENT_SYSTEM_PROMPT,
  buildSchedulerPrompt,
} from "@/lib/ai/prompts/scheduler";

export interface SchedulerResult {
  suggested_times: {
    date: string;
    start_time: string;
    end_time: string;
    timezone: string;
  }[];
  meeting_title: string;
  meeting_message: string;
  detected_preferences: {
    preferred_days: string[];
    preferred_time_range: string;
    urgency: string;
  };
}

export async function scheduleMeeting(
  leadName: string,
  company: string,
  conversationHistory: string,
  availableSlots?: string,
): Promise<SchedulerResult> {
  const userMessage = buildSchedulerPrompt(
    leadName,
    company,
    conversationHistory,
    availableSlots,
  );

  return generateStructuredResponse<SchedulerResult>({
    model: "claude-haiku-4-5-20251001",
    systemPrompt: SCHEDULER_AGENT_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 2048,
    temperature: 0.3,
    parseResponse: (text) => {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in scheduler response");
      return JSON.parse(jsonMatch[0]);
    },
  });
}
