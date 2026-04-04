import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/campaigns - List campaigns with stats
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let query = supabase
    .from("campaigns")
    .select("*, icp_profiles(name), voice_profiles(name)")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: campaigns, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch stats for each campaign: lead count, emails sent, replied, meetings
  const campaignIds = (campaigns || []).map((c) => c.id);

  if (campaignIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const [leadsResult, emailsResult, meetingsResult] = await Promise.all([
    supabase
      .from("campaign_leads")
      .select("campaign_id", { count: "exact" })
      .in("campaign_id", campaignIds),
    supabase
      .from("emails")
      .select("campaign_id, status")
      .in("campaign_id", campaignIds),
    supabase
      .from("meetings")
      .select("id, lead_id")
      .in(
        "lead_id",
        // Get lead IDs that are in these campaigns
        (
          await supabase
            .from("campaign_leads")
            .select("lead_id")
            .in("campaign_id", campaignIds)
        ).data?.map((cl) => cl.lead_id) || [],
      ),
  ]);

  // Build lead counts per campaign
  const leadCounts: Record<string, number> = {};
  if (leadsResult.data) {
    for (const cl of leadsResult.data) {
      leadCounts[cl.campaign_id] = (leadCounts[cl.campaign_id] || 0) + 1;
    }
  }

  // Build email stats per campaign
  const emailStats: Record<
    string,
    { sent: number; replied: number }
  > = {};
  if (emailsResult.data) {
    for (const e of emailsResult.data) {
      if (!e.campaign_id) continue;
      if (!emailStats[e.campaign_id]) {
        emailStats[e.campaign_id] = { sent: 0, replied: 0 };
      }
      if (
        ["sent", "delivered", "opened", "clicked", "replied"].includes(
          e.status,
        )
      ) {
        emailStats[e.campaign_id].sent++;
      }
      if (e.status === "replied") {
        emailStats[e.campaign_id].replied++;
      }
    }
  }

  const enriched = (campaigns || []).map((c) => ({
    ...c,
    leads_count: leadCounts[c.id] || 0,
    emails_sent: emailStats[c.id]?.sent || 0,
    emails_replied: emailStats[c.id]?.replied || 0,
    reply_rate:
      emailStats[c.id]?.sent > 0
        ? Number(
            (
              (emailStats[c.id].replied / emailStats[c.id].sent) *
              100
            ).toFixed(1),
          )
        : 0,
    meetings_count: meetingsResult.data?.length || 0,
  }));

  return NextResponse.json({ data: enriched });
}

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, icp_id, voice_profile_id, settings } = body;

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  // Get user's org_id
  const { data: userData } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json(
      { error: "User organization not found" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: userData.org_id,
      name,
      icp_id: icp_id || null,
      voice_profile_id: voice_profile_id || null,
      settings: settings || {},
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
