"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Campaign,
  AnalyticsEvent,
  Meeting,
  MeetingStatus,
} from "@/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  Eye,
  Calendar,
  Activity,
  Megaphone,
  Clock,
  Loader2,
  Video,
} from "lucide-react";
import Link from "next/link";

type MeetingWithLead = Meeting & {
  lead: { first_name: string; last_name: string; company: string } | null;
};

const eventTypeLabels: Record<string, string> = {
  email_sent: "Email verstuurd",
  email_opened: "Email geopend",
  email_replied: "Reply ontvangen",
  email_bounced: "Email bounced",
  email_clicked: "Link geklikt",
  lead_created: "Lead aangemaakt",
  lead_enriched: "Lead verrijkt",
  lead_updated: "Lead bijgewerkt",
  meeting_booked: "Meeting geboekt",
  meeting_completed: "Meeting voltooid",
  meeting_cancelled: "Meeting geannuleerd",
  campaign_started: "Campagne gestart",
  campaign_paused: "Campagne gepauzeerd",
  campaign_completed: "Campagne voltooid",
  sequence_started: "Sequence gestart",
};

const meetingStatusLabels: Record<MeetingStatus, string> = {
  scheduled: "Gepland",
  completed: "Voltooid",
  cancelled: "Geannuleerd",
  no_show: "Niet verschenen",
};

const meetingStatusColors: Record<MeetingStatus, string> = {
  scheduled:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  no_show:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [emailsSent, setEmailsSent] = useState(0);
  const [openRate, setOpenRate] = useState(0);
  const [meetingsBooked, setMeetingsBooked] = useState(0);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<Campaign[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingWithLead[]>(
    [],
  );

  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);

    const now = new Date().toISOString();

    const [
      leadsRes,
      emailsSentRes,
      emailsOpenedRes,
      meetingsRes,
      eventsRes,
      campaignsRes,
      upcomingRes,
    ] = await Promise.all([
      // Total leads count
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true }),

      // Outbound emails count
      supabase
        .from("emails")
        .select("id", { count: "exact", head: true })
        .eq("direction", "outbound"),

      // Emails with opened_at (for open rate)
      supabase
        .from("emails")
        .select("id, opened_at")
        .eq("direction", "outbound"),

      // Meetings booked (scheduled or completed)
      supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .in("status", ["scheduled", "completed"]),

      // Recent analytics events
      supabase
        .from("analytics_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),

      // Active campaigns
      supabase
        .from("campaigns")
        .select("*")
        .eq("status", "active")
        .order("updated_at", { ascending: false }),

      // Upcoming meetings (next 5)
      supabase
        .from("meetings")
        .select(
          "*, lead:leads(first_name, last_name, company)",
        )
        .eq("status", "scheduled")
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(5),
    ]);

    // Total leads
    if (leadsRes.count !== null && leadsRes.count !== undefined) {
      setTotalLeads(leadsRes.count);
    }

    // Emails sent
    if (emailsSentRes.count !== null && emailsSentRes.count !== undefined) {
      setEmailsSent(emailsSentRes.count);
    }

    // Open rate
    if (emailsOpenedRes.data) {
      const total = emailsOpenedRes.data.length;
      const opened = emailsOpenedRes.data.filter((e) => e.opened_at).length;
      setOpenRate(total > 0 ? Math.round((opened / total) * 100) : 0);
    }

    // Meetings booked
    if (meetingsRes.count !== null && meetingsRes.count !== undefined) {
      setMeetingsBooked(meetingsRes.count);
    }

    // Recent events
    if (eventsRes.data) {
      setRecentEvents(eventsRes.data);
    }

    // Active campaigns
    if (campaignsRes.data) {
      setActiveCampaigns(campaignsRes.data);
    }

    // Upcoming meetings
    if (upcomingRes.data) {
      const mapped = upcomingRes.data.map((m: Record<string, unknown>) => {
        const leadData = m.lead;
        return {
          ...m,
          lead: Array.isArray(leadData)
            ? leadData[0] ?? null
            : leadData ?? null,
        } as MeetingWithLead;
      });
      setUpcomingMeetings(mapped);
    }

    setLoading(false);
  }

  const today = new Date().toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statCards = [
    {
      label: "Totale Leads",
      value: totalLeads.toLocaleString("nl-NL"),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
      borderColor: "border-t-blue-500",
    },
    {
      label: "Emails Verstuurd",
      value: emailsSent.toLocaleString("nl-NL"),
      icon: Mail,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
      borderColor: "border-t-purple-500",
    },
    {
      label: "Open Rate",
      value: `${openRate}%`,
      icon: Eye,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      borderColor: "border-t-amber-500",
    },
    {
      label: "Meetings Geboekt",
      value: meetingsBooked.toLocaleString("nl-NL"),
      icon: Calendar,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-950",
      borderColor: "border-t-teal-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        <span className="ml-3 text-neutral-500">Dashboard laden...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welkom bij PROLEAD
        </h1>
        <p className="mt-1 text-sm capitalize text-neutral-500">{today}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-xl border border-border/60 bg-card p-5 border-t-2 ${stat.borderColor} shadow-sm hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-500">
                  {stat.label}
                </p>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.bgColor}`}
                >
                  <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
              </div>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Activity + Campaigns / Upcoming Meetings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-primary" />
              Recente Activiteit
            </CardTitle>
            <CardDescription>
              Laatste 10 events in het platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                <Activity className="mb-2 h-8 w-8" />
                <p className="text-sm">Nog geen activiteit geregistreerd.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {event.entity_type}
                      </Badge>
                      <span className="text-sm">
                        {eventTypeLabels[event.event_type] || event.event_type}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400">
                      {new Date(event.created_at).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Megaphone className="h-4 w-4 text-primary" />
              Actieve Campagnes
            </CardTitle>
            <CardDescription>Campagnes die nu actief zijn.</CardDescription>
          </CardHeader>
          <CardContent>
            {activeCampaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                <Megaphone className="mb-2 h-8 w-8" />
                <p className="text-sm">Geen actieve campagnes.</p>
                <Link
                  href="/campaigns"
                  className="mt-2 text-xs text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
                >
                  Campagne starten
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCampaigns.map((campaign) => {
                  const stats = campaign.stats;
                  return (
                    <Link
                      key={campaign.id}
                      href="/campaigns"
                      className="block rounded-lg border border-neutral-100 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{campaign.name}</p>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        >
                          Actief
                        </Badge>
                      </div>
                      {stats && (
                        <div className="mt-2 flex gap-4 text-xs text-neutral-500">
                          {stats.total_leads !== undefined && (
                            <span>{stats.total_leads} leads</span>
                          )}
                          {stats.emails_sent !== undefined && (
                            <span>{stats.emails_sent} verstuurd</span>
                          )}
                          {stats.emails_opened !== undefined && (
                            <span>{stats.emails_opened} geopend</span>
                          )}
                          {stats.meetings_booked !== undefined && (
                            <span>{stats.meetings_booked} meetings</span>
                          )}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                Aankomende Meetings
              </CardTitle>
              <CardDescription>
                De eerstvolgende 5 geplande meetings.
              </CardDescription>
            </div>
            <Link
              href="/meetings"
              className="text-xs text-neutral-500 underline hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Alle meetings
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
              <Calendar className="mb-2 h-8 w-8" />
              <p className="text-sm">Geen aankomende meetings.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand-subtle text-sm font-semibold text-primary">
                      {meeting.lead
                        ? `${meeting.lead.first_name[0]}${meeting.lead.last_name[0]}`
                        : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{meeting.title}</p>
                      <p className="text-xs text-neutral-500">
                        {meeting.lead
                          ? `${meeting.lead.first_name} ${meeting.lead.last_name} - ${meeting.lead.company}`
                          : "Onbekende lead"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm">
                        {new Date(meeting.start_time).toLocaleDateString(
                          "nl-NL",
                          {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          },
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(meeting.start_time).toLocaleTimeString(
                          "nl-NL",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                        {" - "}
                        {new Date(meeting.end_time).toLocaleTimeString(
                          "nl-NL",
                          { hour: "2-digit", minute: "2-digit" },
                        )}
                      </p>
                    </div>
                    {meeting.meeting_link && (
                      <a
                        href={meeting.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <Video className="h-4 w-4" />
                      </a>
                    )}
                    <Badge
                      variant="secondary"
                      className={meetingStatusColors[meeting.status]}
                    >
                      {meetingStatusLabels[meeting.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
