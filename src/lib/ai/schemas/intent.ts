import { z } from "zod";
import { IntentEnum } from "./responder";

export const IntentSchema = z.object({
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  meeting_signals: z.array(z.string()),
  urgency: z.enum(["high", "medium", "low"]),
  summary: z.string(),
});

export type IntentResult = z.infer<typeof IntentSchema>;

export const intentFallback: IntentResult = {
  intent: "unknown",
  confidence: 0,
  sentiment: "neutral",
  meeting_signals: [],
  urgency: "low",
  summary: "Intent Agent fallback triggered",
};

// JSON schema for Haiku tool_use mode — hand-written to match IntentSchema.
export const intentToolInputSchema = {
  type: "object" as const,
  properties: {
    intent: {
      type: "string",
      enum: [
        "meeting",
        "objection",
        "question",
        "not_interested",
        "unsubscribe",
        "positive",
        "neutral",
        "unknown",
      ],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    sentiment: {
      type: "string",
      enum: ["positive", "neutral", "negative"],
    },
    meeting_signals: { type: "array", items: { type: "string" } },
    urgency: { type: "string", enum: ["high", "medium", "low"] },
    summary: { type: "string" },
  },
  required: [
    "intent",
    "confidence",
    "sentiment",
    "meeting_signals",
    "urgency",
    "summary",
  ],
};
