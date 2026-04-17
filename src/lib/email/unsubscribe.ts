import { createHmac, timingSafeEqual } from "crypto";

/**
 * Unsubscribe-token: stateless HMAC over email|orgId|leadId.
 * Lets one-click unsubscribe work without a DB lookup for the token itself
 * (we still do a DB update afterwards to mark the lead unsubscribed).
 */

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 16) {
    // Fallback to service role key so unsubscribe still works if env var is
    // missing. The only security property we need is that an attacker cannot
    // forge a token for an arbitrary email; any stable server-side secret
    // achieves that.
    const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!fallback) {
      throw new Error(
        "UNSUBSCRIBE_SECRET (or SUPABASE_SERVICE_ROLE_KEY fallback) must be set",
      );
    }
    return fallback;
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export interface UnsubscribePayload {
  email: string;
  orgId: string;
  leadId: string;
}

export function buildUnsubscribeToken(p: UnsubscribePayload): string {
  const payload = `${p.email.trim().toLowerCase()}|${p.orgId}|${p.leadId}`;
  const encoded = b64url(payload);
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function parseUnsubscribeToken(
  token: string,
): UnsubscribePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expected = sign(encoded);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const decoded = b64urlDecode(encoded).toString("utf8");
  const [email, orgId, leadId] = decoded.split("|");
  if (!email || !orgId || !leadId) return null;
  return { email, orgId, leadId };
}

export function buildUnsubscribeUrl(
  appUrl: string,
  token: string,
): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}/api/unsubscribe/${token}`;
}

export function buildListUnsubscribeHeaders(params: {
  appUrl: string;
  token: string;
  mailtoDomain?: string;
}): Record<string, string> {
  const url = buildUnsubscribeUrl(params.appUrl, params.token);
  const mailto = params.mailtoDomain
    ? `unsubscribe@${params.mailtoDomain}`
    : null;
  const listUnsub = mailto
    ? `<${url}>, <mailto:${mailto}?subject=unsubscribe>`
    : `<${url}>`;
  return {
    "List-Unsubscribe": listUnsub,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
