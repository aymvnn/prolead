import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/ab-tests - List A/B tests (optionally filtered by campaign)
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const campaignId = searchParams.get("campaign_id");

  let query = supabase
    .from("ab_tests")
    .select("*, campaigns(id, name)")
    .order("created_at", { ascending: false });

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/ab-tests - Create a new A/B test
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { campaign_id, name, variant_a, variant_b } = body;

  if (!campaign_id || !name || !variant_a || !variant_b) {
    return NextResponse.json(
      { error: "campaign_id, name, variant_a, and variant_b zijn vereist" },
      { status: 400 },
    );
  }

  // Verify campaign exists
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaign_id)
    .single();

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign niet gevonden" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("ab_tests")
    .insert({
      campaign_id,
      name,
      variant_a,
      variant_b,
      status: "running",
      results: {
        a: { sent: 0, opened: 0, replied: 0 },
        b: { sent: 0, opened: 0, replied: 0 },
      },
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/ab-tests - Update A/B test results or pick winner
export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, winner, status, results } = body;

  if (!id) {
    return NextResponse.json(
      { error: "id is vereist" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};

  if (winner) {
    updates.winner = winner;
    updates.status = "completed";
  }
  if (status) {
    updates.status = status;
  }
  if (results) {
    updates.results = results;
  }

  const { data, error } = await supabase
    .from("ab_tests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
