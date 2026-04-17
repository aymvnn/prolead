import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { parseUnsubscribeToken } from "@/lib/email/unsubscribe";
import { addSuppression } from "@/lib/email/suppression";

/**
 * Public unsubscribe endpoint.
 *
 * - GET  -> human-visible "je bent uitgeschreven" HTML page (web-link).
 * - POST -> one-click RFC 8058 endpoint (Gmail/Yahoo headers).
 *
 * Both verify an HMAC-signed token containing {email, orgId, leadId},
 * mark the lead as unsubscribed and insert an email_suppressions row.
 */

function createService() {
  // We use the service role key here because this route is unauthenticated
  // (the recipient clicks from their inbox; they have no session).
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function processUnsubscribe(token: string) {
  const payload = parseUnsubscribeToken(token);
  if (!payload) return { ok: false, reason: "invalid_token" as const };

  const supabase = createService();

  // Mark the lead unsubscribed (only if it exists and belongs to this org).
  await supabase
    .from("leads")
    .update({ status: "unsubscribed" })
    .eq("id", payload.leadId)
    .eq("org_id", payload.orgId);

  // Also pause any active campaign_leads for this lead.
  await supabase
    .from("campaign_leads")
    .update({ status: "unsubscribed" })
    .eq("lead_id", payload.leadId)
    .in("status", ["pending", "active", "paused"]);

  // Add to suppression list (org-wide).
  await addSuppression(supabase, {
    orgId: payload.orgId,
    email: payload.email,
    reason: "unsubscribed",
    source: "one_click",
  });

  // Analytics event.
  await supabase.from("analytics_events").insert({
    org_id: payload.orgId,
    event_type: "lead_unsubscribed",
    entity_type: "lead",
    entity_id: payload.leadId,
    properties: { email: payload.email, source: "one_click" },
  });

  return { ok: true as const };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await processUnsubscribe(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  // RFC 8058: MUST return 2xx on success.
  return new NextResponse(null, { status: 200 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await processUnsubscribe(token);

  const ok = result.ok;
  const title = ok ? "Unsubscribed" : "Invalid link";
  const headingEn = ok ? "You've been unsubscribed" : "Invalid unsubscribe link";
  const headingNl = ok ? "Je bent uitgeschreven" : "Ongeldige uitschrijf-link";
  const messageEn = ok
    ? "We will no longer send emails to this address. Thank you for letting us know."
    : "This link is expired or invalid. Please contact us if you need help.";
  const messageNl = ok
    ? "We sturen geen emails meer naar dit adres. Bedankt voor je terugkoppeling."
    : "Deze link is verlopen of niet geldig. Neem contact op als je hulp nodig hebt.";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
  .container { max-width: 480px; margin: 10vh auto; background: #fff; padding: 40px 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; }
  h1 { margin: 0 0 12px; font-size: 22px; font-weight: 700; color: ${ok ? "#059669" : "#dc2626"}; }
  h2 { margin: 24px 0 8px; font-size: 15px; font-weight: 600; color: #64748b; }
  p { margin: 0; color: #475569; line-height: 1.6; }
</style>
</head>
<body>
<div class="container">
<h1>${headingEn}</h1>
<p>${messageEn}</p>
<h2>${headingNl}</h2>
<p>${messageNl}</p>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
