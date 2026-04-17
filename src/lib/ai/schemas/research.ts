import { z } from "zod";

export const ResearchSchema = z.object({
  company_summary: z.string(),
  company_industry: z.string(),
  company_size_estimate: z.string(),
  company_pain_points: z.array(z.string()),
  person_role_analysis: z.string(),
  decision_maker_level: z.string(),
  potential_needs: z.array(z.string()),
  talking_points: z.array(z.string()),
  recommended_approach: z.string(),
  icp_score: z.number().min(0).max(100),
  icp_score_reasoning: z.string(),
});

export type ResearchResult = z.infer<typeof ResearchSchema>;

export const researchFallback: ResearchResult = {
  company_summary: "",
  company_industry: "",
  company_size_estimate: "",
  company_pain_points: [],
  person_role_analysis: "",
  decision_maker_level: "",
  potential_needs: [],
  talking_points: [],
  recommended_approach: "",
  icp_score: 0,
  icp_score_reasoning: "Research failed — fallback returned",
};
