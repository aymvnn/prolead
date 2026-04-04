import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { sendSequenceStep } from "@/lib/inngest/functions/send-sequence-step";
import { dailyAnalytics } from "@/lib/inngest/functions/daily-analytics";
import { checkDeadLeads } from "@/lib/inngest/functions/check-dead-leads";
import { warmupScheduler } from "@/lib/inngest/functions/warmup-scheduler";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendSequenceStep, dailyAnalytics, checkDeadLeads, warmupScheduler],
});
