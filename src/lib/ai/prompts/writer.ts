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

  prompt += `\n\nGenereer de email in JSON format.`;

  return prompt;
}
