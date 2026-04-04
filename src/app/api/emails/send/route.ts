import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sender";
import { injectTracking } from "@/lib/email/tracking";
import { shouldSendWarmup } from "@/lib/email/warmup";

// POST /api/emails/send — Send a single email to a lead
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    lead_id,
    subject,
    body_html,
    body_text,
    email_account_id,
    campaign_id,
    sequence_id,
    step_id,
  } = body as {
    lead_id: string;
    subject: string;
    body_html: string;
    body_text: string;
    email_account_id: string;
    campaign_id?: string;
    sequence_id?: string;
    step_id?: string;
  };

  if (!lead_id || !subject || !body_html || !email_account_id) {
    return NextResponse.json(
      { error: "lead_id, subject, body_html, and email_account_id are required" },
      { status: 400 },
    );
  }

  // ── Fetch email account ─────────────────────────────────
  const { data: account, error: accountError } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("id", email_account_id)
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { error: "Email account not found" },
      { status: 404 },
    );
  }

  if (!account.is_active) {
    return NextResponse.json(
      { error: "Email account is not active" },
      { status: 400 },
    );
  }

  // ── Check warmup / daily limit ──────────────────────────
  const warmup = shouldSendWarmup({
    warmup_status: account.warmup_status,
    daily_limit: account.daily_limit,
    created_at: account.created_at,
  });

  if (account.emails_sent_today >= warmup.effectiveLimit) {
    return NextResponse.json(
      {
        error: "Daily sending limit reached",
        sent_today: account.emails_sent_today,
        effective_limit: warmup.effectiveLimit,
      },
      { status: 429 },
    );
  }

  // ── Fetch lead ──────────────────────────────────────────
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("email, first_name, last_name")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // ── Create email record (status: queued) ────────────────
  const { data: emailRecord, error: insertError } = await supabase
    .from("emails")
    .insert({
      org_id: account.org_id,
      lead_id,
      campaign_id: campaign_id ?? null,
      sequence_id: sequence_id ?? null,
      step_id: step_id ?? null,
      email_account_id,
      from_email: account.email,
      to_email: lead.email,
      subject,
      body_html,
      body_text: body_text || "",
      status: "queued",
      direction: "outbound",
    })
    .select()
    .single();

  if (insertError || !emailRecord) {
    return NextResponse.json(
      { error: "Failed to create email record" },
      { status: 500 },
    );
  }

  // ── Inject tracking into HTML body ──────────────────────
  const trackedHtml = injectTracking(body_html, emailRecord.id);

  // ── Send via Resend ─────────────────────────────────────
  const fromAddress = account.display_name
    ? `${account.display_name} <${account.email}>`
    : account.email;

  const result = await sendEmail({
    to: lead.email,
    subject,
    htmlBody: trackedHtml,
    textBody: body_text || "",
    fromEmail: fromAddress,
  });

  if (!result.success) {
    // Mark as failed
    await supabase
      .from("emails")
      .update({ status: "failed" })
      .eq("id", emailRecord.id);

    return NextResponse.json(
      { error: result.error, email_id: emailRecord.id },
      { status: 500 },
    );
  }

  // ── Update email record and daily counter ───────────────
  await Promise.all([
    supabase
      .from("emails")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", emailRecord.id),
    supabase
      .from("email_accounts")
      .update({ emails_sent_today: account.emails_sent_today + 1 })
      .eq("id", email_account_id),
  ]);

  return NextResponse.json({
    success: true,
    email_id: emailRecord.id,
    message_id: result.messageId,
  });
}
