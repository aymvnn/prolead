import { generateStructured } from "../claude";
import {
  WRITER_AGENT_SYSTEM_PROMPT,
  buildWriteEmailPrompt,
} from "../prompts/writer";
import {
  WriterSchema,
  writerFallback,
  type WriterResult,
} from "../schemas/writer";
import type { CompanyProfile } from "@/types/database";

export type GeneratedEmail = WriterResult;

export interface GenerateEmailParams {
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
  campaignContext?: string;
  stepNumber?: number;
  previousEmails?: string[];
  language?: string;
  emailLanguage?: string;
  leadRegion?: string;
}

export async function generateEmail(
  params: GenerateEmailParams,
): Promise<GeneratedEmail> {
  const userMessage = buildWriteEmailPrompt(params);

  return generateStructured<WriterResult>({
    system: WRITER_AGENT_SYSTEM_PROMPT,
    userMessage,
    model: "claude-sonnet-4-6",
    maxTokens: 2048,
    temperature: 0.7,
    schema: WriterSchema,
    schemaName: "Writer",
    fallback: writerFallback,
  });
}

export async function generateEmailVariants(
  params: GenerateEmailParams,
  count: number = 2,
): Promise<GeneratedEmail[]> {
  const variants: GeneratedEmail[] = [];

  for (let i = 0; i < count; i++) {
    const variant = await generateEmail(params);
    variants.push(variant);
  }

  return variants;
}
