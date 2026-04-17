import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendSequenceStep } from "@/lib/inngest/functions/send-sequence-step";
import { dailyAnalytics } from "@/lib/inngest/functions/daily-analytics";
import { warmupScheduler } from "@/lib/inngest/functions/warmup-scheduler";

// check-dead-leads unregistered (no consumer for lead_trigger_events)

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendSequenceStep, dailyAnalytics, warmupScheduler],
});
