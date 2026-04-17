import { promises as dns } from "dns";

/**
 * Free email-address verification: syntax + MX-lookup + disposable/role blacklists.
 * No third-party call; runs entirely on DNS.
 *
 * This is best-effort — an MX record does not prove the mailbox exists,
 * but it catches the majority of typos and fake domains before we burn
 * sender reputation on them.
 */

const EMAIL_SYNTAX_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LOCALPARTS = new Set([
  "info",
  "sales",
  "support",
  "contact",
  "admin",
  "hello",
  "noreply",
  "no-reply",
  "postmaster",
  "webmaster",
  "abuse",
  "spam",
  "security",
  "privacy",
  "legal",
  "hr",
  "careers",
  "jobs",
  "help",
  "team",
  "office",
  "marketing",
  "press",
  "pr",
  "billing",
  "accounts",
  "accounting",
  "finance",
]);

// Compact disposable-domain list (most common). Not exhaustive — a paid service
// has 10k+ entries. For 20-50 leads this covers ~90% of what you'd see.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "10minutemail.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "fakeinbox.com",
  "temp-mail.org",
  "sharklasers.com",
  "dispostable.com",
  "spambog.com",
  "mohmal.com",
  "emailondeck.com",
]);

export type VerifyResultCode =
  | "ok"
  | "ok_role"
  | "invalid_syntax"
  | "no_mx"
  | "disposable";

export interface VerifyResult {
  ok: boolean;
  code: VerifyResultCode;
  reason: string;
  isRole: boolean;
}

export async function verifyEmail(emailRaw: string): Promise<VerifyResult> {
  const email = (emailRaw ?? "").trim().toLowerCase();

  if (!EMAIL_SYNTAX_RE.test(email)) {
    return {
      ok: false,
      code: "invalid_syntax",
      reason: "Ongeldig email-formaat",
      isRole: false,
    };
  }

  const [local, domain] = email.split("@");

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      code: "disposable",
      reason: `Wegwerp-email-domein (${domain})`,
      isRole: false,
    };
  }

  // MX-record must exist (or an A-record as fallback per RFC 5321 §5).
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) {
      // Fall back to A-record per RFC 5321
      try {
        await dns.resolve4(domain);
      } catch {
        return {
          ok: false,
          code: "no_mx",
          reason: `Geen MX-record voor ${domain}`,
          isRole: false,
        };
      }
    }
  } catch {
    try {
      await dns.resolve4(domain);
    } catch {
      return {
        ok: false,
        code: "no_mx",
        reason: `Geen MX-record voor ${domain}`,
        isRole: false,
      };
    }
  }

  const isRole = ROLE_LOCALPARTS.has(local);

  return {
    ok: true,
    code: isRole ? "ok_role" : "ok",
    reason: isRole ? "Rol-account (info@/sales@/etc)" : "OK",
    isRole,
  };
}
