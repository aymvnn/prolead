import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://wobzrrggmcbqilkjjlgm.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvYnpycmdnbWNicWlsa2pqbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDA4NjIsImV4cCI6MjA5MDg3Njg2Mn0.C6788iKFfaDTyXrK_f2_9klUORtoexblCP2APSVEVvw";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Ignored in Server Components — middleware handles session refresh
        }
      },
    },
  });
}
