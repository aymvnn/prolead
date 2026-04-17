import type { SupabaseClient } from "@supabase/supabase-js";

export type SuppressionReason =
  | "unsubscribed"
  | "bounced_hard"
  | "complained"
  | "invalid"
  | "manual";

/**
 * Check whether an email is on the suppression list for the given org.
 * Returns the suppression row if found, null otherwise.
 */
export async function isSuppressed(
  supabase: SupabaseClient,
  orgId: string,
  email: string,
): Promise<{ reason: SuppressionReason } | null> {
  const normalized = email.trim().toLowerCase();
  const { data } = await supabase
    .from("email_suppressions")
    .select("reason")
    .eq("org_id", orgId)
    .eq("email", normalized)
    .maybeSingle();
  return (data as { reason: SuppressionReason } | null) ?? null;
}

/**
 * Add an email to the suppression list. Idempotent: ON CONFLICT DO NOTHING.
 */
export async function addSuppression(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    email: string;
    reason: SuppressionReason;
    source?: string;
  },
): Promise<void> {
  const email = params.email.trim().toLowerCase();
  await supabase
    .from("email_suppressions")
    .upsert(
      {
        org_id: params.orgId,
        email,
        reason: params.reason,
        source: params.source ?? null,
      },
      { onConflict: "org_id,email", ignoreDuplicates: true },
    );
}
