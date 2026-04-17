"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Resolves the current user's org_id from the `users` table.
 *
 * Dashboard writes to org-scoped tables MUST include `org_id` in the payload
 * (RLS enforces it, but being explicit avoids silent zero-row writes). Call
 * this hook once at the top of a page component, then thread `orgId` into
 * every insert/upsert on that page. Always guard writes with
 * `if (!orgId) return;` so first-render clicks don't produce NULL-org rows.
 */
export function useOrgId(): { orgId: string | null; isLoading: boolean } {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      setOrgId(data?.org_id ?? null);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { orgId, isLoading };
}
