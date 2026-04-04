import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scheduleMeeting } from "@/lib/ai/agents/scheduler";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId, conversationId } = await request.json();

  if (!leadId) {
    return NextResponse.json(
      { error: "leadId is required" },
      { status: 400 },
    );
  }

  // Fetch lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch conversation history if available
  let conversationHistory = "Geen eerdere conversatie beschikbaar.";
  if (conversationId) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("messages")
      .eq("id", conversationId)
      .single();

    if (conversation?.messages) {
      const messages = conversation.messages as Array<{
        role: string;
        content: string;
        timestamp: string;
      }>;
      conversationHistory = messages
        .map((m) => `${m.role === "assistant" ? "Wij" : "Lead"}: ${m.content}`)
        .join("\n\n");
    }
  }

  try {
    const result = await scheduleMeeting(
      `${lead.first_name} ${lead.last_name}`,
      lead.company,
      conversationHistory,
    );

    // Create meeting record if times were suggested
    if (result.suggested_times.length > 0) {
      const firstSlot = result.suggested_times[0];
      const startTime = new Date(
        `${firstSlot.date}T${firstSlot.start_time}:00`,
      );
      const endTime = new Date(`${firstSlot.date}T${firstSlot.end_time}:00`);

      await supabase.from("meetings").insert({
        lead_id: leadId,
        conversation_id: conversationId || null,
        title: result.meeting_title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        timezone: firstSlot.timezone,
        status: "scheduled",
        notes: `AI-voorgestelde tijden:\n${result.suggested_times
          .map((t) => `${t.date} ${t.start_time}-${t.end_time}`)
          .join("\n")}`,
      });

      // Update lead status
      await supabase
        .from("leads")
        .update({
          status: "meeting_booked",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Scheduler agent error:", error);
    return NextResponse.json(
      { error: "Scheduling failed" },
      { status: 500 },
    );
  }
}
