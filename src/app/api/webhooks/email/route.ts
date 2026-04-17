import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { addSuppression } from "@/lib/email/suppression";

/**
 * Resend webhook event types we handle.
 * @see https://resend.com/docs/webhooks
 */
type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked";

interface ResendWebhookPayload {
  type: ResendEventType;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    /** Only present on bounce events */
    bounce?: {
      message: string;
      type?: string;
    };
  };
}

// We need the service-role client here because Resend posts without an auth
// cookie — we can't use the SSR helper.
function createService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// POST /api/webhooks/email — Resend webhook handler
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ResendWebhookPayload;
    const { type, data } = payload;

    if (!type || !data) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 },
      );
    }

    const supabase = createService();

    const toEmail = data.to?.[0];
    if (!toEmail) {
      return NextResponse.json({ received: true });
    }

    // Primary match: provider_message_id (persisted at send time).
    // Fallback: (to_email, subject) — brittle but keeps old rows working.
    const findEmail = async () => {
      if (data.email_id) {
        const { data: row } = await supabase
          .from("emails")
          .select("id, org_id, to_email")
          .eq("provider_message_id", data.email_id)
          .maybeSingle();
        if (row) return row;
      }
      const { data: fallback } = await supabase
        .from("emails")
        .select("id, org_id, to_email")
        .eq("to_email", toEmail)
        .eq("subject", data.subject)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return fallback;
    };

    const emailRow = await findEmail();

    switch (type) {
      case "email.delivered": {
        if (emailRow) {
          await supabase
            .from("emails")
            .update({ status: "delivered" })
            .eq("id", emailRow.id)
            .eq("status", "sent");
        }
        break;
      }

      case "email.bounced": {
        const now = new Date().toISOString();
        if (emailRow) {
          await supabase
            .from("emails")
            .update({ status: "bounced", bounced_at: now })
            .eq("id", emailRow.id);

          await supabase
            .from("leads")
            .update({ status: "bounced" })
            .eq("email", toEmail)
            .eq("org_id", emailRow.org_id);

          // Auto-suppress on hard bounce only. Resend reports bounce type in
          // data.bounce.type (e.g. "hard_bounce"). If unknown, be conservative
          // and suppress anyway — a bounce is a bounce for deliverability.
          await addSuppression(supabase, {
            orgId: emailRow.org_id,
            email: toEmail,
            reason: "bounced_hard",
            source: data.bounce?.type ?? "resend_bounce",
          });
        }
        break;
      }

      case "email.complained": {
        if (emailRow) {
          await supabase
            .from("leads")
            .update({ status: "unsubscribed" })
            .eq("email", toEmail)
            .eq("org_id", emailRow.org_id);

          await supabase
            .from("emails")
            .update({ status: "bounced" })
            .eq("id", emailRow.id);

          await addSuppression(supabase, {
            orgId: emailRow.org_id,
            email: toEmail,
            reason: "complained",
            source: "resend_complaint",
          });
        }
        break;
      }

      case "email.opened": {
        if (emailRow) {
          await supabase
            .from("emails")
            .update({
              status: "opened",
              opened_at: new Date().toISOString(),
            })
            .eq("id", emailRow.id)
            .in("status", ["sent", "delivered"]);
        }
        break;
      }

      case "email.clicked": {
        if (emailRow) {
          await supabase
            .from("emails")
            .update({
              status: "clicked",
              clicked_at: new Date().toISOString(),
            })
            .eq("id", emailRow.id)
            .in("status", ["sent", "delivered", "opened"]);
        }
        break;
      }

      default:
        // email.sent, email.delivery_delayed, etc. — acknowledge but no-op.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }
}
