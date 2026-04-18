/**
 * Public configuration values.
 * These are safe to expose to the client — they're meant to be public.
 * We define them here because NEXT_PUBLIC_ env vars sometimes don't
 * get inlined into statically prerendered client bundles on Vercel,
 * AND because misconfigured env values (stray whitespace, wrong format)
 * were silently breaking production. We validate and fall back.
 */

const FALLBACK_SUPABASE_URL = "https://wobzrrggmcbqilkjjlgm.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvYnpycmdnbWNicWlsa2pqbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDA4NjIsImV4cCI6MjA5MDg3Njg2Mn0.C6788iKFfaDTyXrK_f2_9klUORtoexblCP2APSVEVvw";

function validSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Must start with https:// and look like a real Supabase URL.
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(trimmed)) return null;
  return trimmed.replace(/\/$/, "");
}

function validJwt(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Rough JWT shape: three base64url-ish segments separated by dots.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed))
    return null;
  return trimmed;
}

export const SUPABASE_URL =
  validSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
  FALLBACK_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  validJwt(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
  FALLBACK_SUPABASE_ANON_KEY;
