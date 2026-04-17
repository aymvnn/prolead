import { z } from "zod";

export const IntentEnum = z.enum([
  "meeting",
  "objection",
  "question",
  "not_interested",
  "unsubscribe",
  "positive",
  "neutral",
  "unknown",
]);

export const ResponderSchema = z.object({
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
  should_respond: z.boolean(),
  should_escalate: z.boolean(),
  escalation_reason: z.string().nullable(),
  response_subject: z.string(),
  response_body: z.string(),
  response_body_html: z.string(),
  internal_note: z.string(),
});

export type ResponderResult = z.infer<typeof ResponderSchema>;

export const responderFallback: ResponderResult = {
  intent: "unknown",
  confidence: 0,
  should_respond: false,
  should_escalate: true,
  escalation_reason: "Responder Agent failed — escalating to human",
  response_subject: "",
  response_body: "",
  response_body_html: "",
  internal_note: "Responder Agent fallback triggered",
};
