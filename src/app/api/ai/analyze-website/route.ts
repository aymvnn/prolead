import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAIResponse } from "@/lib/ai/claude";

/**
 * POST /api/ai/analyze-website
 *
 * Fetches a website, extracts text, and uses AI to generate
 * a structured company profile from it.
 */
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

  try {
    // Fetch the website HTML
    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PROLEAD/1.0; +https://prolead.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Website kon niet geladen worden (status ${response.status})` },
        { status: 400 },
      );
    }

    const html = await response.text();

    // Strip HTML tags, scripts, styles to get plain text
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#?\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // Limit to ~8000 chars for AI context

    if (text.length < 50) {
      return NextResponse.json(
        { error: "Niet genoeg tekst gevonden op de website. Probeer een andere URL." },
        { status: 400 },
      );
    }

    // Use AI to extract company profile
    const aiResponse = await generateAIResponse({
      model: "claude-sonnet-4-6",
      systemPrompt: `Je bent een expert in het analyseren van bedrijfswebsites. Je extraheert gestructureerde bedrijfsinformatie uit website-tekst.

Antwoord ALTIJD in dit exacte JSON format, niets anders:

{
  "company_name": "Bedrijfsnaam",
  "description": "Wat het bedrijf doet in 2-3 zinnen",
  "products": "Gedetailleerde beschrijving van producten/diensten met specifieke kenmerken, specs, cijfers",
  "usps": ["USP 1", "USP 2", "USP 3", "USP 4"],
  "pricing_info": "Prijsinformatie als beschikbaar, anders lege string",
  "client_cases": "Genoemde klanten, referenties, cases als beschikbaar",
  "competitive_advantage": "Wat maakt dit bedrijf uniek t.o.v. concurrentie",
  "target_regions": "Regio's/markten die ze bedienen",
  "tone_of_voice": "Analyse van de communicatiestijl op de website (formeel/informeel, technisch/simpel, etc.)",
  "extra_context": "Overige relevante informatie (oprichting, locatie, team, certificeringen, etc.)"
}

Regels:
- Gebruik ALLEEN informatie die op de website staat
- Wees specifiek — noem concrete cijfers, namen, specs
- Als iets niet op de website staat, gebruik een lege string ""
- USPs: minimaal 3, maximaal 6
- Schrijf in het Nederlands`,
      userMessage: `Analyseer de volgende website-tekst en extraheer een bedrijfsprofiel:\n\nURL: ${fetchUrl}\n\nWebsite tekst:\n${text}`,
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI kon geen profiel genereren uit deze website." },
        { status: 500 },
      );
    }

    const profile = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende fout";

    if (message.includes("timeout") || message.includes("abort")) {
      return NextResponse.json(
        { error: "Website laadde te langzaam (timeout na 15 seconden)." },
        { status: 400 },
      );
    }

    console.error("Website analysis error:", error);
    return NextResponse.json(
      { error: `Analyse mislukt: ${message}` },
      { status: 500 },
    );
  }
}
