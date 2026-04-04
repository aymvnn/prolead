import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRevivalEmail } from "@/lib/ai/agents/revival";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId, triggerEventId } = await request.json();

  if (!leadId || !triggerEventId) {
    return NextResponse.json(
      { error: "leadId and triggerEventId are required" },
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

  // Fetch trigger event
  const { data: triggerEvent, error: triggerError } = await supabase
    .from("lead_trigger_events")
    .select("*")
    .eq("id", triggerEventId)
    .single();

  if (triggerError || !triggerEvent) {
    return NextResponse.json(
      { error: "Trigger event not found" },
      { status: 404 },
    );
  }

  // Fetch previous conversation if any
  const { data: conversations } = await supabase
    .from("conversations")
    .select("messages, campaign_id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1);

  let previousInteraction = "Geen eerdere interactie gevonden.";
  let campaignContext: string | undefined;

  if (conversations && conversations.length > 0) {
    const conv = conversations[0];
    const messages = conv.messages as Array<{
      role: string;
      content: string;
    }>;
    if (messages && messages.length > 0) {
      previousInteraction = messages
        .slice(-5) // Last 5 messages
        .map((m) => `${m.role === "assistant" ? "Wij" : "Lead"}: ${m.content}`)
        .join("\n\n");
    }

    if (conv.campaign_id) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("name, settings")
        .eq("id", conv.campaign_id)
        .single();
      if (campaign) {
        campaignContext = `Campaign: ${campaign.name}`;
      }
    }
  }

  try {
    const result = await generateRevivalEmail(
      `${lead.first_name} ${lead.last_name}`,
      lead.company,
      previousInteraction,
      {
        type: triggerEvent.event_type,
        data: triggerEvent.event_data as Record<string, unknown>,
        detected_at: triggerEvent.detected_at,
      },
      campaignContext,
    );

    // If should revive, update lead status back to contacted
    if (result.should_revive) {
      await supabase
        .from("leads")
        .update({
          status: "contacted",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Revival agent error:", error);
    return NextResponse.json(
      { error: "Revival generation failed" },
      { status: 500 },
    );
  }
}
