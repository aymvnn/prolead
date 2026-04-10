import type { CompanyProfile } from "@/types/database";

/**
 * Wraps AI-generated email body in a branded HTML template.
 *
 * For cold outreach (step 1), returns plain-style HTML (no heavy branding).
 * For follow-ups (step 2+), wraps in branded template with logo and footer.
 */
export function wrapEmailInTemplate(params: {
  bodyHtml: string;
  companyProfile?: CompanyProfile | null;
  stepNumber?: number;
  branded?: boolean;
}): string {
  const { bodyHtml, companyProfile, stepNumber = 1, branded } = params;

  // Cold outreach: plain style (looks personal, not like marketing)
  if (!branded && stepNumber <= 1) {
    return plainTemplate(bodyHtml, companyProfile);
  }

  // Follow-ups or explicit branded: full branded template
  return brandedTemplate(bodyHtml, companyProfile);
}

function plainTemplate(
  bodyHtml: string,
  profile?: CompanyProfile | null,
): string {
  const companyName = profile?.company_name || "PROLEAD";
  const website = profile?.website || "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; }
  a { color: #4f46e5; }
</style>
</head>
<body>
<div class="container">
${bodyHtml}
<div class="footer">
${companyName}${website ? ` · <a href="https://${website.replace(/^https?:\/\//, "")}">${website.replace(/^https?:\/\//, "")}</a>` : ""}
</div>
</div>
</body>
</html>`;
}

function brandedTemplate(
  bodyHtml: string,
  profile?: CompanyProfile | null,
): string {
  const companyName = profile?.company_name || "PROLEAD";
  const website = profile?.website || "";
  const description = profile?.description || "";

  // Brand colors (indigo)
  const primaryColor = "#4f46e5";
  const primaryLight = "#eef2ff";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background-color: #f5f5f5; }
  .wrapper { max-width: 600px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, ${primaryColor}, #6366f1); padding: 24px 32px; text-align: left; }
  .header-logo { font-size: 18px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: -0.3px; }
  .body { background: #ffffff; padding: 32px; }
  .footer { background: ${primaryLight}; padding: 24px 32px; text-align: center; font-size: 12px; color: #6b7280; }
  .footer a { color: ${primaryColor}; text-decoration: none; }
  .divider { height: 1px; background: #e5e7eb; margin: 24px 0; }
  a { color: ${primaryColor}; }
</style>
</head>
<body>
<div class="wrapper">
<!-- Header -->
<div class="header">
<a href="${website ? `https://${website.replace(/^https?:\/\//, "")}` : "#"}" class="header-logo">${companyName}</a>
</div>

<!-- Body -->
<div class="body">
${bodyHtml}
</div>

<!-- Footer -->
<div class="footer">
<strong>${companyName}</strong>
${description ? `<br>${description.slice(0, 100)}` : ""}
${website ? `<br><a href="https://${website.replace(/^https?:\/\//, "")}">${website.replace(/^https?:\/\//, "")}</a>` : ""}
<div class="divider"></div>
<span style="font-size: 11px; color: #9ca3af;">
You received this email because we think our services could be valuable to you.
<br>If you prefer not to receive these emails, simply reply with "unsubscribe".
</span>
</div>
</div>
</body>
</html>`;
}
