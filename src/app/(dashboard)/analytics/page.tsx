"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, DailyStats, AnalyticsEvent } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Mail,
  Eye,
  Reply,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "all";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [emailCounts, setEmailCounts] = useState({ sent: 0, opened: 0, replied: 0 });
  const [meetingCount, setMeetingCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [leadStatusCounts, setLeadStatusCounts] = useState<Record<string, number>>({});

  const supabase = createClient();

  const dateFrom = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  }, [range]);

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);

    // Load daily_stats
    let statsQuery = supabase
      .from("daily_stats")
      .select("*")
      .order("date", { ascending: true });
    if (dateFrom) {
      statsQuery = statsQuery.gte("date", dateFrom);
    }

    // Load leads (for status distribution)
    const leadsQuery = supabase.from("leads").select("id, status");

    // Load email counts
    let emailsQuery = supabase
      .from("emails")
      .select("id, status, sent_at, opened_at, replied_at");
    if (dateFrom) {
      emailsQuery = emailsQuery.gte("created_at", dateFrom);
    }

    // Load meetings count
    let meetingsQuery = supabase
      .from("meetings")
      .select("id", { count: "exact", head: true });
    if (dateFrom) {
      meetingsQuery = meetingsQuery.gte("created_at", dateFrom);
    }

    // Load recent analytics events
    const eventsQuery = supabase
      .from("analytics_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const [statsRes, leadsRes, emailsRes, meetingsRes, eventsRes] =
      await Promise.all([
        statsQuery,
        leadsQuery,
        emailsQuery,
        meetingsQuery,
        eventsQuery,
      ]);

    if (statsRes.data) setDailyStats(statsRes.data);

    if (leadsRes.data) {
      setLeads(leadsRes.data as Lead[]);
      const counts: Record<string, number> = {};
      for (const l of leadsRes.data) {
        counts[l.status] = (counts[l.status] || 0) + 1;
      }
      setLeadStatusCounts(counts);
    }

    if (emailsRes.data) {
      const sent = emailsRes.data.length;
      const opened = emailsRes.data.filter((e) => e.opened_at).length;
      const replied = emailsRes.data.filter((e) => e.replied_at).length;
      setEmailCounts({ sent, opened, replied });
    }

    if (meetingsRes.count !== null && meetingsRes.count !== undefined) {
      setMeetingCount(meetingsRes.count);
    }

    if (eventsRes.data) setRecentEvents(eventsRes.data);

    setLoading(false);
  }

  // Aggregate stats from daily_stats
  const totals = useMemo(() => {
    const t = {
      emails_sent: 0,
      emails_opened: 0,
      emails_replied: 0,
      meetings_booked: 0,
    };
    for (const s of dailyStats) {
      t.emails_sent += s.emails_sent;
      t.emails_opened += s.emails_opened;
      t.emails_replied += s.emails_replied;
      t.meetings_booked += s.meetings_booked;
    }
    return t;
  }, [dailyStats]);

  // Use daily_stats totals when available, otherwise fall back to direct email counts
  const displayEmailsSent = totals.emails_sent || emailCounts.sent;
  const displayReplied = totals.emails_replied || emailCounts.replied;
  const displayOpened = totals.emails_opened || emailCounts.opened;
  const displayMeetings = totals.meetings_booked || meetingCount;
  const replyRate = displayEmailsSent > 0
    ? ((displayReplied / displayEmailsSent) * 100).toFixed(1)
    : "0.0";
  const openRate = displayEmailsSent > 0
    ? ((displayOpened / displayEmailsSent) * 100).toFixed(1)
    : "0.0";

  // Split daily stats into two halves for trend comparison
  const halfIdx = Math.floor(dailyStats.length / 2);
  function calcChange(field: keyof DailyStats) {
    if (dailyStats.length < 4) return null;
    const first = dailyStats.slice(0, halfIdx);
    const second = dailyStats.slice(halfIdx);
    const sum1 = first.reduce((a, s) => a + (Number(s[field]) || 0), 0);
    const sum2 = second.reduce((a, s) => a + (Number(s[field]) || 0), 0);
    if (sum1 === 0) return null;
    return Number(((sum2 - sum1) / sum1 * 100).toFixed(1));
  }

  const stats = [
    {
      label: "Totale leads",
      value: leads.length.toLocaleString("nl-NL"),
      change: null as number | null,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Emails verstuurd",
      value: displayEmailsSent.toLocaleString("nl-NL"),
      change: calcChange("emails_sent"),
      icon: Mail,
      color: "text-purple-600",
    },
    {
      label: "Reply rate",
      value: `${replyRate}%`,
      change: calcChange("emails_replied"),
      icon: Reply,
      color: "text-green-600",
    },
    {
      label: "Meetings geboekt",
      value: displayMeetings.toLocaleString("nl-NL"),
      change: calcChange("meetings_booked"),
      icon: Calendar,
      color: "text-teal-600",
    },
  ];

  const statusLabels: Record<string, string> = {
    new: "Nieuw",
    researched: "Onderzocht",
    contacted: "Benaderd",
    replied: "Gereageerd",
    interested: "Geinteresseerd",
    meeting_booked: "Meeting",
    closed_won: "Gewonnen",
    closed_lost: "Verloren",
    unsubscribed: "Afgemeld",
    bounced: "Bounced",
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-500",
    researched: "bg-purple-500",
    contacted: "bg-yellow-500",
    replied: "bg-green-500",
    interested: "bg-emerald-500",
    meeting_booked: "bg-teal-500",
    closed_won: "bg-green-700",
    closed_lost: "bg-red-500",
    unsubscribed: "bg-neutral-400",
    bounced: "bg-orange-500",
  };

  const eventTypeLabels: Record<string, string> = {
    email_sent: "Email verstuurd",
    email_opened: "Email geopend",
    email_replied: "Reply ontvangen",
    email_bounced: "Email bounced",
    lead_created: "Lead aangemaakt",
    lead_enriched: "Lead verrijkt",
    meeting_booked: "Meeting geboekt",
    meeting_completed: "Meeting voltooid",
    campaign_started: "Campagne gestart",
    campaign_paused: "Campagne gepauzeerd",
  };

  // Bar chart data: group daily stats by week for display
  const weeklyBars = useMemo(() => {
    if (dailyStats.length === 0) return [];
    const weeks: { label: string; sent: number; replied: number }[] = [];
    let weekSent = 0;
    let weekReplied = 0;
    let weekStart = "";
    for (let i = 0; i < dailyStats.length; i++) {
      if (i % 7 === 0) {
        if (i > 0) {
          weeks.push({ label: weekStart, sent: weekSent, replied: weekReplied });
        }
        weekSent = 0;
        weekReplied = 0;
        weekStart = new Date(dailyStats[i].date).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
        });
      }
      weekSent += dailyStats[i].emails_sent;
      weekReplied += dailyStats[i].emails_replied;
    }
    if (weekSent > 0 || weekReplied > 0) {
      weeks.push({ label: weekStart, sent: weekSent, replied: weekReplied });
    }
    return weeks;
  }, [dailyStats]);

  const maxBar = Math.max(1, ...weeklyBars.map((w) => w.sent));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics
          </h1>
          <p className="text-sm text-neutral-500">
            Overzicht van je outreach prestaties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            defaultValue="30d"
            onValueChange={(v) => v && setRange(v as DateRange)}
          >
            <SelectTrigger className="w-40 bg-white dark:bg-neutral-950">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Afgelopen 7 dagen</SelectItem>
              <SelectItem value="30d">Afgelopen 30 dagen</SelectItem>
              <SelectItem value="90d">Afgelopen 90 dagen</SelectItem>
              <SelectItem value="all">Alles</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => loadData()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Vernieuwen
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <span className="ml-3 text-neutral-500">Laden...</span>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const hasChange = stat.change !== null;
              const isPositive = (stat.change ?? 0) >= 0;
              return (
                <div
                  key={stat.label}
                  className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-neutral-500">{stat.label}</p>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className={`mt-1 text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                  {hasChange && (
                    <div className="mt-1 flex items-center gap-1">
                      {isPositive ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                      )}
                      <span
                        className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
                      >
                        {isPositive ? "+" : ""}
                        {stat.change}%
                      </span>
                      <span className="text-xs text-neutral-400">
                        trend
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Emails Over Time */}
            <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <CardHeader>
                <CardTitle className="text-sm">
                  Emails verstuurd per week
                </CardTitle>
                <CardDescription>
                  Verloop van het aantal verzonden emails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {weeklyBars.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-neutral-400">
                    Geen data voor deze periode.
                  </div>
                ) : (
                  <>
                    <div className="flex h-48 items-end justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-800">
                      {weeklyBars.map((w, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-blue-500/80 transition-all hover:bg-blue-600 dark:bg-blue-600/60 dark:hover:bg-blue-500"
                          style={{
                            height: `${(w.sent / maxBar) * 100}%`,
                            minHeight: w.sent > 0 ? "4px" : "0px",
                          }}
                          title={`${w.label}: ${w.sent} emails`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
                      {weeklyBars.length > 0 && (
                        <span>{weeklyBars[0].label}</span>
                      )}
                      {weeklyBars.length > 1 && (
                        <span>
                          {weeklyBars[weeklyBars.length - 1].label}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Lead Status Distribution */}
            <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <CardHeader>
                <CardTitle className="text-sm">
                  Lead status verdeling
                </CardTitle>
                <CardDescription>
                  Aantal leads per status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(leadStatusCounts).length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-neutral-400">
                    Geen leads gevonden.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(leadStatusCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <div key={status} className="flex items-center gap-3">
                          <span className="w-28 truncate text-sm text-neutral-600 dark:text-neutral-400">
                            {statusLabels[status] || status}
                          </span>
                          <div className="flex-1">
                            <div className="h-5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <div
                                className={`h-5 rounded-full ${statusColors[status] || "bg-neutral-400"} flex items-center px-2 text-xs font-medium text-white`}
                                style={{
                                  width: `${Math.max((count / leads.length) * 100, 8)}%`,
                                }}
                              >
                                {count}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <CardHeader>
              <CardTitle className="text-sm">Conversie funnel</CardTitle>
              <CardDescription>
                Van lead tot meeting -- je complete funnel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    label: "Totale leads",
                    value: leads.length,
                    pct: 100,
                    color: "bg-blue-500",
                  },
                  {
                    label: "Emails verstuurd",
                    value: displayEmailsSent,
                    pct: 100,
                    color: "bg-blue-400",
                  },
                  {
                    label: "Emails geopend",
                    value: displayOpened,
                    pct: displayEmailsSent > 0
                      ? Number(openRate)
                      : 0,
                    color: "bg-purple-500",
                  },
                  {
                    label: "Replies ontvangen",
                    value: displayReplied,
                    pct: displayEmailsSent > 0
                      ? Number(replyRate)
                      : 0,
                    color: "bg-green-500",
                  },
                  {
                    label: "Meetings geboekt",
                    value: displayMeetings,
                    pct: displayEmailsSent > 0
                      ? Number(
                          ((displayMeetings / displayEmailsSent) * 100).toFixed(
                            1,
                          ),
                        )
                      : 0,
                    color: "bg-teal-500",
                  },
                ].map((step) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <span className="w-36 text-sm text-neutral-600 dark:text-neutral-400">
                      {step.label}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className={`h-6 rounded-full ${step.color} flex items-center px-2 text-xs font-medium text-white`}
                          style={{
                            width: `${Math.max(step.pct, 5)}%`,
                          }}
                        >
                          {step.value.toLocaleString("nl-NL")}
                        </div>
                      </div>
                    </div>
                    <span className="w-14 text-right text-sm font-medium">
                      {step.pct}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <CardHeader>
              <CardTitle className="text-sm">Recente activiteit</CardTitle>
              <CardDescription>
                Laatste events uit analytics_events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  Nog geen activiteit geregistreerd.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-md border border-neutral-100 px-3 py-2 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {event.entity_type}
                        </Badge>
                        <span className="text-sm">
                          {eventTypeLabels[event.event_type] ||
                            event.event_type}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {new Date(event.created_at).toLocaleDateString(
                          "nl-NL",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
