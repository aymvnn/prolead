import { z } from "zod";

export const SchedulerSchema = z.object({
  suggested_times: z.array(
    z.object({
      date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      timezone: z.string(),
    }),
  ),
  meeting_title: z.string(),
  meeting_message: z.string(),
  detected_preferences: z.object({
    preferred_days: z.array(z.string()),
    preferred_time_range: z.string(),
    urgency: z.string(),
  }),
});

export type SchedulerResult = z.infer<typeof SchedulerSchema>;

export const schedulerFallback: SchedulerResult = {
  suggested_times: [],
  meeting_title: "Intro call",
  meeting_message: "",
  detected_preferences: {
    preferred_days: [],
    preferred_time_range: "",
    urgency: "low",
  },
};

// JSON schema for Haiku tool_use mode — hand-written to match SchedulerSchema.
export const schedulerToolInputSchema = {
  type: "object" as const,
  properties: {
    suggested_times: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          start_time: { type: "string" },
          end_time: { type: "string" },
          timezone: { type: "string" },
        },
        required: ["date", "start_time", "end_time", "timezone"],
      },
    },
    meeting_title: { type: "string" },
    meeting_message: { type: "string" },
    detected_preferences: {
      type: "object",
      properties: {
        preferred_days: { type: "array", items: { type: "string" } },
        preferred_time_range: { type: "string" },
        urgency: { type: "string" },
      },
      required: ["preferred_days", "preferred_time_range", "urgency"],
    },
  },
  required: [
    "suggested_times",
    "meeting_title",
    "meeting_message",
    "detected_preferences",
  ],
};
