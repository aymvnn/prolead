import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify a Resend/Svix webhook signature.
 *
 * Resend delivers webhooks through Svix. The payload is signed with HMAC-SHA256
 * over `${svix-id}.${svix-timestamp}.${rawBody}`, using a base64-encoded secret
 * prefixed with `whsec_`. The `svix-signature` header can hold multiple
 * space-separated `v1,<base64sig>` pairs (one per active secret during rotation).
 *
 * Returns true if ANY `v1` signature in the header matches the computed one.
 *
 * Dev fallback: if `RESEND_WEBHOOK_SECRET` is not set and we're NOT in
 * production, we log a warning and return `true` so the developer can iterate
 * locally without Svix plumbing. In production, missing-secret returns `false`.
 */
export async function verifyResendWebhook(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // Hard-fail in prod: we refuse to trust unsigned webhooks.
      console.error(
        "[webhook-verify] RESEND_WEBHOOK_SECRET is not set — refusing webhook in production.",
      );
      return false;
    }
    console.warn(
      "[webhook-verify] RESEND_WEBHOOK_SECRET is not set — allowing webhook in non-production env.",
    );
    return true;
  }

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Strip the `whsec_` prefix, then base64-decode the secret.
  const secretRaw = secret.replace(/^whsec_/, "");
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretRaw, "base64");
    if (secretBytes.length === 0) return false;
  } catch {
    return false;
  }

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes)
    .update(signedPayload, "utf8")
    .digest("base64");
  const expectedBuf = Buffer.from(expected, "utf8");

  // Header format: "v1,<base64sig> v1,<base64sig2> v2,<other>"
  // We accept any matching v1 signature.
  const parts = svixSignature.split(" ");
  for (const part of parts) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length !== expectedBuf.length) continue;
    if (timingSafeEqual(sigBuf, expectedBuf)) return true;
  }

  return false;
}
