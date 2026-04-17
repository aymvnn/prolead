#!/usr/bin/env -S npx tsx
/**
 * PROLEAD — DNS check script
 *
 * Usage:
 *   npx tsx scripts/check-dns.ts <sender-domain>
 *
 * Verifies SPF / DKIM / DMARC on a sender domain before you send a cold-email
 * batch. Exits non-zero on any red status so you can wire this into a
 * pre-deploy or pre-send check.
 *
 * Not a replacement for GlockApps inbox-placement testing. It only answers
 * "are the DNS basics in place?".
 */

import { promises as dns } from "dns";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

async function resolveTxtJoined(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(hostname);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

async function checkSpf(domain: string): Promise<CheckResult> {
  const records = await resolveTxtJoined(domain);
  const spf = records.find((r) => r.toLowerCase().startsWith("v=spf1"));
  if (!spf) {
    return {
      name: "SPF",
      ok: false,
      detail: `Geen v=spf1 record op ${domain}`,
    };
  }
  const hasResend = /include:_?spf\.resend\.com/i.test(spf);
  const hasSes = /include:amazonses\.com/i.test(spf);
  if (!hasResend && !hasSes) {
    return {
      name: "SPF",
      ok: false,
      detail: `SPF gevonden maar zonder Resend/SES include: ${spf}`,
    };
  }
  return { name: "SPF", ok: true, detail: spf };
}

async function checkDkim(domain: string): Promise<CheckResult> {
  // Resend's default selector is `resend`. Some setups use a custom one
  // (eg. `re` or `rs1`). We try a small set.
  const selectors = ["resend", "re", "rs1"];
  for (const sel of selectors) {
    const host = `${sel}._domainkey.${domain}`;
    const records = await resolveTxtJoined(host);
    const dkim = records.find((r) => /v=DKIM1/i.test(r));
    if (dkim) {
      return {
        name: "DKIM",
        ok: true,
        detail: `${host} = ${dkim.slice(0, 80)}${dkim.length > 80 ? "..." : ""}`,
      };
    }
  }
  return {
    name: "DKIM",
    ok: false,
    detail: `Geen DKIM TXT op {resend,re,rs1}._domainkey.${domain}`,
  };
}

async function checkDmarc(domain: string): Promise<CheckResult> {
  const host = `_dmarc.${domain}`;
  const records = await resolveTxtJoined(host);
  const dmarc = records.find((r) => r.toLowerCase().startsWith("v=dmarc1"));
  if (!dmarc) {
    return {
      name: "DMARC",
      ok: false,
      detail: `Geen v=DMARC1 record op ${host}`,
    };
  }
  const policyMatch = dmarc.match(/p=([a-z]+)/i);
  const policy = policyMatch ? policyMatch[1].toLowerCase() : "none";
  const hasRua = /\brua=mailto:/i.test(dmarc);
  const ok = ["none", "quarantine", "reject"].includes(policy) && hasRua;
  if (!hasRua) {
    return {
      name: "DMARC",
      ok: false,
      detail: `${dmarc} (ontbrekend: rua=mailto:)`,
    };
  }
  return {
    name: "DMARC",
    ok,
    detail: `${dmarc} (p=${policy})`,
  };
}

async function main() {
  const domain = process.argv[2];
  if (!domain) {
    console.error("Usage: npx tsx scripts/check-dns.ts <sender-domain>");
    process.exit(2);
  }

  console.log(`\nDNS check voor: ${domain}\n`);

  const results = await Promise.all([
    checkSpf(domain),
    checkDkim(domain),
    checkDmarc(domain),
  ]);

  let allOk = true;
  for (const r of results) {
    const mark = r.ok ? "OK   " : "FAIL ";
    console.log(`  [${mark}] ${r.name.padEnd(6)} — ${r.detail}`);
    if (!r.ok) allOk = false;
  }
  console.log("");

  if (!allOk) {
    console.error(
      "Een of meer DNS-records zijn niet in orde. Los dit eerst op voordat je gaat versturen.\n",
    );
    process.exit(1);
  }

  console.log("Alle checks groen.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
