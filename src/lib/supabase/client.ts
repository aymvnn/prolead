import { createBrowserClient } from "@supabase/ssr";

// Hardcoded public values — these are MEANT to be public (anon key has no
// server-side privileges, and the URL is just a hostname).  Turbopack on
// Vercel does not reliably inline process.env.NEXT_PUBLIC_* into statically
// prerendered client bundles, so we provide the values directly.
const SUPABASE_URL = "https://wobzrrggmcbqilkjjlgm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvYnpycmdnbWNicWlsa2pqbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDA4NjIsImV4cCI6MjA5MDg3Njg2Mn0.C6788iKFfaDTyXrK_f2_9klUORtoexblCP2APSVEVvw";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
