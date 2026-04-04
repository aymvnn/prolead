import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    };
  };
}

// POST /api/webhooks/email — Resend inbound webhook
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

    const supabase = await createClient();

    // Try to find the matching email record by looking up the Resend email_id
    // in our emails table.  We store the to_email, so we match on that + subject
    // as a secondary identifier. In production you would store the Resend message
    // ID on send and match on that.  For now, match on to_email + subject.
    const toEmail = data.to?.[0];
    if (!toEmail) {
      return NextResponse.json({ received: true });
    }

    // Build update payload based on event type
    switch (type) {
      case "email.delivered": {
        await supabase
          .from("emails")
          .update({ status: "delivered" })
          .eq("to_email", toEmail)
          .eq("subject", data.subject)
          .eq("status", "sent");
        break;
      }

      case "email.bounced": {
        const now = new Date().toISOString();
        // Update email status
        await supabase
          .from("emails")
          .update({
            status: "bounced",
            bounced_at: now,
          })
          .eq("to_email", toEmail)
          .eq("subject", data.subject)
          .in("status", ["sent", "delivered"]);

        // Also update the lead status to "bounced"
        await supabase
          .from("leads")
          .update({ status: "bounced" })
          .eq("email", toEmail);
        break;
      }

      case "email.complained": {
        // Treat complaints like unsubscribes
        await supabase
          .from("leads")
          .update({ status: "unsubscribed" })
          .eq("email", toEmail);

        await supabase
          .from("emails")
          .update({ status: "bounced" })
          .eq("to_email", toEmail)
          .eq("subject", data.subject)
          .in("status", ["sent", "delivered", "opened", "clicked"]);
        break;
      }

      case "email.opened": {
        await supabase
          .from("emails")
          .update({
            status: "opened",
            opened_at: new Date().toISOString(),
          })
          .eq("to_email", toEmail)
          .eq("subject", data.subject)
          .in("status", ["sent", "delivered"]);
        break;
      }

      case "email.clicked": {
        await supabase
          .from("emails")
          .update({
            status: "clicked",
            clicked_at: new Date().toISOString(),
          })
          .eq("to_email", toEmail)
          .eq("subject", data.subject)
          .in("status", ["sent", "delivered", "opened"]);
        break;
      }

      default:
        // email.sent, email.delivery_delayed, etc. — acknowledge but no-op
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook error: ${message}`, { status: 400 });
  }
}
