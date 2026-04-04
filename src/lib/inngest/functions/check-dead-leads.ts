import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** Number of days of inactivity before a lead is considered dead. */
const DEAD_LEAD_THRESHOLD_DAYS = 14;

export const checkDeadLeads = inngest.createFunction(
  {
    id: "check-dead-leads",
    name: "Dead Lead Scanner",
    triggers: [{ cron: "TZ=Europe/Amsterdam 0 9 * * *" }],
  },
  async ({ step }: { step: any }) => {
    const supabase = createServiceClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DEAD_LEAD_THRESHOLD_DAYS);
    const cutoff = cutoffDate.toISOString();

    // ── Find dead leads ──────────────────────────────
    const deadLeads = await step.run("find-dead-leads", async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, first_name, last_name, company, org_id")
        .eq("status", "contacted")
        .lt("last_activity_at", cutoff);

      if (error) {
        throw new Error(`Failed to query dead leads: ${error.message}`);
      }

      return data || [];
    });

    if (deadLeads.length === 0) {
      return { success: true, deadLeadsFound: 0, triggersCreated: 0 };
    }

    // ── Create trigger events for each dead lead ─────
    const triggersCreated = await step.run("create-trigger-events", async () => {
      const triggerRows = deadLeads.map(
        (lead: { id: string }) => ({
          lead_id: lead.id,
          event_type: "company_news" as const,
          event_data: {
            reason: "dead_lead_revival",
            days_inactive: DEAD_LEAD_THRESHOLD_DAYS,
            detected_at: new Date().toISOString(),
          },
          detected_at: new Date().toISOString(),
        }),
      );

      const { data, error } = await supabase
        .from("lead_trigger_events")
        .insert(triggerRows)
        .select("id");

      if (error) {
        throw new Error(`Failed to create trigger events: ${error.message}`);
      }

      return data?.length ?? 0;
    });

    return {
      success: true,
      deadLeadsFound: deadLeads.length,
      triggersCreated,
    };
  },
);
