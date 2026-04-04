/**
 * Email tracking utilities.
 *
 * Generates tracking pixel URLs for open tracking and rewrites links
 * inside HTML email bodies for click tracking.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Build the URL for a 1x1 tracking pixel image.
 * The GET handler at /api/emails/track will serve a transparent GIF
 * and record the open event.
 */
export function getTrackingPixelUrl(emailId: string): string {
  return `${APP_URL}/api/emails/track?eid=${encodeURIComponent(emailId)}&t=open`;
}

/**
 * Build a tracked redirect URL for link click tracking.
 * The GET handler at /api/emails/track will record the click
 * and redirect the user to the original destination.
 */
export function getTrackedLinkUrl(
  emailId: string,
  originalUrl: string,
): string {
  return `${APP_URL}/api/emails/track?eid=${encodeURIComponent(emailId)}&t=click&url=${encodeURIComponent(originalUrl)}`;
}

/**
 * Inject a tracking pixel and rewrite all <a href> links inside an HTML body
 * so that opens and clicks can be tracked.
 */
export function injectTracking(htmlBody: string, emailId: string): string {
  // 1. Rewrite links
  // Match href="..." or href='...' but skip mailto: and tel: links
  let tracked = htmlBody.replace(
    /href=["'](?!mailto:|tel:)(https?:\/\/[^"']+)["']/gi,
    (_match, url: string) => {
      const trackedUrl = getTrackedLinkUrl(emailId, url);
      return `href="${trackedUrl}"`;
    },
  );

  // 2. Append tracking pixel before </body> or at the end
  const pixel = `<img src="${getTrackingPixelUrl(emailId)}" width="1" height="1" alt="" style="display:none;border:0;" />`;

  if (tracked.includes("</body>")) {
    tracked = tracked.replace("</body>", `${pixel}</body>`);
  } else {
    tracked += pixel;
  }

  return tracked;
}
