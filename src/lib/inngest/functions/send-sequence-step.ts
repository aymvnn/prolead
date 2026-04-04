import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { generateEmail } from "@/lib/ai/agents/writer";
import { sendEmail } from "@/lib/email/sender";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const sendSequenceStep = inngest.createFunction(
  {
    id: "send-sequence-step",
    name: "Send Sequence Step",
    triggers: [{ event: "prolead/sequence.step.due" }],
  },
  async ({ event, step }: { event: { data: { campaignLeadId: string; sequenceId: string; stepNumber: number } }; step: any }) => {
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
    const lead = campaignLead.leads;
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
      // Find an active email account with capacity remaining
      const { data: accounts } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("org_id", campaign.org_id)
        .eq("is_active", true)
        .order("emails_sent_today", { ascending: true })
        .limit(1);

      const account = accounts?.[0];
      if (!account) {
        throw new Error("No active email account available");
      }

      // Check daily limit
      if (account.emails_sent_today >= account.daily_limit) {
        throw new Error(
          `Email account ${account.email} has reached daily limit (${account.daily_limit})`,
        );
      }

      const result = await sendEmail({
        to: lead.email,
        subject: generatedEmail.subject,
        htmlBody: generatedEmail.body_html,
        textBody: generatedEmail.body,
        fromEmail: account.email,
      });

      if (!result.success) {
        throw new Error(`Email send failed: ${result.error}`);
      }

      // Record the sent email
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
        body_html: generatedEmail.body_html,
        body_text: generatedEmail.body,
        status: "sent",
        direction: "outbound",
        sent_at: new Date().toISOString(),
      });

      // Increment the account's daily counter
      await supabase
        .from("email_accounts")
        .update({ emails_sent_today: account.emails_sent_today + 1 })
        .eq("id", account.id);

      return { messageId: result.messageId, accountId: account.id };
    });

    // ── Update campaign_lead progress ────────────────
    await step.run("update-campaign-lead", async () => {
      await supabase
        .from("campaign_leads")
        .update({
          current_step: stepNumber,
          status: "active",
        })
        .eq("id", campaignLeadId);

      // Update lead last_activity_at
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
          (nextStep.delay_days * 24 * 60 + nextStep.delay_hours * 60) * 60 * 1000;

        await inngest.send({
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
