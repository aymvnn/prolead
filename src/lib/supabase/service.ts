import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";

/**
 * Central service-role Supabase client for server routes and Inngest
 * functions that bypass RLS (webhooks, tracking pixel, inbound email,
 * unsubscribe, sequence runner, cron jobs).
 *
 * URL falls back to the hardcoded project URL from `config.ts` so that a
 * missing/malformed `NEXT_PUBLIC_SUPABASE_URL` in Vercel doesn't break
 * production (as happened once already — the env var can be empty string
 * or unset while looking "set" in the dashboard UI).
 *
 * The service-role key CANNOT have a fallback (it's secret). If it's
 * missing, we throw a clear error at call-time so the failure is
 * attributable in logs instead of "Invalid supabaseUrl" masking the real
 * cause.
 */
export function createServiceClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set in the environment — add it in Vercel → Project → Environment Variables (Production).",
    );
  }
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
