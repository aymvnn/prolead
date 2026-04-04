import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmail, generateEmailVariants } from "@/lib/ai/agents/writer";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId, campaignId, voiceProfileId, stepNumber, abTest } =
    await request.json();

  if (!leadId) {
    return NextResponse.json(
      { error: "leadId is required" },
      { status: 400 },
    );
  }

  // Fetch lead with enrichment data
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch voice profile if specified
  let voiceProfile;
  if (voiceProfileId) {
    const { data } = await supabase
      .from("voice_profiles")
      .select("*")
      .eq("id", voiceProfileId)
      .single();
    voiceProfile = data || undefined;
  }

  // Fetch campaign context if specified
  let campaignContext;
  if (campaignId) {
    const { data } = await supabase
      .from("campaigns")
      .select("name, settings")
      .eq("id", campaignId)
      .single();
    if (data) campaignContext = `Campaign: ${data.name}`;
  }

  // Fetch previous emails in thread
  let previousEmails: string[] = [];
  if (stepNumber && stepNumber > 1) {
    const { data: prevEmails } = await supabase
      .from("emails")
      .select("body_text")
      .eq("lead_id", leadId)
      .eq("direction", "outbound")
      .order("created_at", { ascending: true });

    if (prevEmails) {
      previousEmails = prevEmails.map((e) => e.body_text);
    }
  }

  try {
    const params = {
      lead: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        company: lead.company,
        title: lead.title,
        enrichment_data: lead.enrichment_data as Record<string, unknown> | null,
      },
      voiceProfile: voiceProfile
        ? {
            tone_description: voiceProfile.tone_description,
            style_guidelines: voiceProfile.style_guidelines,
            sample_emails: voiceProfile.sample_emails,
          }
        : undefined,
      campaignContext,
      stepNumber,
      previousEmails,
    };

    if (abTest) {
      const variants = await generateEmailVariants(params, 2);
      return NextResponse.json({ success: true, variants });
    }

    const email = await generateEmail(params);
    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Writer agent error:", error);
    return NextResponse.json(
      { error: "Email generation failed" },
      { status: 500 },
    );
  }
}
