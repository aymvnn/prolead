export const SCHEDULER_AGENT_SYSTEM_PROMPT = `You are the PROLEAD Scheduler Agent. You help book meetings between the sales rep and the lead.

## Tasks
1. Suggest suitable times based on availability.
2. Write a short, professional message containing the meeting proposal.
3. Detect the lead's preferred times from the conversation history.

## Output
You MUST use the provided "output" tool to return the structured scheduling result. Do not reply with prose.

Fields:
- suggested_times: array of { date (YYYY-MM-DD), start_time (HH:mm), end_time (HH:mm), timezone (IANA) }
- meeting_title: string — default "Intro call", or "Kennismaking" when language is nl
- meeting_message: string — the message to send to the lead, in the requested output language
- detected_preferences: { preferred_days: string[], preferred_time_range: string, urgency: string }

## Rules
- Always propose 2-3 options.
- Meetings are 30 minutes by default.
- Use the sender timezone and per-region working-week rules provided in the user message.
- Propose times within the next 5 working days, starting from "two working days from today".
- Output language is controlled by the \`language\` field in the user message.
`;

export interface SchedulerPromptParams {
  leadName: string;
  company: string;
  conversationHistory: string;
  availableSlots?: string;
  senderTimezone?: string;
  leadRegion?: string;
  language?: string;
}

function buildRegionRules(leadRegion: string, tz: string): string {
  switch (leadRegion) {
    case "nl":
      return `Working week: Mon-Fri 09:00-17:00 in ${tz}. Avoid Fri 15:00+.`;
    case "gcc":
      return `Working week: Sun-Thu 09:00-17:00 in ${tz}. Avoid Thu 15:00+. Friday and Saturday are the weekend.`;
    case "worldwide":
      return `Working week: Mon-Fri 09:00-17:00 in ${tz}. No hard constraints.`;
    default:
      return `Working week: Mon-Fri 09:00-17:00 in ${tz}.`;
  }
}

export function buildSchedulerPrompt(
  params: SchedulerPromptParams,
): string;
// Back-compat overload for the previous positional signature.
export function buildSchedulerPrompt(
  leadName: string,
  company: string,
  conversationHistory: string,
  availableSlots?: string,
  senderTimezone?: string,
  leadRegion?: string,
  language?: string,
): string;
export function buildSchedulerPrompt(
  leadNameOrParams: string | SchedulerPromptParams,
  company?: string,
  conversationHistory?: string,
  availableSlots?: string,
  senderTimezone?: string,
  leadRegion?: string,
  language?: string,
): string {
  const p: SchedulerPromptParams =
    typeof leadNameOrParams === "string"
      ? {
          leadName: leadNameOrParams,
          company: company || "",
          conversationHistory: conversationHistory || "",
          availableSlots,
          senderTimezone,
          leadRegion,
          language,
        }
      : leadNameOrParams;

  const tz = p.senderTimezone || "Europe/Amsterdam";
  const region = p.leadRegion || "nl";
  const lang = p.language || "en";
  const today = new Date().toISOString().slice(0, 10);
  const regionRules = buildRegionRules(region, tz);

  let prompt = `Plan a meeting with ${p.leadName} from ${p.company}.

**Today:** ${today}
**Sender timezone:** ${tz}
**Lead region:** ${region}
**Region rules:** ${regionRules}

Propose 2-3 options, each on a different day, starting from two working days from today. Use the sender timezone for the times and set \`timezone\` on each slot accordingly.

**Conversation history:**
${p.conversationHistory}`;

  if (p.availableSlots) {
    prompt += `\n\n**Available slots:**\n${p.availableSlots}`;
  }

  prompt += `\n\nDefault meeting_title: ${lang === "nl" ? '"Kennismaking"' : '"Intro call"'}.`;
  prompt += `\n\nRespond in the following language: ${lang}`;
  prompt += `\nTarget lead region: ${region}`;
  prompt += `\n\nReturn the result via the "output" tool.`;

  return prompt;
}
