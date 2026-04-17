import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/sender";
import { injectTracking } from "@/lib/email/tracking";
import { shouldSendWarmup } from "@/lib/email/warmup";
import {
  injectUnsubscribeUrl,
  wrapEmailInTemplate,
} from "@/lib/email/templates";
import { addSuppression, isSuppressed } from "@/lib/email/suppression";
import { verifyEmail } from "@/lib/email/verify";
import {
  buildListUnsubscribeHeaders,
  buildUnsubscribeToken,
  buildUnsubscribeUrl,
} from "@/lib/email/unsubscribe";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

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
    .select("id, org_id, email, first_name, last_name, status")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // ── Gate: suppression check (lead status + org-wide list) ──
  if (lead.status === "unsubscribed" || lead.status === "bounced") {
    return NextResponse.json(
      { error: `Lead is ${lead.status} — send blocked` },
      { status: 400 },
    );
  }
  const suppressed = await isSuppressed(supabase, lead.org_id, lead.email);
  if (suppressed) {
    return NextResponse.json(
      { error: `Email is on suppression list (${suppressed.reason})` },
      { status: 400 },
    );
  }

  // ── Gate: email verify (syntax + MX + disposable + role) ────
  const verifyResult = await verifyEmail(lead.email);
  if (!verifyResult.ok) {
    await addSuppression(supabase, {
      orgId: lead.org_id,
      email: lead.email,
      reason: "invalid",
      source: verifyResult.code,
    });
    return NextResponse.json(
      {
        error: `Email invalid: ${verifyResult.reason}`,
        code: verifyResult.code,
      },
      { status: 400 },
    );
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

  // ── Wrap in branded template ────────────────────────────
  let companyProfile = null;
  const { data: userData } = await supabase
    .from("users").select("org_id").eq("id", user.id).single();
  if (userData) {
    const { data: org } = await supabase
      .from("organizations").select("company_profile").eq("id", userData.org_id).single();
    companyProfile = org?.company_profile || null;
  }

  const wrappedHtml = wrapEmailInTemplate({
    bodyHtml: body_html,
    companyProfile,
    stepNumber: step_id ? 2 : 1, // If part of a sequence step, use branded
  });

  // ── Build unsubscribe token + inject URL into body ──────
  const unsubToken = buildUnsubscribeToken({
    email: lead.email,
    orgId: lead.org_id,
    leadId: lead.id,
  });
  const appUrl = getAppUrl();
  const unsubUrl = buildUnsubscribeUrl(appUrl, unsubToken);
  const { htmlBody: htmlWithUnsub, textBody: textWithUnsub } =
    injectUnsubscribeUrl(wrappedHtml, body_text || "", unsubUrl);

  // ── Inject tracking into HTML body ──────────────────────
  const trackedHtml = injectTracking(htmlWithUnsub, emailRecord.id);

  // ── Send via Resend ─────────────────────────────────────
  const fromAddress = account.display_name
    ? `${account.display_name} <${account.email}>`
    : account.email;

  const mailtoDomain = account.email.split("@")[1];
  const listUnsubHeaders = buildListUnsubscribeHeaders({
    appUrl,
    token: unsubToken,
    mailtoDomain,
  });

  const result = await sendEmail({
    to: lead.email,
    subject,
    htmlBody: trackedHtml,
    textBody: textWithUnsub,
    fromEmail: fromAddress,
    headers: listUnsubHeaders,
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
        provider_message_id: result.messageId,
        unsubscribe_token: unsubToken,
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
