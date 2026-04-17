import type { CompanyProfile } from "@/types/database";

export const WRITER_AGENT_SYSTEM_PROMPT = `Je bent de PROLEAD Writer Agent. Je schrijft gepersonaliseerde cold outreach emails.

## Je rol
Je schrijft unieke, gepersonaliseerde emails die authentiek klinken - geen templates, geen spintax. Elke email is speciaal geschreven voor de specifieke ontvanger.

## Principes
1. **Personalisatie**: Refereer aan specifieke informatie over de lead en hun bedrijf
2. **Waarde eerst**: Leid met waarde, niet met je product/dienst
3. **Kort en krachtig**: Max 150 woorden voor de body
4. **Geen generieks**: Vermijd "Ik hoop dat het goed met je gaat" of "Ik zag je profiel"
5. **Duidelijke CTA**: Eindig met een specifieke, makkelijke call-to-action
6. **Tone matching**: Schrijf in de stijl/stem die is aangegeven
7. **Bedrijfskennis**: Gebruik de USPs, klantcases en concurrentievoordelen van het bedrijfsprofiel

## Output format
Antwoord ALTIJD in dit JSON format:

{
  "subject": "Email onderwerp",
  "body": "Email body in plain text",
  "body_html": "Email body in HTML (eenvoudige opmaak)"
}

## Regels
- Geen bullshit, geen vage beloftes
- Wees direct en respecteer de tijd van de ontvanger
- Gebruik een menselijke, conversationele toon
- Refereer aan specifieke triggers of informatie
- Maak de CTA zo laagdrempelig mogelijk
- Gebruik concrete cijfers uit het bedrijfsprofiel (bijv. kostenbesparing, capaciteit)
- Noem relevante klantcases als social proof

## BELANGRIJK — Verifieerbare feiten
De ontvanger ziet alleen VERIFIEERBARE data: zijn naam, zijn bedrijf, zijn functietitel, het publieke domein.
Het veld "Research data" / enrichment_data is mogelijk door een LLM geproduceerd zonder webtoegang en kan dus speculatief zijn.

- Gebruik GEEN verzonnen pain_points, industry-analyses of "recente triggers" uit enrichment_data als stelling over de lead.
- Als je enrichment_data wilt gebruiken, formuleer dan als vraag of hypothese ("Ik neem aan dat..., klopt dat?") — nooit als feit.
- Liever algemene, door de lead zelf verifieerbare hooks (zijn rol, hun product, hun markt) dan gegokte specifieke details.
- Bij twijfel: laat het detail weg. Een kortere, eerlijke email presteert beter dan een langere met onjuistheden.
`;

export function buildWriteEmailPrompt(params: {
  lead: {
    first_name: string;
    last_name: string;
    company: string;
    title?: string | null;
    enrichment_data?: Record<string, unknown> | null;
  };
  voiceProfile?: {
    tone_description: string;
    style_guidelines?: string | null;
    sample_emails: string[];
  };
  companyProfile?: CompanyProfile | null;
  emailLanguage?: string;
  campaignContext?: string;
  stepNumber?: number;
  previousEmails?: string[];
}): string {
  let prompt = `Schrijf een gepersonaliseerde outreach email.

**Lead:**
- Naam: ${params.lead.first_name} ${params.lead.last_name}
- Bedrijf: ${params.lead.company}`;

  if (params.lead.title) prompt += `\n- Functie: ${params.lead.title}`;

  if (params.lead.enrichment_data) {
    prompt += `\n\n**Research data:**\n${JSON.stringify(params.lead.enrichment_data, null, 2)}`;
  }

  // Company profile — the core context for all emails
  if (params.companyProfile) {
    const cp = params.companyProfile;
    prompt += `\n\n**=== ONS BEDRIJF (gebruik dit in de email) ===**`;
    if (cp.company_name) prompt += `\n- Bedrijf: ${cp.company_name}`;
    if (cp.website) prompt += `\n- Website: ${cp.website}`;
    if (cp.description) prompt += `\n- Wat we doen: ${cp.description}`;
    if (cp.products) prompt += `\n- Product/dienst: ${cp.products}`;
    if (cp.usps && cp.usps.length > 0)
      prompt += `\n- USPs:\n${cp.usps.map((u) => `  • ${u}`).join("\n")}`;
    if (cp.pricing_info) prompt += `\n- Prijsindicatie: ${cp.pricing_info}`;
    if (cp.client_cases) prompt += `\n- Klantcases/referenties: ${cp.client_cases}`;
    if (cp.competitive_advantage)
      prompt += `\n- Concurrentievoordeel: ${cp.competitive_advantage}`;
    if (cp.target_regions) prompt += `\n- Doelmarkt: ${cp.target_regions}`;
    if (cp.tone_of_voice) prompt += `\n- Communicatiestijl: ${cp.tone_of_voice}`;
    if (cp.extra_context) prompt += `\n- Extra context: ${cp.extra_context}`;
  }

  if (params.voiceProfile) {
    prompt += `\n\n**Schrijfstijl:**\n- Toon: ${params.voiceProfile.tone_description}`;
    if (params.voiceProfile.style_guidelines) {
      prompt += `\n- Richtlijnen: ${params.voiceProfile.style_guidelines}`;
    }
    if (params.voiceProfile.sample_emails.length > 0) {
      prompt += `\n- Voorbeeld emails (schrijf in dezelfde stijl):\n${params.voiceProfile.sample_emails.slice(0, 2).join("\n---\n")}`;
    }
  }

  if (params.campaignContext) {
    prompt += `\n\n**Campaign context:** ${params.campaignContext}`;
  }

  if (params.stepNumber && params.stepNumber > 1) {
    prompt += `\n\n**Dit is follow-up #${params.stepNumber - 1}.** Refereer kort aan de eerdere email(s) maar wees niet pushy.`;
  }

  if (params.previousEmails && params.previousEmails.length > 0) {
    prompt += `\n\n**Eerdere emails in deze thread:**\n${params.previousEmails.join("\n---\n")}`;
  }

  // Language instruction
  const langMap: Record<string, string> = {
    en: "English",
    nl: "Nederlands",
    ar: "Arabic",
    de: "Deutsch",
    fr: "Français",
  };
  const lang = langMap[params.emailLanguage || "en"] || "English";
  prompt += `\n\n**TAAL: Schrijf de email in het ${lang}.**`;

  prompt += `\n\nGenereer de email in JSON format.`;

  return prompt;
}
