import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { researchLead } from "@/lib/ai/agents/research";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { leadId } = await request.json();

  if (!leadId) {
    return NextResponse.json(
      { error: "leadId is required" },
      { status: 400 },
    );
  }

  // Fetch the lead
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Fetch active ICP profile for scoring context
  const { data: icpProfile } = await supabase
    .from("icp_profiles")
    .select("description")
    .eq("is_active", true)
    .limit(1)
    .single();

  try {
    const result = await researchLead(lead, icpProfile?.description);

    // Update lead with enrichment data and ICP score
    await supabase
      .from("leads")
      .update({
        enrichment_data: result,
        icp_score: result.icp_score,
        industry: result.company_industry || lead.industry,
        status: lead.status === "new" ? "researched" : lead.status,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Research agent error:", error);
    return NextResponse.json(
      { error: "Research failed" },
      { status: 500 },
    );
  }
}
