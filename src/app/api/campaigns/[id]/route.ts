import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/campaigns/[id] - Get campaign with sequences
export async function GET(
  _request: Request,
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

  const [campaignResult, sequencesResult, leadsCountResult] =
    await Promise.all([
      supabase
        .from("campaigns")
        .select("*, icp_profiles(id, name), voice_profiles(id, name)")
        .eq("id", id)
        .single(),
      supabase
        .from("sequences")
        .select("*, sequence_steps(*)")
        .eq("campaign_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("campaign_leads")
        .select("id", { count: "exact" })
        .eq("campaign_id", id),
    ]);

  if (campaignResult.error) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      ...campaignResult.data,
      sequences: sequencesResult.data || [],
      leads_count: leadsCountResult.count || 0,
    },
  });
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
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

  const body = await request.json();
  const allowedFields = [
    "name",
    "status",
    "icp_id",
    "voice_profile_id",
    "settings",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/campaigns/[id] - Archive-if-active, else hard-delete.
//
// If any `campaign_leads` rows are still `active` or `paused`, Inngest has
// pending events referencing this campaign. A hard-delete would cause
// "campaign_lead not found" noise in Inngest. Instead we flip the campaign to
// `status='archived'` and let in-flight events die gracefully.
export async function DELETE(
  _request: Request,
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

  // Resolve the user's org_id so we can scope the delete (belt + suspenders).
  const { data: userRow } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  const orgId = userRow?.org_id as string | undefined;

  // Count in-flight campaign_leads. If any, archive instead of delete.
  const { count: liveLeadsCount } = await supabase
    .from("campaign_leads")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id)
    .in("status", ["active", "paused"]);

  if ((liveLeadsCount ?? 0) > 0) {
    const archiveQuery = supabase
      .from("campaigns")
      .update({ status: "archived" })
      .eq("id", id);
    const { error: archiveError } = orgId
      ? await archiveQuery.eq("org_id", orgId)
      : await archiveQuery;

    if (archiveError) {
      return NextResponse.json(
        { error: archiveError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, archived: true });
  }

  // Safe to hard-delete. campaign_leads are all in terminal states.
  await Promise.all([
    supabase.from("campaign_leads").delete().eq("campaign_id", id),
    supabase.from("emails").update({ campaign_id: null }).eq("campaign_id", id),
  ]);

  // Sequences and steps cascade via FK
  const deleteQuery = supabase.from("campaigns").delete().eq("id", id);
  const { error } = orgId
    ? await deleteQuery.eq("org_id", orgId)
    : await deleteQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
