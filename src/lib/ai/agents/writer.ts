import { generateAIResponse } from "../claude";
import {
  WRITER_AGENT_SYSTEM_PROMPT,
  buildWriteEmailPrompt,
} from "../prompts/writer";

interface GeneratedEmail {
  subject: string;
  body: string;
  body_html: string;
}

export async function generateEmail(params: {
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
}): Promise<GeneratedEmail> {
  const prompt = buildWriteEmailPrompt(params);

  const response = await generateAIResponse({
    model: "claude-sonnet-4-6",
    systemPrompt: WRITER_AGENT_SYSTEM_PROMPT,
    userMessage: prompt,
    temperature: 0.7,
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Writer Agent returned invalid response format");
  }

  return JSON.parse(jsonMatch[0]) as GeneratedEmail;
}

export async function generateEmailVariants(
  params: Parameters<typeof generateEmail>[0],
  count: number = 2,
): Promise<GeneratedEmail[]> {
  const variants: GeneratedEmail[] = [];

  for (let i = 0; i < count; i++) {
    const variant = await generateEmail(params);
    variants.push(variant);
  }

  return variants;
}
