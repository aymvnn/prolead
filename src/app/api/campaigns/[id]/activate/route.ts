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

  // 8b. Real-capacity check: sum remaining daily capacity across this org's
  //     active email accounts. If today's capacity is tighter than `dailyLimit`,
  //     shrink today's batch and push the rest to tomorrow+. This prevents the
  //     send-sequence-step function from fanning out 100 events to an inbox
  //     that can only send 20 more today.
  const { data: accounts } = await supabase
    .from("email_accounts")
    .select("daily_limit, emails_sent_today")
    .eq("org_id", campaign.org_id)
    .eq("is_active", true);
  const dailyCapacityRemaining = (accounts ?? []).reduce(
    (sum, a) => sum + Math.max(0, a.daily_limit - a.emails_sent_today),
    0,
  );
  const todaysBatchSize = Math.min(dailyLimit, dailyCapacityRemaining);
  const capacityWarning =
    dailyCapacityRemaining < dailyLimit
      ? `Today's capacity (${dailyCapacityRemaining}) is less than batch size (${dailyLimit}); today's first batch is reduced accordingly and the rest is staggered over following days.`
      : null;

  // 9. Build day-by-day batch plan. Each entry = (dayOffset, batch of leads).
  //    Day 0 uses today's real capacity; subsequent days use full dailyLimit.
  //    If today's capacity is 0, the plan starts at day 1 so the first batch
  //    fires tomorrow.
  type BatchPlan = { dayOffset: number; leads: typeof sortedLeads };
  const plan: BatchPlan[] = [];
  let remaining = [...sortedLeads];
  let dayOffset = 0;

  if (todaysBatchSize > 0 && remaining.length > 0) {
    plan.push({ dayOffset: 0, leads: remaining.slice(0, todaysBatchSize) });
    remaining = remaining.slice(todaysBatchSize);
  }
  // Any leads that didn't fit today go on day 1, 2, 3, ...
  dayOffset = 1;
  while (remaining.length > 0 && dailyLimit > 0) {
    const chunk = remaining.slice(0, dailyLimit);
    plan.push({ dayOffset, leads: chunk });
    remaining = remaining.slice(dailyLimit);
    dayOffset += 1;
  }

  let eventsTriggered = 0;
  const totalDays = plan.length;

  if (firstSequence && plan.length > 0) {
    try {
      const { inngest } = await import("@/lib/inngest/client");

      for (const { dayOffset: day, leads: batch } of plan) {
        // Schedule this batch with a delay of `day` days
        // Day 0 = now, Day 1 = +24h, Day 2 = +48h, etc.
        const delayMs = day * 24 * 60 * 60 * 1000;
        const dueDate = new Date(Date.now() + delayMs)
          .toISOString()
          .slice(0, 10);

        const events = batch.map((cl) => ({
          // Idempotency: (lead, step, due-day). A retry of this activate call
          // cannot enqueue the same step twice for the same day.
          id: `step-due-${cl.id}-1-${dueDate}`,
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
    todays_batch_size: todaysBatchSize,
    daily_capacity_remaining: dailyCapacityRemaining,
    total_days: totalDays,
    schedule: `Dag 1: leads 1-${Math.min(todaysBatchSize, sortedLeads.length)} (warmst)${
      totalDays > 1
        ? ` → Dag ${totalDays}: rest (koudst)`
        : ""
    }`,
    sequence_events_triggered: eventsTriggered,
    ...(capacityWarning ? { capacity_warning: capacityWarning } : {}),
  });
}
