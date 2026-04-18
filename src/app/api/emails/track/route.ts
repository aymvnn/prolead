import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// The recipient opening the pixel / clicking a link has NO Supabase session
// cookie, so the SSR client hits RLS and the UPDATE matches 0 rows. Use the
// service-role client for this endpoint — tracking is not user-authenticated.
function supa() {
  return createServiceClient();
}

// Transparent 1x1 GIF (43 bytes)
const TRANSPARENT_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

// GET /api/emails/track — Tracking endpoint
//   ?eid=<emailId>&t=open   → serve pixel + record open
//   ?eid=<emailId>&t=click&url=<target>  → record click + redirect
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const emailId = searchParams.get("eid");
  const trackingType = searchParams.get("t"); // "open" | "click"
  const redirectUrl = searchParams.get("url");

  if (!emailId || !trackingType) {
    // Fail silently — return pixel anyway so the email isn't broken
    return new Response(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }

  const supabase = supa();

  if (trackingType === "open") {
    // Record the open (only the first one matters, but we always update)
    await supabase
      .from("emails")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
      })
      .eq("id", emailId)
      .in("status", ["sent", "delivered"]); // don't downgrade clicked/replied

    return new Response(TRANSPARENT_PIXEL, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }

  if (trackingType === "click" && redirectUrl) {
    // Record the click
    await supabase
      .from("emails")
      .update({
        status: "clicked",
        clicked_at: new Date().toISOString(),
      })
      .eq("id", emailId)
      .in("status", ["sent", "delivered", "opened"]); // don't downgrade replied

    // Validate the redirect URL to prevent open-redirect attacks
    try {
      const target = new URL(redirectUrl);
      if (target.protocol === "https:" || target.protocol === "http:") {
        return NextResponse.redirect(target.toString(), 302);
      }
    } catch {
      // Invalid URL — fall through
    }
  }

  // Fallback: return pixel
  return new Response(TRANSPARENT_PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
