import { generateStructured } from "../claude";
import {
  RESEARCH_AGENT_SYSTEM_PROMPT,
  buildResearchPrompt,
} from "../prompts/research";
import {
  ResearchSchema,
  researchFallback,
  type ResearchResult,
} from "../schemas/research";

export type { ResearchResult };

export async function researchLead(
  lead: {
    first_name: string;
    last_name: string;
    company: string;
    title?: string | null;
    linkedin_url?: string | null;
    website?: string | null;
    industry?: string | null;
    employee_count?: number | null;
  },
  icpDescription?: string,
  language: string = "en",
): Promise<ResearchResult> {
  const userMessage = buildResearchPrompt(lead, icpDescription, language);

  return generateStructured<ResearchResult>({
    system: RESEARCH_AGENT_SYSTEM_PROMPT,
    userMessage,
    model: "claude-sonnet-4-6",
    maxTokens: 2048,
    temperature: 0.3,
    schema: ResearchSchema,
    schemaName: "Research",
    fallback: researchFallback,
  });
}
