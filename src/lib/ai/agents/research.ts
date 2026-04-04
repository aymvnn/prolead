import { generateAIResponse } from "../claude";
import {
  RESEARCH_AGENT_SYSTEM_PROMPT,
  buildResearchPrompt,
} from "../prompts/research";

export interface ResearchResult {
  company_summary: string;
  company_industry: string;
  company_size_estimate: string;
  company_pain_points: string[];
  person_role_analysis: string;
  decision_maker_level: string;
  potential_needs: string[];
  talking_points: string[];
  recommended_approach: string;
  icp_score: number;
  icp_score_reasoning: string;
}

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
): Promise<ResearchResult> {
  const prompt = buildResearchPrompt(lead, icpDescription);

  const response = await generateAIResponse({
    model: "claude-sonnet-4-6",
    systemPrompt: RESEARCH_AGENT_SYSTEM_PROMPT,
    userMessage: prompt,
    temperature: 0.3,
  });

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Research Agent returned invalid response format");
  }

  return JSON.parse(jsonMatch[0]) as ResearchResult;
}
