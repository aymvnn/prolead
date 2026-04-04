import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/sequences/[id]/steps - Add step to sequence
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
  const { step_number, channel, delay_days, delay_hours, template_id, settings } =
    body;

  if (step_number === undefined || !channel) {
    return NextResponse.json(
      { error: "step_number and channel are required" },
      { status: 400 },
    );
  }

  // Verify sequence exists
  const { data: sequence, error: seqError } = await supabase
    .from("sequences")
    .select("id")
    .eq("id", id)
    .single();

  if (seqError || !sequence) {
    return NextResponse.json(
      { error: "Sequence not found" },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("sequence_steps")
    .insert({
      sequence_id: id,
      step_number,
      channel,
      delay_days: delay_days ?? 0,
      delay_hours: delay_hours ?? 0,
      template_id: template_id || null,
      settings: settings || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update steps_count on sequence
  const { count } = await supabase
    .from("sequence_steps")
    .select("id", { count: "exact" })
    .eq("sequence_id", id);

  await supabase
    .from("sequences")
    .update({ steps_count: count || 0 })
    .eq("id", id);

  return NextResponse.json({ data }, { status: 201 });
}

// PUT /api/sequences/[id]/steps - Update step order/settings
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
  const { step_id, step_number, channel, delay_days, delay_hours, template_id, settings } =
    body;

  if (!step_id) {
    return NextResponse.json(
      { error: "step_id is required" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (step_number !== undefined) updates.step_number = step_number;
  if (channel !== undefined) updates.channel = channel;
  if (delay_days !== undefined) updates.delay_days = delay_days;
  if (delay_hours !== undefined) updates.delay_hours = delay_hours;
  if (template_id !== undefined) updates.template_id = template_id || null;
  if (settings !== undefined) updates.settings = settings;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("sequence_steps")
    .update(updates)
    .eq("id", step_id)
    .eq("sequence_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/sequences/[id]/steps - Remove step
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

  const { searchParams } = request.nextUrl;
  const stepId = searchParams.get("step_id");

  if (!stepId) {
    return NextResponse.json(
      { error: "step_id query parameter is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("sequence_steps")
    .delete()
    .eq("id", stepId)
    .eq("sequence_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update steps_count on sequence
  const { count } = await supabase
    .from("sequence_steps")
    .select("id", { count: "exact" })
    .eq("sequence_id", id);

  await supabase
    .from("sequences")
    .update({ steps_count: count || 0 })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
