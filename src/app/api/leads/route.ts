import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/leads - List leads with optional filters
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
  const tag = searchParams.get("tag");
  const minScore = searchParams.get("min_score");
  const maxScore = searchParams.get("max_score");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`,
    );
  }

  if (minScore) {
    query = query.gte("icp_score", parseInt(minScore));
  }

  if (maxScore) {
    query = query.lte("icp_score", parseInt(maxScore));
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If tag filter is requested, fetch tags and filter
  if (tag && data) {
    const leadIds = data.map((l) => l.id);
    const { data: tags } = await supabase
      .from("lead_tags")
      .select("lead_id")
      .in("lead_id", leadIds)
      .eq("tag", tag);

    const taggedLeadIds = new Set(tags?.map((t) => t.lead_id) || []);
    const filtered = data.filter((l) => taggedLeadIds.has(l.id));

    return NextResponse.json({
      data: filtered,
      count: filtered.length,
      page,
      limit,
    });
  }

  return NextResponse.json({ data, count, page, limit });
}

// DELETE /api/leads - Bulk delete leads
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await request.json();

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "ids array is required" },
      { status: 400 },
    );
  }

  // Delete related data first (tags, notes, trigger events)
  await Promise.all([
    supabase.from("lead_tags").delete().in("lead_id", ids),
    supabase.from("lead_notes").delete().in("lead_id", ids),
    supabase.from("lead_trigger_events").delete().in("lead_id", ids),
  ]);

  const { error } = await supabase.from("leads").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
