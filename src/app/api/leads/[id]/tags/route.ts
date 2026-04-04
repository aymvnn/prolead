import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/leads/[id]/tags - Add tag(s) to lead
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
  const tags: string[] = Array.isArray(body.tags) ? body.tags : [body.tag];

  if (tags.length === 0) {
    return NextResponse.json(
      { error: "At least one tag is required" },
      { status: 400 },
    );
  }

  // Check lead exists
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Get existing tags to avoid duplicates
  const { data: existingTags } = await supabase
    .from("lead_tags")
    .select("tag")
    .eq("lead_id", id);

  const existingSet = new Set(existingTags?.map((t) => t.tag) || []);
  const newTags = tags.filter((t) => !existingSet.has(t.trim()));

  if (newTags.length === 0) {
    return NextResponse.json({ message: "Tags already exist" });
  }

  const { data, error } = await supabase
    .from("lead_tags")
    .insert(newTags.map((tag) => ({ lead_id: id, tag: tag.trim() })))
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// DELETE /api/leads/[id]/tags - Remove tag from lead
export async function DELETE(
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

  const { tag } = await request.json();

  if (!tag) {
    return NextResponse.json(
      { error: "tag is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("lead_tags")
    .delete()
    .eq("lead_id", id)
    .eq("tag", tag);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
