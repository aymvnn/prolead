import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Daily sending limit (Resend free tier)
 */
const DAILY_SEND_LIMIT = 100;

/**
 * POST /api/campaigns/[id]/activate
 *
 * Activates a campaign:
 * 1. Sets campaign status to 'active'
 * 2. Sets all pending campaign_leads to 'active'
 * 3. Loads leads SORTED BY ICP SCORE (warm → cold)
 * 4. Schedules sequence steps in batches of 100/day (warmest first)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Load campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, name, status, org_id, settings")
    .eq("id", id)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json(
      { error: "Campaign niet gevonden" },
      { status: 404 },
    );
  }

  if (campaign.status === "active") {
    return NextResponse.json(
      { error: "Campaign is al actief" },
      { status: 400 },
    );
  }

  // 2. Check that there's at least one sequence with steps
  const { data: sequences } = await supabase
    .from("sequences")
    .select("id, steps_count")
    .eq("campaign_id", id);

  const hasSteps = sequences?.some((s) => s.steps_count > 0);

  if (!sequences || sequences.length === 0 || !hasSteps) {
    return NextResponse.json(
      {
        error:
          "Campaign heeft geen sequences met stappen. Maak eerst minstens 1 sequence met stappen aan.",
      },
      { status: 400 },
    );
  }

  // 3. Check that there are leads in the campaign
  const { count: leadsCount } = await supabase
    .from("campaign_leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id);

  if (!leadsCount || leadsCount === 0) {
    return NextResponse.json(
      {
        error:
          "Campaign heeft geen leads. Voeg eerst leads toe aan de campaign.",
      },
      { status: 400 },
    );
  }

  // 4. Activate campaign
  const { error: updateError } = await supabase
    .from("campaigns")
    .update({ status: "active" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  // 5. Activate all pending leads
  await supabase
    .from("campaign_leads")
    .update({ status: "active" })
    .eq("campaign_id", id)
    .eq("status", "pending");

  // 6. Get the first sequence with steps
  const { data: firstSequence } = await supabase
    .from("sequences")
    .select("id")
    .eq("campaign_id", id)
    .gt("steps_count", 0)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  // 7. Get all campaign_leads JOINED with leads, SORTED BY ICP SCORE DESC (warm → cold)
  const { data: sortedCampaignLeads } = await supabase
    .from("campaign_leads")
    .select("id, lead_id, leads(icp_score)")
    .eq("campaign_id", id)
    .eq("status", "active")
    .order("lead_id", { ascending: true }); // We'll sort in JS by icp_score

  // Sort by ICP score descending (warmest first, nulls last)
  const sortedLeads = (sortedCampaignLeads || []).sort((a, b) => {
    const scoreA =
      (a.leads as unknown as { icp_score: number | null })?.icp_score ?? -1;
    const scoreB =
      (b.leads as unknown as { icp_score: number | null })?.icp_score ?? -1;
    return scoreB - scoreA; // Highest score first
  });

  // 8. Use campaign daily_limit setting if available, else default to DAILY_SEND_LIMIT
  const campaignSettings = (campaign.settings || {}) as {
    daily_limit?: number;
  };
  const dailyLimit = Math.min(
    campaignSettings.daily_limit || DAILY_SEND_LIMIT,
    DAILY_SEND_LIMIT,
  );

  // 9. Schedule Inngest events in daily batches
  let eventsTriggered = 0;
  const totalDays = Math.ceil(sortedLeads.length / dailyLimit);

  if (firstSequence && sortedLeads.length > 0) {
    try {
      const { inngest } = await import("@/lib/inngest/client");

      for (let day = 0; day < totalDays; day++) {
        const batchStart = day * dailyLimit;
        const batchEnd = Math.min(batchStart + dailyLimit, sortedLeads.length);
        const batch = sortedLeads.slice(batchStart, batchEnd);

        // Schedule this batch with a delay of `day` days
        // Day 0 = now, Day 1 = +24h, Day 2 = +48h, etc.
        const delayMs = day * 24 * 60 * 60 * 1000;

        const events = batch.map((cl) => ({
          name: "prolead/sequence.step.due" as const,
          data: {
            campaignLeadId: cl.id,
            sequenceId: firstSequence.id,
            stepNumber: 1,
          },
          ...(day > 0 ? { ts: Date.now() + delayMs } : {}),
        }));

        await inngest.send(events);
        eventsTriggered += events.length;
      }
    } catch (err) {
      // Inngest unreachable — roll the campaign back to draft so the user
      // doesn't think "active" means "sending". Previously this was silently
      // swallowed, which caused campaigns to appear active while nothing was
      // actually scheduled.
      await supabase
        .from("campaigns")
        .update({ status: "draft" })
        .eq("id", id);

      await supabase
        .from("campaign_leads")
        .update({ status: "pending" })
        .eq("campaign_id", id)
        .eq("status", "active");

      const message =
        err instanceof Error ? err.message : "Unknown Inngest error";
      return NextResponse.json(
        {
          error:
            "Kon sequence-events niet schedulen via Inngest. Campaign is teruggezet naar 'draft'.",
          details: message,
        },
        { status: 500 },
      );
    }
  }

  // 10. Log analytics event
  await supabase.from("analytics_events").insert({
    org_id: campaign.org_id,
    event_type: "campaign_started",
    entity_type: "campaign",
    entity_id: id,
    properties: {
      leads_activated: sortedLeads.length,
      events_triggered: eventsTriggered,
      daily_limit: dailyLimit,
      total_days: totalDays,
      warmest_score:
        (
          sortedLeads[0]?.leads as unknown as {
            icp_score: number | null;
          }
        )?.icp_score ?? null,
      coldest_score:
        (
          sortedLeads[sortedLeads.length - 1]?.leads as unknown as {
            icp_score: number | null;
          }
        )?.icp_score ?? null,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Campaign "${campaign.name}" is geactiveerd`,
    leads_activated: sortedLeads.length,
    daily_limit: dailyLimit,
    total_days: totalDays,
    schedule: `Dag 1: leads 1-${Math.min(dailyLimit, sortedLeads.length)} (warmst)${
      totalDays > 1
        ? ` → Dag ${totalDays}: leads ${(totalDays - 1) * dailyLimit + 1}-${sortedLeads.length} (koudst)`
        : ""
    }`,
    sequence_events_triggered: eventsTriggered,
  });
}
