import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/campaigns/[id]/leads - List leads in campaign
export async function GET(
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

  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // Get campaign_leads with lead data
  const { data, error, count } = await supabase
    .from("campaign_leads")
    .select(
      "id, status, current_step, added_at, leads(id, first_name, last_name, email, company, title, status, icp_score)",
      { count: "exact" },
    )
    .eq("campaign_id", id)
    .order("added_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, page, limit });
}

// POST /api/campaigns/[id]/leads - Add leads to campaign
export async function POST(
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
  const { lead_ids, filter } = body;

  let targetLeadIds: string[] = [];

  if (lead_ids && Array.isArray(lead_ids)) {
    targetLeadIds = lead_ids;
  } else if (filter) {
    // Build query from filter criteria
    let query = supabase.from("leads").select("id");

    if (filter.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }
    if (filter.min_score) {
      query = query.gte("icp_score", filter.min_score);
    }
    if (filter.search) {
      query = query.or(
        `first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%,company.ilike.%${filter.search}%`,
      );
    }
    if (filter.tag) {
      const { data: taggedLeads } = await supabase
        .from("lead_tags")
        .select("lead_id")
        .eq("tag", filter.tag);
      if (taggedLeads && taggedLeads.length > 0) {
        query = query.in(
          "id",
          taggedLeads.map((t) => t.lead_id),
        );
      }
    }

    const { data: filteredLeads } = await query;
    targetLeadIds = (filteredLeads || []).map((l) => l.id);
  }

  if (targetLeadIds.length === 0) {
    return NextResponse.json(
      { error: "No leads to add. Provide lead_ids or filter." },
      { status: 400 },
    );
  }

  // Get existing leads in this campaign to avoid duplicates
  const { data: existing } = await supabase
    .from("campaign_leads")
    .select("lead_id")
    .eq("campaign_id", id);

  const existingIds = new Set((existing || []).map((e) => e.lead_id));
  const newLeadIds = targetLeadIds.filter((lid) => !existingIds.has(lid));

  if (newLeadIds.length === 0) {
    return NextResponse.json({
      data: [],
      added: 0,
      message: "All leads are already in this campaign",
    });
  }

  const rows = newLeadIds.map((lead_id) => ({
    campaign_id: id,
    lead_id,
    status: "pending" as const,
    current_step: 0,
  }));

  const { data, error } = await supabase
    .from("campaign_leads")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { data, added: data?.length || 0 },
    { status: 201 },
  );
}
