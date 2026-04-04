import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  fromEmail: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId: string | null;
  error: string | null;
}

/**
 * Check if an email account has reached its daily sending limit.
 */
export async function checkDailyLimit(
  emailsSentToday: number,
  dailyLimit: number,
): Promise<boolean> {
  return emailsSentToday < dailyLimit;
}

/**
 * Send an email via the Resend API.
 *
 * Before calling this, the caller should verify daily limits
 * using `checkDailyLimit` or by querying the email_accounts table.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendEmailResult> {
  const { to, subject, htmlBody, textBody, fromEmail } = options;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html: htmlBody,
      text: textBody,
    });

    if (error) {
      return {
        success: false,
        messageId: null,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id ?? null,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    return {
      success: false,
      messageId: null,
      error: message,
    };
  }
}
