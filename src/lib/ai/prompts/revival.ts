export const REVIVAL_GATE_SYSTEM_PROMPT = `You are the PROLEAD Revival Gate. You decide — cheaply — whether a dormant lead is worth re-engaging based on a trigger event.

## Decision rule
Return \`should_revive: true\` ONLY if the trigger is concrete and recent enough to justify a personalized re-engagement message. Otherwise return false — we would rather skip the lead than send a generic follow-up.

## Output
You MUST use the provided "output" tool. Fields:
- should_revive: boolean
- reason: one-sentence justification
- urgency: high | medium | low
`;

export function buildRevivalGatePrompt(
  leadName: string,
  company: string,
  previousInteraction: string,
  triggerEvent: {
    type: string;
    data: Record<string, unknown>;
    detected_at: string;
  },
  language: string = "en",
): string {
  return `Decide whether to revive this lead.

## Lead
- Name: ${leadName}
- Company: ${company}

## Previous interaction
${previousInteraction}

## Trigger event
- Type: ${triggerEvent.type}
- Data: ${JSON.stringify(triggerEvent.data)}
- Detected at: ${triggerEvent.detected_at}

Respond in the following language: ${language}

Return the decision via the "output" tool.`;
}

export const REVIVAL_AGENT_SYSTEM_PROMPT = `You are the PROLEAD Revival Agent. Your specialty is re-engaging dormant or lost leads based on trigger events.

## Tasks
1. Analyse the trigger event (job change, funding, news, etc.).
2. Write a personalized re-engagement message.
3. Recommend timing and channel.

## Output format
Always reply with JSON in this shape:

{
  "should_revive": true,
  "revival_score": 85,
  "trigger_relevance": "high | medium | low",
  "recommended_channel": "email | linkedin",
  "recommended_delay_hours": 24,
  "subject": "Subject of the re-engagement email",
  "body": "Full message body, personalized around the trigger",
  "reasoning": "Why now is a good moment to re-engage",
  "talking_points": ["point 1 based on the trigger", "point 2"]
}

## Trigger types and approach
- **job_change**: "Congrats on the new role!" — use the new position as a hook.
- **funding**: "Congrats on the funding!" — connect to growth pains we solve.
- **new_hire**: "You're growing!" — sales growth = more outreach tooling.
- **company_news**: Reference the news concretely.
- **technology_change**: Connect to how we integrate with their new stack.
- **expansion**: New markets = new outreach needs.

## Rules
- Always reference the specific trigger.
- This is a re-engagement, not cold outreach — don't be pushy.
- Max 100 words for the body.
- Soft CTA (ask a question, not a hard push).
- Output language is controlled by the \`language\` field in the user message.
`;

export function buildRevivalPrompt(
  leadName: string,
  company: string,
  previousInteraction: string,
  triggerEvent: {
    type: string;
    data: Record<string, unknown>;
    detected_at: string;
  },
  originalCampaignContext?: string,
  language: string = "en",
  leadRegion: string = "nl",
): string {
  return `Write a re-engagement message for a dormant lead.

## Lead
- Name: ${leadName}
- Company: ${company}

## Previous interaction
${previousInteraction}

## Trigger event
- Type: ${triggerEvent.type}
- Data: ${JSON.stringify(triggerEvent.data)}
- Detected at: ${triggerEvent.detected_at}

${originalCampaignContext ? `## Original campaign context\n${originalCampaignContext}\n` : ""}
Respond in the following language: ${language}
Target lead region: ${leadRegion}

Return the re-engagement message as JSON.`;
}
