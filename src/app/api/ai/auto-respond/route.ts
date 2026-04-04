import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAutoResponse } from "@/lib/ai/agents/responder";
import { detectIntent } from "@/lib/ai/agents/intent";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, leadId, conversationId } = await request.json();

  if (!message || !leadId) {
    return NextResponse.json(
      { error: "message and leadId are required" },
      { status: 400 },
    );
  }

  // Fetch lead info
  const { data: lead } = await supabase
    .from("leads")
    .select("first_name, company")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch conversation history
  let conversationHistory: Array<{ role: string; content: string }> = [];
  if (conversationId) {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("messages")
      .eq("id", conversationId)
      .single();

    if (conversation?.messages) {
      conversationHistory = conversation.messages as Array<{
        role: string;
        content: string;
      }>;
    }
  }

  try {
    // Step 1: Quick intent detection (Haiku - fast & cheap)
    const intentResult = await detectIntent(message);

    // Step 2: Generate response if needed (Sonnet - high quality)
    const autoResponse = await generateAutoResponse({
      incomingMessage: message,
      conversationHistory,
      leadInfo: lead,
    });

    // Update conversation with new message and response
    if (conversationId) {
      const newMessages = [
        ...conversationHistory,
        { role: "lead", content: message, timestamp: new Date().toISOString() },
      ];

      if (autoResponse.should_respond) {
        newMessages.push({
          role: "assistant",
          content: autoResponse.response_body,
          timestamp: new Date().toISOString(),
        });
      }

      await supabase
        .from("conversations")
        .update({
          messages: newMessages,
          intent_classification: intentResult.intent,
          status: autoResponse.should_escalate ? "escalated" : "active",
          meeting_booked:
            intentResult.intent === "meeting" && intentResult.confidence > 0.8,
        })
        .eq("id", conversationId);
    }

    // Update lead status based on intent
    if (intentResult.intent === "meeting" && intentResult.confidence > 0.8) {
      await supabase
        .from("leads")
        .update({
          status: "meeting_booked",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else if (intentResult.intent === "unsubscribe") {
      await supabase
        .from("leads")
        .update({
          status: "unsubscribed",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    } else {
      await supabase
        .from("leads")
        .update({
          status: "replied",
          last_activity_at: new Date().toISOString(),
        })
        .eq("id", leadId);
    }

    return NextResponse.json({
      success: true,
      intent: intentResult,
      response: autoResponse,
    });
  } catch (error) {
    console.error("Auto-respond error:", error);
    return NextResponse.json(
      { error: "Auto-respond failed" },
      { status: 500 },
    );
  }
}
