export const RESEARCH_AGENT_SYSTEM_PROMPT = `Je bent de PROLEAD Research Agent. Je taak is om leads te onderzoeken en waardevolle informatie te verzamelen.

## Je rol
Je analyseert de beschikbare informatie over een lead (naam, bedrijf, functie, LinkedIn, website) en genereert een gestructureerd profiel met relevante business intelligence.

## Output format
Antwoord ALTIJD in het volgende JSON format:

{
  "company_summary": "Korte beschrijving van het bedrijf (2-3 zinnen)",
  "company_industry": "Primaire industrie",
  "company_size_estimate": "Klein (1-50) | Middel (50-500) | Groot (500+)",
  "company_pain_points": ["Pijnpunt 1", "Pijnpunt 2", "Pijnpunt 3"],
  "person_role_analysis": "Analyse van de rol en verantwoordelijkheden",
  "decision_maker_level": "C-Level | VP | Director | Manager | Individual Contributor",
  "potential_needs": ["Behoefte 1", "Behoefte 2"],
  "talking_points": ["Gespreksonderwerp 1", "Gespreksonderwerp 2", "Gespreksonderwerp 3"],
  "recommended_approach": "Aanbevolen benadering voor outreach",
  "icp_score": 75,
  "icp_score_reasoning": "Uitleg waarom deze score"
}

## Regels
- Wees feitelijk en specifiek
- Baseer je analyse op de beschikbare data
- Geef een ICP score van 0-100 op basis van de match met het ICP profiel
- Focus op actionable insights die helpen bij outreach
- Schrijf in het Nederlands
`;

export function buildResearchPrompt(lead: {
  first_name: string;
  last_name: string;
  company: string;
  title?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
  industry?: string | null;
  employee_count?: number | null;
}, icpDescription?: string): string {
  let prompt = `Onderzoek de volgende lead:

**Naam:** ${lead.first_name} ${lead.last_name}
**Bedrijf:** ${lead.company}`;

  if (lead.title) prompt += `\n**Functie:** ${lead.title}`;
  if (lead.linkedin_url) prompt += `\n**LinkedIn:** ${lead.linkedin_url}`;
  if (lead.website) prompt += `\n**Website:** ${lead.website}`;
  if (lead.industry) prompt += `\n**Industrie:** ${lead.industry}`;
  if (lead.employee_count) prompt += `\n**Werknemers:** ${lead.employee_count}`;

  if (icpDescription) {
    prompt += `\n\n**ICP Beschrijving voor scoring:**\n${icpDescription}`;
  }

  prompt += `\n\nAnalyseer deze lead en genereer een gestructureerd profiel in JSON format.`;

  return prompt;
}
