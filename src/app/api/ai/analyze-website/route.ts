import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Parse body
  let url: string;
  let lang = "en";
  try {
    const body = await request.json();
    url = body.url;
    lang = body.language || "en";
  } catch {
    return NextResponse.json({ error: "Ongeldige request body" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "URL is vereist" }, { status: 400 });
  }

  let fetchUrl = url.trim();
  if (!fetchUrl.startsWith("http")) {
    fetchUrl = `https://${fetchUrl}`;
  }

  // Step 1: Fetch website
  let websiteText: string;
  try {
    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Website gaf status ${response.status}` },
        { status: 400 },
      );
    }

    const html = await response.text();
    websiteText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    if (websiteText.length < 30) {
      return NextResponse.json(
        { error: "Niet genoeg tekst op de website gevonden." },
        { status: 400 },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekend";
    return NextResponse.json(
      { error: `Website ophalen mislukt: ${msg}` },
      { status: 400 },
    );
  }

  // Step 2: Call Anthropic API directly (avoid import chain issues)
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is niet geconfigureerd op de server." },
        { status: 500 },
      );
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        temperature: 0.2,
        system: `Extract company info from website text. Reply ONLY with valid JSON:
{"company_name":"","description":"","products":"","usps":["","",""],"pricing_info":"","client_cases":"","competitive_advantage":"","target_regions":"","tone_of_voice":"","extra_context":""}
Be specific with numbers/specs. Write in ${lang === "nl" ? "Dutch" : "English"}. Empty string if unknown.`,
        messages: [
          { role: "user", content: `URL: ${fetchUrl}\n\n${websiteText}` },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return NextResponse.json(
        { error: `Anthropic API fout (${anthropicRes.status}): ${errText.slice(0, 200)}` },
        { status: 500 },
      );
    }

    const aiData = await anthropicRes.json();
    const aiText = aiData.content?.[0]?.text || "";

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI gaf geen geldig profiel terug. Probeer opnieuw." },
        { status: 500 },
      );
    }

    const profile = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, profile });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekend";
    return NextResponse.json(
      { error: `AI analyse mislukt: ${msg}` },
      { status: 500 },
    );
  }
}
