import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/service";

export const dailyAnalytics = inngest.createFunction(
  {
    id: "daily-analytics",
    name: "Daily Analytics Aggregator",
    triggers: [{ cron: "TZ=Europe/Amsterdam 0 0 * * *" }],
  },
  async ({ step }: { step: any }) => {
    const supabase = createServiceClient();

    // Yesterday in ISO format (date only)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    // ── Get all organizations ────────────────────────
    const orgs = await step.run("load-organizations", async () => {
      const { data } = await supabase.from("organizations").select("id");
      return data || [];
    });

    // ── Aggregate stats per organization ─────────────
    for (const org of orgs as Array<{ id: string }>) {
      await step.run(`aggregate-${org.id}`, async () => {
        // Count emails sent yesterday
        const { count: emailsSent } = await supabase
          .from("emails")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("direction", "outbound")
          .gte("sent_at", dayStart)
          .lte("sent_at", dayEnd);

        // Count emails opened yesterday
        const { count: emailsOpened } = await supabase
          .from("emails")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .not("opened_at", "is", null)
          .gte("opened_at", dayStart)
          .lte("opened_at", dayEnd);

        // Count emails replied yesterday
        const { count: emailsReplied } = await supabase
          .from("emails")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .not("replied_at", "is", null)
          .gte("replied_at", dayStart)
          .lte("replied_at", dayEnd);

        // Count meetings booked yesterday
        const { count: meetingsBooked } = await supabase
          .from("meetings")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .gte("created_at", dayStart)
          .lte("created_at", dayEnd);

        // Count leads researched (enrichment_data populated yesterday)
        const { count: leadsResearched } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .not("enrichment_data", "is", null)
          .gte("updated_at", dayStart)
          .lte("updated_at", dayEnd)
          .eq("status", "researched");

        const sent = emailsSent ?? 0;
        const opened = emailsOpened ?? 0;
        const replied = emailsReplied ?? 0;

        const openRate = sent > 0 ? Math.round((opened / sent) * 10000) / 100 : 0;
        const responseRate =
          sent > 0 ? Math.round((replied / sent) * 10000) / 100 : 0;

        // Insert into daily_stats
        await supabase.from("daily_stats").insert({
          org_id: org.id,
          date: dateStr,
          emails_sent: sent,
          emails_opened: opened,
          emails_replied: replied,
          meetings_booked: meetingsBooked ?? 0,
          leads_researched: leadsResearched ?? 0,
          open_rate: openRate,
          response_rate: responseRate,
        });

        return {
          org_id: org.id,
          date: dateStr,
          emails_sent: sent,
        };
      });
    }

    return { success: true, date: dateStr, orgsProcessed: orgs.length };
  },
);
