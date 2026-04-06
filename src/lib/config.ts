/**
 * Public configuration values.
 * These are safe to expose to the client — they're meant to be public.
 * We define them here because NEXT_PUBLIC_ env vars sometimes don't
 * get inlined into statically prerendered client bundles on Vercel.
 */

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wobzrrggmcbqilkjjlgm.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvYnpycmdnbWNicWlsa2pqbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDA4NjIsImV4cCI6MjA5MDg3Njg2Mn0.C6788iKFfaDTyXrK_f2_9klUORtoexblCP2APSVEVvw";
