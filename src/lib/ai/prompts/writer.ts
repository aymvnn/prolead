import type { CompanyProfile } from "@/types/database";

export const WRITER_AGENT_SYSTEM_PROMPT = `You are the PROLEAD Writer Agent. You write personalized cold outreach emails.

## Your role
You write unique, personalized emails that sound authentic — no templates, no spintax. Every email is written specifically for the one recipient.

## Principles
1. **Personalization**: Reference specific information about the lead and their company.
2. **Value first**: Lead with value, not with your product/service.
3. **Short and sharp**: Max 150 words for the body.
4. **No generic openers**: Avoid "I hope you're doing well" or "I came across your profile".
5. **Clear CTA**: End with a specific, low-friction call to action.
6. **Tone matching**: Write in the voice/style indicated in the user message.
7. **Company knowledge**: Use the USPs, client cases, and competitive advantages from the company profile.

## Output format
Always reply with JSON in this shape:

{
  "subject": "Email subject",
  "body": "Email body in plain text",
  "body_html": "Email body in HTML (simple formatting)"
}

## Grounding rules (CRITICAL)
The user message splits input into two XML blocks:
- \`<verified_facts>\`: Only these fields may be used as stated facts about the lead.
- \`<speculative_research>\`: LLM-produced enrichment. Anything here may only be used as a hypothesis, phrased as a question ("I'm guessing X — is that right?"). Never state it as fact.

If \`<speculative_research>\` contradicts \`<verified_facts>\`, trust \`<verified_facts>\`.

When in doubt, drop the detail. A shorter, honest email outperforms a longer one with fabrications.

## Rules
- No bullshit, no vague promises.
- Be direct and respect the recipient's time.
- Human, conversational tone.
- Reference concrete numbers from the company profile when available (cost savings, capacity, etc.).
- Mention relevant client cases as social proof.
- Output language is controlled by the \`language\` field in the user message.
`;

export function buildWriteEmailPrompt(params: {
  lead: {
    first_name: string;
    last_name: string;
    company: string;
    title?: string | null;
    website?: string | null;
    enrichment_data?: Record<string, unknown> | null;
  };
  voiceProfile?: {
    tone_description: string;
    style_guidelines?: string | null;
    sample_emails: string[];
  };
  companyProfile?: CompanyProfile | null;
  language?: string;
  emailLanguage?: string;
  leadRegion?: string;
  campaignContext?: string;
  stepNumber?: number;
  previousEmails?: string[];
}): string {
  const language = params.language || params.emailLanguage || "en";
  const leadRegion = params.leadRegion || "nl";

  const verifiedFacts: string[] = [
    `- Name: ${params.lead.first_name} ${params.lead.last_name}`,
    `- Company: ${params.lead.company}`,
  ];
  if (params.lead.title) verifiedFacts.push(`- Title: ${params.lead.title}`);
  if (params.lead.website) verifiedFacts.push(`- Domain: ${params.lead.website}`);

  let prompt = `Write a personalized outreach email.

<verified_facts>
${verifiedFacts.join("\n")}
</verified_facts>

<speculative_research>
${params.lead.enrichment_data ? JSON.stringify(params.lead.enrichment_data, null, 2) : "null"}
</speculative_research>`;

  // Company profile — the core context for all emails
  if (params.companyProfile) {
    const cp = params.companyProfile;
    prompt += `\n\n<company_profile>`;
    if (cp.company_name) prompt += `\n- Company: ${cp.company_name}`;
    if (cp.website) prompt += `\n- Website: ${cp.website}`;
    if (cp.description) prompt += `\n- What we do: ${cp.description}`;
    if (cp.products) prompt += `\n- Product/service: ${cp.products}`;
    if (cp.usps && cp.usps.length > 0)
      prompt += `\n- USPs:\n${cp.usps.map((u) => `  - ${u}`).join("\n")}`;
    if (cp.pricing_info) prompt += `\n- Pricing: ${cp.pricing_info}`;
    if (cp.client_cases) prompt += `\n- Client cases / references: ${cp.client_cases}`;
    if (cp.competitive_advantage)
      prompt += `\n- Competitive advantage: ${cp.competitive_advantage}`;
    if (cp.target_regions) prompt += `\n- Target market: ${cp.target_regions}`;
    if (cp.tone_of_voice) prompt += `\n- Communication style: ${cp.tone_of_voice}`;
    if (cp.extra_context) prompt += `\n- Extra context: ${cp.extra_context}`;
    prompt += `\n</company_profile>`;
  }

  if (params.voiceProfile) {
    prompt += `\n\n<voice_profile>`;
    prompt += `\n- Tone: ${params.voiceProfile.tone_description}`;
    if (params.voiceProfile.style_guidelines) {
      prompt += `\n- Guidelines: ${params.voiceProfile.style_guidelines}`;
    }
    if (params.voiceProfile.sample_emails.length > 0) {
      prompt += `\n- Sample emails (match this style):\n${params.voiceProfile.sample_emails.slice(0, 2).join("\n---\n")}`;
    }
    prompt += `\n</voice_profile>`;
  }

  if (params.campaignContext) {
    prompt += `\n\n<campaign_context>\n${params.campaignContext}\n</campaign_context>`;
  }

  if (params.stepNumber && params.stepNumber > 1) {
    prompt += `\n\n<follow_up>\nThis is follow-up #${params.stepNumber - 1}. Reference the earlier email(s) briefly but do not be pushy.\n</follow_up>`;
  }

  if (params.previousEmails && params.previousEmails.length > 0) {
    prompt += `\n\n<previous_emails>\n${params.previousEmails.join("\n---\n")}\n</previous_emails>`;
  }

  prompt += `\n\nRespond in the following language: ${language}`;
  prompt += `\nTarget lead region: ${leadRegion}`;
  prompt += `\n\nReturn the email as JSON.`;

  return prompt;
}
