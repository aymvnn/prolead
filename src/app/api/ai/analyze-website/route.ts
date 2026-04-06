import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/claude";

// Allow up to 60 seconds for this route (website fetch + AI)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "url is vereist" }, { status: 400 });
  }

  // Normalize URL
  let fetchUrl = url.trim();
  if (!fetchUrl.startsWith("http")) {
    fetchUrl = `https://${fetchUrl}`;
  }

  // Step 1: Fetch website
  let text: string;
  try {
    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Website gaf status ${response.status}. Controleer de URL.` },
        { status: 400 },
      );
    }

    const html = await response.text();

    // Extract text content
    text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    if (text.length < 30) {
      return NextResponse.json(
        { error: "Niet genoeg tekst op de website gevonden." },
        { status: 400 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("timeout") || msg.includes("abort")) {
      return NextResponse.json(
        { error: "Website reageerde niet binnen 8 seconden." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Kon de website niet bereiken. Controleer de URL." },
      { status: 400 },
    );
  }

  // Step 2: AI analysis with Haiku (fast)
  try {
    const aiResponse = await generateAIResponse({
      model: "claude-haiku-4-5-20251001",
      systemPrompt: `Extract structured company info from website text. Reply with ONLY valid JSON:
{
  "company_name": "",
  "description": "",
  "products": "",
  "usps": ["", "", ""],
  "pricing_info": "",
  "client_cases": "",
  "competitive_advantage": "",
  "target_regions": "",
  "tone_of_voice": "",
  "extra_context": ""
}
Use only info from the text. Be specific with numbers/specs. Write in Dutch. Empty string if unknown.`,
      userMessage: `URL: ${fetchUrl}\n\n${text}`,
      temperature: 0.2,
      maxTokens: 1500,
    });

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI kon geen profiel genereren. Probeer opnieuw." },
        { status: 500 },
      );
    }

    const profile = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, profile });
  } catch (err) {
    console.error("AI analysis error:", err);
    return NextResponse.json(
      { error: "AI analyse mislukt. Controleer of je Anthropic API key geldig is." },
      { status: 500 },
    );
  }
}
