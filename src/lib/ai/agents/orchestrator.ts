/**
 * PROLEAD AI Orchestrator
 *
 * Coördineert de 6 AI agents:
 * 1. Research Agent (Sonnet) — Lead enrichment
 * 2. Writer Agent (Sonnet) — Email generatie
 * 3. Responder Agent (Sonnet) — Auto-reply
 * 4. Intent Agent (Haiku) — Snelle intent classificatie
 * 5. Scheduler Agent (Haiku) — Meeting planning
 * 6. Revival Agent (Sonnet) — Dead lead re-engagement
 */

import { researchLead, type ResearchResult } from "./research";
import { generateEmail, generateEmailVariants } from "./writer";
import { generateAutoResponse } from "./responder";
import { detectIntent, type IntentResult } from "./intent";
import { scheduleMeeting, type SchedulerResult } from "./scheduler";
import { generateRevivalEmail, type RevivalResult } from "./revival";

/**
 * Volledige outreach pipeline voor een nieuwe lead:
 * 1. Research → Enrichment data ophalen
 * 2. Writer → Gepersonaliseerde email genereren
 */
export async function processNewLead(
  lead: {
    first_name: string;
    last_name: string;
    company: string;
    email: string;
    title?: string | null;
    linkedin_url?: string | null;
    website?: string | null;
    industry?: string | null;
  },
  icpDescription?: string,
  voiceProfile?: {
    tone_description: string;
    style_guidelines?: string | null;
    sample_emails: string[];
  },
  campaignContext?: string,
): Promise<{
  research: ResearchResult;
  email: { subject: string; body: string; body_html: string };
}> {
  // Stap 1: Research
  const research = await researchLead(lead, icpDescription);

  // Stap 2: Genereer email op basis van research
  const email = await generateEmail({
    lead: {
      first_name: lead.first_name,
      last_name: lead.last_name,
      company: lead.company,
      title: lead.title,
      enrichment_data: research as unknown as Record<string, unknown>,
    },
    voiceProfile,
    campaignContext,
    stepNumber: 1,
  });

  return { research, email };
}

/**
 * Verwerk een inkomend bericht:
 * 1. Intent Agent → Classificeer intent (snel, Haiku)
 * 2. Op basis van intent:
 *    - meeting → Scheduler Agent
 *    - question/objection → Responder Agent
 *    - unsubscribe → Markeer lead, geen reply
 *    - not_interested → Gentle close
 */
export async function processInboundMessage(
  message: string,
  context: {
    leadName: string;
    firstName: string;
    company: string;
    conversationHistory?: Array<{ role: string; content: string }>;
    campaignContext?: string;
  },
): Promise<{
  intent: IntentResult;
  response?: string;
  meetingProposal?: SchedulerResult;
  action: "respond" | "schedule" | "escalate" | "close" | "unsubscribe";
}> {
  // Stap 1: Snelle intent classificatie (Haiku — goedkoop & snel)
  const intent = await detectIntent(message);

  // Stap 2: Route naar juiste agent
  switch (intent.intent) {
    case "meeting": {
      const historyText = context.conversationHistory
        ?.map((m) => `${m.role}: ${m.content}`)
        .join("\n\n") || message;

      const meetingProposal = await scheduleMeeting(
        context.leadName,
        context.company,
        historyText,
      );

      return {
        intent,
        response: meetingProposal.meeting_message,
        meetingProposal,
        action: "schedule",
      };
    }

    case "question":
    case "objection":
    case "positive":
    case "neutral": {
      const autoResponse = await generateAutoResponse({
        incomingMessage: message,
        conversationHistory: context.conversationHistory || [],
        leadInfo: {
          first_name: context.firstName,
          company: context.company,
        },
        businessContext: context.campaignContext,
      });

      if (autoResponse.should_escalate) {
        return {
          intent,
          response: autoResponse.response_body,
          action: "escalate",
        };
      }

      return {
        intent,
        response: autoResponse.should_respond
          ? autoResponse.response_body
          : undefined,
        action: "respond",
      };
    }

    case "unsubscribe": {
      return { intent, action: "unsubscribe" };
    }

    case "not_interested": {
      const closeResponse = await generateAutoResponse({
        incomingMessage: message,
        conversationHistory: context.conversationHistory || [],
        leadInfo: {
          first_name: context.firstName,
          company: context.company,
        },
        businessContext: "De lead is niet geïnteresseerd. Sluit beleefd af.",
      });

      return {
        intent,
        response: closeResponse.should_respond
          ? closeResponse.response_body
          : undefined,
        action: "close",
      };
    }

    default: {
      return { intent, action: "escalate" };
    }
  }
}

/**
 * Dead Lead Revival pipeline
 */
export async function processDeadLeadRevival(
  leadName: string,
  company: string,
  previousInteraction: string,
  triggerEvent: {
    type: string;
    data: Record<string, unknown>;
    detected_at: string;
  },
  campaignContext?: string,
): Promise<RevivalResult> {
  return generateRevivalEmail(
    leadName,
    company,
    previousInteraction,
    triggerEvent,
    campaignContext,
  );
}

/**
 * A/B Test email generatie
 */
export async function generateABTestEmails(
  lead: {
    first_name: string;
    last_name: string;
    company: string;
    title?: string | null;
    enrichment_data?: Record<string, unknown> | null;
  },
  voiceProfile?: {
    tone_description: string;
    style_guidelines?: string | null;
    sample_emails: string[];
  },
  campaignContext?: string,
) {
  return generateEmailVariants({
    lead,
    voiceProfile,
    campaignContext,
    stepNumber: 1,
  });
}

export {
  researchLead,
  generateEmail,
  generateEmailVariants,
  generateAutoResponse,
  detectIntent,
  scheduleMeeting,
  generateRevivalEmail,
};
