import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { generateEmail } from "@/lib/ai/agents/writer";
import { sendEmail } from "@/lib/email/sender";
import {
  injectUnsubscribeUrl,
  wrapEmailInTemplate,
} from "@/lib/email/templates";
import { isSuppressed, addSuppression } from "@/lib/email/suppression";
import { verifyEmail } from "@/lib/email/verify";
import {
  buildListUnsubscribeHeaders,
  buildUnsubscribeToken,
  buildUnsubscribeUrl,
} from "@/lib/email/unsubscribe";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

interface CampaignSettings {
  daily_limit?: number;
  timezone?: string;
  send_window_start?: string; // "09:00"
  send_window_end?: string; // "17:00"
  skip_weekends?: boolean;
}

/**
 * Compute the next timestamp when we are allowed to send, given a send window
 * and timezone. Returns null if we're already inside the window.
 */
function nextAllowedSendAt(
  now: Date,
  settings: CampaignSettings,
): number | null {
  const tz = settings.timezone || "Europe/Amsterdam";
  const startStr = settings.send_window_start || "09:00";
  const endStr = settings.send_window_end || "17:00";
  const skipWeekends = settings.skip_weekends !== false; // default true

  // Get current time components in the target timezone.
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const weekday =
    parts.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "mon";
  const hour = parseInt(
    parts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value ?? "0",
    10,
  );

  const [startH, startM] = startStr.split(":").map((x) => parseInt(x, 10));
  const [endH, endM] = endStr.split(":").map((x) => parseInt(x, 10));

  const nowMin = hour * 60 + minute;
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  const isWeekend = weekday === "sat" || weekday === "sun";
  const inWindow =
    nowMin >= startMin && nowMin < endMin && !(skipWeekends && isWeekend);

  if (inWindow) return null;

  // Advance the wall-clock in ms until we land in a valid slot. We step in
  // whole minutes so this is cheap even across days.
  let cursor = now.getTime();
  const step = 60_000;
  // Safety cap: never reschedule more than 14 days out.
  const maxMs = 14 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < maxMs / step; i++) {
    cursor += step;
    const probe = new Date(cursor);
    const pParts = fmt.formatToParts(probe);
    const pWd =
      pParts.find((p) => p.type === "weekday")?.value.toLowerCase() ?? "mon";
    const pH = parseInt(
      pParts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const pM = parseInt(
      pParts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    );
    const pMin = pH * 60 + pM;
    const pIsWeekend = pWd === "sat" || pWd === "sun";
    if (pMin >= startMin && pMin < endMin && !(skipWeekends && pIsWeekend)) {
      return cursor;
    }
  }
  return cursor;
}

export const sendSequenceStep = inngest.createFunction(
  {
    id: "send-sequence-step",
    name: "Send Sequence Step",
    triggers: [{ event: "prolead/sequence.step.due" }],
  },
  async ({
    event,
    step,
  }: {
    event: {
      data: { campaignLeadId: string; sequenceId: string; stepNumber: number };
    };
    step: any;
  }) => {
    const { campaignLeadId, sequenceId, stepNumber } = event.data;
    const supabase = createServiceClient();

    // ── Load campaign_lead ────────────────────────────
    const campaignLead = await step.run("load-campaign-lead", async () => {
      const { data, error } = await supabase
        .from("campaign_leads")
        .select("*, leads(*)")
        .eq("id", campaignLeadId)
        .single();

      if (error || !data) {
        throw new Error(`Campaign lead not found: ${campaignLeadId}`);
      }
      return data;
    });

    // ── Load sequence step ────────────────────────────
    const sequenceStep = await step.run("load-sequence-step", async () => {
      const { data, error } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .eq("step_number", stepNumber)
        .single();

      if (error || !data) {
        throw new Error(
          `Sequence step not found: sequence=${sequenceId} step=${stepNumber}`,
        );
      }
      return data;
    });

    // ── Load campaign (for context and voice profile) ─
    const campaign = await step.run("load-campaign", async () => {
      const { data: seq } = await supabase
        .from("sequences")
        .select("campaign_id")
        .eq("id", sequenceId)
        .single();

      if (!seq) {
        throw new Error(`Sequence not found: ${sequenceId}`);
      }

      const { data, error } = await supabase
        .from("campaigns")
        .select("*, voice_profiles(*)")
        .eq("id", seq.campaign_id)
        .single();

      if (error || !data) {
        throw new Error(`Campaign not found for sequence: ${sequenceId}`);
      }
      return data;
    });

    const lead = campaignLead.leads;

    // ── Gate 1: send window + weekend skip ────────────
    // Honor campaign.settings.{send_window_start,end,skip_weekends,timezone}.
    const wait = nextAllowedSendAt(
      new Date(),
      (campaign.settings || {}) as CampaignSettings,
    );
    if (wait !== null) {
      await step.sleepUntil("wait-for-send-window", new Date(wait));
    }

    // ── Gate 2: suppression check ─────────────────────
    const suppressed = await step.run("check-suppression", async () => {
      if (lead.status === "unsubscribed" || lead.status === "bounced") {
        return { blocked: true, reason: lead.status } as const;
      }
      const s = await isSuppressed(supabase, campaign.org_id, lead.email);
      if (s) return { blocked: true, reason: s.reason } as const;
      return { blocked: false } as const;
    });

    if (suppressed.blocked) {
      // Stop sequence; mark campaign_lead accordingly.
      await supabase
        .from("campaign_leads")
        .update({ status: "unsubscribed" })
        .eq("id", campaignLeadId);
      await supabase.from("analytics_events").insert({
        org_id: campaign.org_id,
        event_type: "email_skipped_suppressed",
        entity_type: "lead",
        entity_id: lead.id,
        properties: { reason: suppressed.reason, step: stepNumber },
      });
      return { success: false, skipped: true, reason: suppressed.reason };
    }

    // ── Gate 3: email verify (first step only) ────────
    if (stepNumber === 1) {
      const verifyResult = await step.run("verify-email", async () => {
        return verifyEmail(lead.email);
      });
      if (!verifyResult.ok) {
        await addSuppression(supabase, {
          orgId: campaign.org_id,
          email: lead.email,
          reason: "invalid",
          source: verifyResult.code,
        });
        await supabase
          .from("leads")
          .update({ status: "bounced" })
          .eq("id", lead.id);
        await supabase
          .from("campaign_leads")
          .update({ status: "bounced" })
          .eq("id", campaignLeadId);
        await supabase.from("analytics_events").insert({
          org_id: campaign.org_id,
          event_type: "email_invalid_presend",
          entity_type: "lead",
          entity_id: lead.id,
          properties: {
            code: verifyResult.code,
            reason: verifyResult.reason,
          },
        });
        return { success: false, skipped: true, reason: verifyResult.code };
      }
    }

    // ── Load previous emails for thread context ──────
    const previousEmails = await step.run("load-previous-emails", async () => {
      const { data } = await supabase
        .from("emails")
        .select("body_text")
        .eq("lead_id", campaignLead.lead_id)
        .eq("campaign_id", campaign.id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: true });

      return (data || []).map((e: { body_text: string }) => e.body_text);
    });

    // ── Generate email with Writer Agent ─────────────
    const generatedEmail = await step.run("generate-email", async () => {
      const voiceProfile = campaign.voice_profiles;

      return generateEmail({
        lead: {
          first_name: lead.first_name,
          last_name: lead.last_name,
          company: lead.company,
          title: lead.title,
          enrichment_data: lead.enrichment_data,
        },
        voiceProfile: voiceProfile
          ? {
              tone_description: voiceProfile.tone_description,
              style_guidelines: voiceProfile.style_guidelines,
              sample_emails: voiceProfile.sample_emails,
            }
          : undefined,
        campaignContext: campaign.name,
        stepNumber,
        previousEmails,
      });
    });

    // ── Pick an email account and send ───────────────
    const sendResult = await step.run("send-email", async () => {
      // Find an active email account with capacity remaining for this org.
      const { data: accounts } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("org_id", campaign.org_id)
        .eq("is_active", true)
        .order("emails_sent_today", { ascending: true });

      const accountWithCapacity = (accounts || []).find(
        (a: { emails_sent_today: number; daily_limit: number }) =>
          a.emails_sent_today < a.daily_limit,
      );

      if (!accountWithCapacity) {
        // No capacity today — reschedule for tomorrow 07:00 in the campaign tz.
        const tz =
          ((campaign.settings || {}) as CampaignSettings).timezone ||
          "Europe/Amsterdam";
        const tomorrow = new Date();
        tomorrow.setUTCHours(tomorrow.getUTCHours() + 24);
        // Ask Inngest to retry via a fresh event tomorrow morning.
        // The `id` key makes this event idempotent: if we hit the daily-limit
        // path multiple times in the same day (e.g. retries, restarts) we
        // still only schedule ONE reschedule event per (lead, step, day).
        const dateKey = new Date().toISOString().slice(0, 10);
        await inngest.send({
          id: `step-reschedule-${campaignLeadId}-${stepNumber}-${dateKey}`,
          name: "prolead/sequence.step.due",
          data: { campaignLeadId, sequenceId, stepNumber },
          ts: Date.now() + 14 * 60 * 60 * 1000, // ~14h from now
        });
        return {
          sent: false,
          reason: "daily_limit_reached",
          rescheduledFor: tomorrow.toISOString(),
          timezone: tz,
        } as const;
      }

      const account = accountWithCapacity;

      // Fetch company_profile for template wrapping + org-wide branding.
      const { data: org } = await supabase
        .from("organizations")
        .select("company_profile")
        .eq("id", campaign.org_id)
        .single();
      const companyProfile = (org?.company_profile || null) as
        | Record<string, unknown>
        | null;

      // Build per-recipient unsubscribe token + URL.
      const unsubToken = buildUnsubscribeToken({
        email: lead.email,
        orgId: campaign.org_id,
        leadId: lead.id,
      });
      const appUrl = getAppUrl();
      const unsubUrl = buildUnsubscribeUrl(appUrl, unsubToken);

      // Wrap in template (inserts the {{UNSUBSCRIBE_URL}} placeholder).
      const wrappedHtml = wrapEmailInTemplate({
        bodyHtml: generatedEmail.body_html,
        companyProfile: companyProfile as never,
        stepNumber,
      });

      // Replace placeholder with real URL in HTML and append to plain-text.
      const { htmlBody: finalHtml, textBody: finalText } = injectUnsubscribeUrl(
        wrappedHtml,
        generatedEmail.body,
        unsubUrl,
      );

      // List-Unsubscribe headers (RFC 8058 + Gmail/Yahoo 2024 rules).
      const mailtoDomain = account.email.split("@")[1];
      const headers = buildListUnsubscribeHeaders({
        appUrl,
        token: unsubToken,
        mailtoDomain,
      });

      const result = await sendEmail({
        to: lead.email,
        subject: generatedEmail.subject,
        htmlBody: finalHtml,
        textBody: finalText,
        fromEmail: account.display_name
          ? `${account.display_name} <${account.email}>`
          : account.email,
        headers,
      });

      if (!result.success) {
        throw new Error(`Email send failed: ${result.error}`);
      }

      // Record the sent email.
      await supabase.from("emails").insert({
        org_id: campaign.org_id,
        lead_id: campaignLead.lead_id,
        campaign_id: campaign.id,
        sequence_id: sequenceId,
        step_id: sequenceStep.id,
        email_account_id: account.id,
        from_email: account.email,
        to_email: lead.email,
        subject: generatedEmail.subject,
        body_html: finalHtml,
        body_text: finalText,
        status: "sent",
        direction: "outbound",
        sent_at: new Date().toISOString(),
        provider_message_id: result.messageId,
        unsubscribe_token: unsubToken,
      });

      // Increment the account's daily counter atomically. Prior code did
      // read-modify-write here, which lost increments under concurrent
      // Inngest step fan-out and broke the daily-limit gate.
      await supabase.rpc("increment_account_sent", {
        p_account_id: account.id,
      });

      return {
        sent: true,
        messageId: result.messageId,
        accountId: account.id,
      } as const;
    });

    if (!sendResult.sent) {
      // Daily-limit reschedule path — do not advance the sequence.
      return {
        success: false,
        campaignLeadId,
        stepNumber,
        rescheduled: true,
        reason: sendResult.reason,
      };
    }

    // ── Update campaign_lead progress ────────────────
    await step.run("update-campaign-lead", async () => {
      await supabase
        .from("campaign_leads")
        .update({
          current_step: stepNumber,
          status: "active",
        })
        .eq("id", campaignLeadId);

      await supabase
        .from("leads")
        .update({
          last_activity_at: new Date().toISOString(),
          status: "contacted",
        })
        .eq("id", campaignLead.lead_id)
        .in("status", ["new", "researched"]);
    });

    // ── Schedule next step if available ───────────────
    await step.run("schedule-next-step", async () => {
      const nextStepNumber = stepNumber + 1;

      const { data: nextStep } = await supabase
        .from("sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .eq("step_number", nextStepNumber)
        .single();

      if (nextStep) {
        const delayMs =
          (nextStep.delay_days * 24 * 60 + nextStep.delay_hours * 60) *
          60 *
          1000;

        // Idempotency: `id` keyed on (lead, next-step, due-day) so a retried
        // run of this step can't enqueue two next-step events.
        const dueDate = new Date(Date.now() + delayMs)
          .toISOString()
          .slice(0, 10);
        await inngest.send({
          id: `step-due-${campaignLeadId}-${nextStepNumber}-${dueDate}`,
          name: "prolead/sequence.step.due",
          data: {
            campaignLeadId,
            sequenceId,
            stepNumber: nextStepNumber,
          },
          ts: Date.now() + delayMs,
        });
      }
    });

    return {
      success: true,
      campaignLeadId,
      stepNumber,
      messageId: sendResult.messageId,
    };
  },
);
