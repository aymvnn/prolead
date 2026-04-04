import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processInboundMessage } from "@/lib/ai/agents/orchestrator";

/**
 * POST /api/emails/inbound
 *
 * Processes an inbound reply from a lead through the full AI pipeline:
 * 1. Intent Agent → classify intent (meeting, question, objection, etc.)
 * 2. Based on intent:
 *    - meeting → Scheduler Agent → create meeting
 *    - question/objection → Responder Agent → auto-reply
 *    - unsubscribe → mark lead, no reply
 *    - not_interested → gentle close
 * 3. Updates conversation thread
 * 4. Updates lead status
 * 5. Pauses sequence for this lead
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const body = await request.json();
  const { fromEmail, messageBody, subject } = body;

  if (!fromEmail || !messageBody) {
    return NextResponse.json(
      { error: "fromEmail and messageBody zijn vereist" },
      { status: 400 },
    );
  }

  // 1. Find the lead by email
  const { data: lead } = await supabase
    .from("leads")
    .select("id, first_name, last_name, company, org_id")
    .eq("email", fromEmail)
    .single();

  if (!lead) {
    return NextResponse.json(
      { error: "Lead niet gevonden voor dit emailadres" },
      { status: 404 },
    );
  }

  // 2. Find or create conversation
  let conversation;
  const { data: existingConv } = await supabase
    .from("conversations")
    .select("*")
    .eq("lead_id", lead.id)
    .eq("channel", "email")
    .neq("status", "closed")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (existingConv) {
    conversation = existingConv;
  } else {
    // Find which campaign this lead belongs to
    const { data: campaignLead } = await supabase
      .from("campaign_leads")
      .select("campaign_id")
      .eq("lead_id", lead.id)
      .eq("status", "active")
      .limit(1)
      .single();

    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        lead_id: lead.id,
        campaign_id: campaignLead?.campaign_id || null,
        channel: "email",
        messages: [],
        status: "active",
      })
      .select()
      .single();

    conversation = newConv;
  }

  if (!conversation) {
    return NextResponse.json(
      { error: "Kon geen gesprek aanmaken" },
      { status: 500 },
    );
  }

  // 3. Get existing messages
  const existingMessages = (conversation.messages || []) as Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;

  // 4. Add the inbound message to the thread
  const updatedMessages = [
    ...existingMessages,
    {
      role: "lead",
      content: messageBody,
      timestamp: new Date().toISOString(),
    },
  ];

  // 5. Run through the AI orchestrator
  try {
    const result = await processInboundMessage(messageBody, {
      leadName: `${lead.first_name} ${lead.last_name}`,
      firstName: lead.first_name,
      company: lead.company,
      conversationHistory: existingMessages,
    });

    // 6. Update conversation with AI response
    const finalMessages = [...updatedMessages];
    if (result.response) {
      finalMessages.push({
        role: "assistant",
        content: result.response,
        timestamp: new Date().toISOString(),
      });
    }

    await supabase
      .from("conversations")
      .update({
        messages: finalMessages,
        intent_classification: result.intent.intent,
        status:
          result.action === "escalate"
            ? "escalated"
            : result.action === "unsubscribe" || result.action === "close"
              ? "closed"
              : "active",
        meeting_booked: result.action === "schedule",
        ai_summary: result.intent.summary,
      })
      .eq("id", conversation.id);

    // 7. Update lead status
    const statusMap: Record<string, string> = {
      schedule: "meeting_booked",
      respond: "replied",
      escalate: "replied",
      close: "closed_lost",
      unsubscribe: "unsubscribed",
    };

    const newStatus = statusMap[result.action] || "replied";
    await supabase
      .from("leads")
      .update({
        status: newStatus,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    // 8. Pause the sequence for this lead (stop further automated emails)
    await supabase
      .from("campaign_leads")
      .update({ status: "paused" })
      .eq("lead_id", lead.id)
      .eq("status", "active");

    // 9. If meeting, create a meeting record
    if (result.action === "schedule" && result.meetingProposal) {
      await supabase.from("meetings").insert({
        org_id: lead.org_id,
        lead_id: lead.id,
        conversation_id: conversation.id,
        title: result.meetingProposal.meeting_title,
        start_time: new Date().toISOString(), // Placeholder until confirmed
        end_time: new Date().toISOString(),
        timezone: "Europe/Amsterdam",
        status: "scheduled",
      });
    }

    // 10. Store an email record for the inbound message
    await supabase.from("emails").insert({
      org_id: lead.org_id,
      lead_id: lead.id,
      campaign_id: conversation.campaign_id,
      email_account_id: "00000000-0000-0000-0000-000000000000", // Placeholder
      from_email: fromEmail,
      to_email: "inbound@prolead.app",
      subject: subject || "(geen onderwerp)",
      body_html: `<p>${messageBody}</p>`,
      body_text: messageBody,
      status: "delivered",
      direction: "inbound",
      replied_at: new Date().toISOString(),
    });

    // 11. Log analytics event
    await supabase.from("analytics_events").insert({
      org_id: lead.org_id,
      event_type: "email_replied",
      entity_type: "lead",
      entity_id: lead.id,
      properties: {
        intent: result.intent.intent,
        action: result.action,
        confidence: result.intent.confidence,
        sentiment: result.intent.sentiment,
      },
    });

    return NextResponse.json({
      success: true,
      action: result.action,
      intent: result.intent,
      autoReply: result.response || null,
      meetingProposal: result.meetingProposal || null,
    });
  } catch (error) {
    // If AI processing fails, still save the message
    await supabase
      .from("conversations")
      .update({
        messages: updatedMessages,
        status: "escalated",
      })
      .eq("id", conversation.id);

    console.error("Inbound processing error:", error);

    return NextResponse.json(
      {
        error: "AI verwerking mislukt - bericht opgeslagen, geescaleerd naar mens",
        saved: true,
      },
      { status: 500 },
    );
  }
}
