"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Search,
  Sun,
  Moon,
  Mail,
  MailOpen,
  MessageSquare,
  UserPlus,
  Calendar,
  Zap,
  MousePointerClick,
  RefreshCw,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const eventIcons: Record<string, typeof Mail> = {
  email_sent: Mail,
  email_opened: MailOpen,
  email_replied: MessageSquare,
  email_bounced: AlertCircle,
  email_clicked: MousePointerClick,
  lead_created: UserPlus,
  lead_enriched: Zap,
  lead_updated: RefreshCw,
  meeting_booked: Calendar,
  meeting_completed: CheckCheck,
  meeting_cancelled: AlertCircle,
  campaign_started: Zap,
  campaign_paused: AlertCircle,
  campaign_completed: CheckCheck,
  sequence_started: Zap,
};

interface AnalyticsEvent {
  id: string;
  event_type: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

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

  // ── Notifications ────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifEvents, setNotifEvents] = useState<AnalyticsEvent[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("analytics_events")
        .select("id, event_type, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setNotifEvents(data);
    } catch {
      // Silently fail
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  function handleNotifToggle() {
    if (!notifOpen) {
      loadNotifications();
    }
    setNotifOpen(!notifOpen);
  }

  function handleMarkAllRead() {
    setHasUnread(false);
  }

  // Close notif dropdown on click outside
  useEffect(() => {
    function handleNotifClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleNotifClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleNotifClickOutside);
  }, [notifOpen]);

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
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={handleNotifToggle}
          >
            <Bell className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-popover shadow-lg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold">
                  {t("notifications.title")}
                </h3>
                {hasUnread && notifEvents.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("notifications.markAllRead")}
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {loadingNotifs ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />
                  </div>
                ) : notifEvents.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-500">
                    {t("notifications.empty")}
                  </div>
                ) : (
                  notifEvents.map((event) => {
                    const IconComp = eventIcons[event.event_type] || Zap;
                    const eventKey = `event.${event.event_type}`;
                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 border-b border-border/50 px-4 py-3 last:border-0 hover:bg-muted/50"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <IconComp className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {t(eventKey)}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {timeAgo(event.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleDark}>
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
}
