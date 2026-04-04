import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/icp - List ICP profiles
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("icp_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// POST /api/icp - Create new ICP profile
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, criteria, description, is_active } = body;

  if (!name || !criteria || !description) {
    return NextResponse.json(
      { error: "name, criteria, and description are required" },
      { status: 400 },
    );
  }

  // If setting this profile as active, deactivate others first
  if (is_active) {
    await supabase
      .from("icp_profiles")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await supabase
    .from("icp_profiles")
    .insert({
      name,
      criteria,
      description,
      is_active: is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
