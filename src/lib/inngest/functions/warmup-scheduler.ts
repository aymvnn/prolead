import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/service";

export const warmupScheduler = inngest.createFunction(
  {
    id: "warmup-scheduler",
    name: "Email Warmup Reset",
    triggers: [{ cron: "TZ=Europe/Amsterdam 0 7 * * *" }],
  },
  async ({ step }: { step: any }) => {
    const supabase = createServiceClient();

    // ── Reset daily send counters on all email accounts ──
    const result = await step.run("reset-daily-counters", async () => {
      const { data, error } = await supabase
        .from("email_accounts")
        .update({ emails_sent_today: 0 })
        .gt("emails_sent_today", 0)
        .select("id");

      if (error) {
        throw new Error(`Failed to reset daily counters: ${error.message}`);
      }

      return { accountsReset: data?.length ?? 0 };
    });

    return {
      success: true,
      accountsReset: result.accountsReset,
    };
  },
);
