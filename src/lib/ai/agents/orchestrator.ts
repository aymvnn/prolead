/**
 * PROLEAD AI Orchestrator
 *
 * Coordinates the 6 AI agents:
 * 1. Research Agent (Sonnet) — Lead enrichment
 * 2. Writer Agent (Sonnet) — Email generation
 * 3. Responder Agent (Sonnet) — Auto-reply
 * 4. Intent Agent (Haiku) — Fast intent classification
 * 5. Scheduler Agent (Haiku) — Meeting planning
 * 6. Revival Agent (Haiku gate + Sonnet) — Dead lead re-engagement
 */

import { researchLead, type ResearchResult } from "./research";
import { generateEmail, generateEmailVariants } from "./writer";
import { generateAutoResponse } from "./responder";
import { detectIntent, type IntentResult } from "./intent";
import { scheduleMeeting, type SchedulerResult } from "./scheduler";
import {
  generateRevivalEmail,
  shouldReviveLead,
  type RevivalResult,
} from "./revival";

export interface OrchestratorOptions {
  language?: string;
  senderTimezone?: string;
  leadRegion?: string;
}

/**
 * Full outreach pipeline for a new lead:
 * 1. Research → Enrichment
 * 2. Writer → Personalized email
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
  options: OrchestratorOptions = {},
): Promise<{
  research: ResearchResult;
  email: { subject: string; body: string; body_html: string };
}> {
  const language = options.language || "en";
  const leadRegion = options.leadRegion || "nl";

  // Step 1: Research
  const research = await researchLead(lead, icpDescription, language);

  // Step 2: Generate email based on research
  const email = await generateEmail({
    lead: {
      first_name: lead.first_name,
      last_name: lead.last_name,
      company: lead.company,
      title: lead.title,
      website: lead.website,
      enrichment_data: research as unknown as Record<string, unknown>,
    },
    voiceProfile,
    campaignContext,
    stepNumber: 1,
    language,
    leadRegion,
  });

  return { research, email };
}

/**
 * Process an inbound message:
 * 1. Intent Agent → Classify (fast, Haiku)
 * 2. Route to the right follow-up agent
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
  options: OrchestratorOptions = {},
): Promise<{
  intent: IntentResult;
  response?: string;
  meetingProposal?: SchedulerResult;
  action: "respond" | "schedule" | "escalate" | "close" | "unsubscribe";
}> {
  const language = options.language || "en";
  const senderTimezone = options.senderTimezone || "Europe/Amsterdam";
  const leadRegion = options.leadRegion || "nl";

  // Step 1: Fast intent classification (Haiku)
  const intent = await detectIntent(message, language);

  // Step 2: Route
  switch (intent.intent) {
    case "meeting": {
      const historyText =
        context.conversationHistory
          ?.map((m) => `${m.role}: ${m.content}`)
          .join("\n\n") || message;

      const meetingProposal = await scheduleMeeting(
        context.leadName,
        context.company,
        historyText,
        undefined,
        { senderTimezone, leadRegion, language },
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
        language,
        leadRegion,
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
        businessContext:
          "The lead is not interested. Close the conversation politely.",
        language,
        leadRegion,
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
 * Dead lead revival pipeline (two-pass: Haiku gate → Sonnet writer).
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
  options: OrchestratorOptions = {},
): Promise<RevivalResult> {
  const language = options.language || "en";
  const leadRegion = options.leadRegion || "nl";

  return generateRevivalEmail(
    leadName,
    company,
    previousInteraction,
    triggerEvent,
    campaignContext,
    language,
    leadRegion,
  );
}

/**
 * A/B test email generation
 */
export async function generateABTestEmails(
  lead: {
    first_name: string;
    last_name: string;
    company: string;
    title?: string | null;
    website?: string | null;
    enrichment_data?: Record<string, unknown> | null;
  },
  voiceProfile?: {
    tone_description: string;
    style_guidelines?: string | null;
    sample_emails: string[];
  },
  campaignContext?: string,
  options: OrchestratorOptions = {},
) {
  const language = options.language || "en";
  const leadRegion = options.leadRegion || "nl";

  return generateEmailVariants({
    lead,
    voiceProfile,
    campaignContext,
    stepNumber: 1,
    language,
    leadRegion,
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
  shouldReviveLead,
};
