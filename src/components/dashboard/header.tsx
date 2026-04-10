"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

const pageTitleKeys: Record<string, string> = {
  "/overview": "nav.overview",
  "/bedrijf": "nav.company",
  "/leadprompter": "nav.leadprompter",
  "/leads": "nav.leads",
  "/campaigns": "nav.campaigns",
  "/sequences": "nav.sequences",
  "/inbox": "nav.inbox",
  "/meetings": "nav.meetings",
  "/templates": "nav.templates",
  "/icp": "nav.icp",
  "/analytics": "nav.analytics",
  "/integrations": "nav.integrations",
  "/settings": "nav.settings",
  "/onboarding": "nav.onboarding",
};

interface SearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  email: string | null;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  // ── Dark mode ────────────────────────────────
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("prolead-theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggleDark() {
    const newDark = !dark;
    setDark(newDark);
    document.documentElement.classList.toggle("dark", newDark);
    localStorage.setItem("prolead-theme", newDark ? "dark" : "light");
  }

  // ── Global search ────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("leads")
        .select("id, first_name, last_name, company, email")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,company.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      setResults(data ?? []);
      setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  // Close dropdown on click outside or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // ── Page title ───────────────────────────────
  let titleKey = "nav.overview";
  for (const [path, key] of Object.entries(pageTitleKeys)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      titleKey = key;
      break;
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-background shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] px-6">
      <h1 className="text-xl font-semibold tracking-tight">{t(titleKey)}</h1>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            placeholder={t("header.search")}
            className="w-64 pl-9"
            value={query}
            onChange={handleSearchChange}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          />
          {showDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg">
              {searching && (
                <div className="px-4 py-3 text-sm text-muted-foreground">{t("header.searching")}</div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">{t("header.noResults")}</div>
              )}
              {!searching && results.map((lead) => (
                <button
                  key={lead.id}
                  className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                  onClick={() => {
                    router.push(`/leads/${lead.id}`);
                    setShowDropdown(false);
                    setQuery("");
                  }}
                >
                  <span className="text-sm font-medium">
                    {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || t("overview.unknownLead")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[lead.company, lead.email].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDark}>
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
