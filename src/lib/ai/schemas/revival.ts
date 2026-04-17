import { z } from "zod";

// Gate schema — cheap Haiku pre-check whether the lead is worth reviving.
export const RevivalGateSchema = z.object({
  should_revive: z.boolean(),
  reason: z.string(),
  urgency: z.enum(["high", "medium", "low"]),
});

export type RevivalGateResult = z.infer<typeof RevivalGateSchema>;

export const revivalGateFallback: RevivalGateResult = {
  should_revive: false,
  reason: "Revival gate fallback — skipping revival",
  urgency: "low",
};

export const revivalGateToolInputSchema = {
  type: "object" as const,
  properties: {
    should_revive: { type: "boolean" },
    reason: { type: "string" },
    urgency: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["should_revive", "reason", "urgency"],
};

// Full revival schema — Sonnet only runs if the gate says yes.
export const RevivalSchema = z.object({
  should_revive: z.boolean(),
  revival_score: z.number().min(0).max(100),
  trigger_relevance: z.string(),
  recommended_channel: z.string(),
  recommended_delay_hours: z.number(),
  subject: z.string(),
  body: z.string(),
  reasoning: z.string(),
  talking_points: z.array(z.string()),
});

export type RevivalResult = z.infer<typeof RevivalSchema>;

export const revivalFallback: RevivalResult = {
  should_revive: false,
  revival_score: 0,
  trigger_relevance: "low",
  recommended_channel: "email",
  recommended_delay_hours: 0,
  subject: "",
  body: "",
  reasoning: "Revival Agent fallback — lead skipped",
  talking_points: [],
};
