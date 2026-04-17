"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/hooks/use-org-id";
import { useTranslation } from "@/components/language-provider";
import type {
  Campaign,
  CampaignStatus,
  Lead,
  Sequence,
  SequenceStatus,
  LeadStatus,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Play,
  Pause,
  Pencil,
  Users,
  Mail,
  Eye,
  MessageSquare,
  CalendarCheck,
  Plus,
  Search,
  RefreshCw,
  ListOrdered,
  Settings,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────

interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  status: string;
  added_at: string;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    company: string;
    title: string | null;
    email: string;
    icp_score: number | null;
    status: LeadStatus;
  };
}

interface CampaignWithRelations extends Campaign {
  icp_profiles?: { name: string } | null;
  voice_profiles?: { name: string } | null;
}

// ── Status config ──────────────────────────

const statusColors: Record<CampaignStatus, string> = {
  draft:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  active:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  archived:
    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
};

// statusLabels moved inside component to use t()

// sequenceStatusLabels moved inside component to use t()

const sequenceStatusColors: Record<SequenceStatus, string> = {
  draft:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  active:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

// leadStatusLabels moved inside component to use t()

// ── Tabs ───────────────────────────────────

type TabKey = "leads" | "sequences" | "settings";

// tabs moved inside component to use t()

// ── Page component ─────────────────────────

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const { orgId } = useOrgId();

  const statusLabels: Record<CampaignStatus, string> = {
    draft: t("common.draft"),
    active: t("common.active"),
    paused: t("common.paused"),
    completed: t("common.completed"),
    archived: t("common.archived"),
  };

  const sequenceStatusLabels: Record<SequenceStatus, string> = {
    draft: t("common.draft"),
    active: t("common.active"),
    paused: t("common.paused"),
    completed: t("common.completed"),
  };

  const leadStatusLabels: Record<LeadStatus, string> = {
    new: t("status.new"),
    researched: t("status.researched"),
    contacted: t("status.contacted"),
    replied: t("status.replied"),
    interested: t("status.interested"),
    meeting_booked: t("status.meeting_booked"),
    closed_won: t("status.closed_won"),
    closed_lost: t("status.closed_lost"),
    unsubscribed: t("status.unsubscribed"),
    bounced: t("status.bounced"),
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "leads", label: t("nav.leads"), icon: <Users className="h-4 w-4" /> },
    {
      key: "sequences",
      label: t("nav.sequences"),
      icon: <ListOrdered className="h-4 w-4" />,
    },
    {
      key: "settings",
      label: t("nav.settings"),
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const [campaign, setCampaign] = useState<CampaignWithRelations | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<CampaignLead[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("leads");
  const [toggling, setToggling] = useState(false);

  // Add leads dialog
  const [addLeadsOpen, setAddLeadsOpen] = useState(false);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set()
  );
  const [leadSearch, setLeadSearch] = useState("");
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [addingLeads, setAddingLeads] = useState(false);

  // ── Data loading ─────────────────────────

  useEffect(() => {
    loadCampaign();
  }, [id]);

  async function loadCampaign() {
    setLoading(true);

    const [campaignResult, leadsResult, sequencesResult] = await Promise.all([
      supabase
        .from("campaigns")
        .select("*, icp_profiles:icp_id(name), voice_profiles:voice_profile_id(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("campaign_leads")
        .select(
          "*, lead:leads(id, first_name, last_name, company, title, email, icp_score, status)"
        )
        .eq("campaign_id", id)
        .order("added_at", { ascending: false }),
      supabase
        .from("sequences")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (campaignResult.data) setCampaign(campaignResult.data as CampaignWithRelations);
    if (leadsResult.data) setCampaignLeads(leadsResult.data as CampaignLead[]);
    if (sequencesResult.data) setSequences(sequencesResult.data as Sequence[]);

    setLoading(false);
  }

  // ── Actions ──────────────────────────────

  async function toggleStatus() {
    if (!campaign) return;
    setToggling(true);

    const newStatus: CampaignStatus =
      campaign.status === "active" ? "paused" : "active";

    const { error } = await supabase
      .from("campaigns")
      .update({ status: newStatus })
      .eq("id", campaign.id);

    setToggling(false);

    if (error) {
      toast.error(`Kon status niet bijwerken: ${error.message}`);
      return;
    }
    setCampaign({ ...campaign, status: newStatus });
    toast.success(
      newStatus === "active" ? "Campagne geactiveerd." : "Campagne gepauzeerd.",
    );
  }

  async function loadAvailableLeads() {
    setLoadingAvailable(true);

    const existingLeadIds = campaignLeads.map((cl) => cl.lead.id);

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (existingLeadIds.length > 0) {
      query = query.not("id", "in", `(${existingLeadIds.join(",")})`);
    }

    const { data } = await query;
    if (data) setAvailableLeads(data as Lead[]);
    setLoadingAvailable(false);
  }

  async function addSelectedLeads() {
    if (selectedLeadIds.size === 0 || !campaign) return;
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }
    setAddingLeads(true);

    const rows = Array.from(selectedLeadIds).map((leadId) => ({
      org_id: orgId,
      campaign_id: campaign.id,
      lead_id: leadId,
      status: "pending",
    }));

    // Upsert on the (campaign_id, lead_id) unique index — prevents "duplicate
    // key" errors if a lead was already added in a different browser tab.
    const { error } = await supabase
      .from("campaign_leads")
      .upsert(rows, { onConflict: "campaign_id,lead_id", ignoreDuplicates: true });

    setAddingLeads(false);

    if (error) {
      toast.error(`Kon leads niet toevoegen: ${error.message}`);
      return;
    }

    toast.success(
      `${rows.length} lead${rows.length !== 1 ? "s" : ""} toegevoegd.`,
    );
    setAddLeadsOpen(false);
    setSelectedLeadIds(new Set());
    setLeadSearch("");
    await loadCampaign();
  }

  function toggleLeadSelection(leadId: string) {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }

  // ── Computed ─────────────────────────────

  const stats = campaign?.stats ?? {};
  const totalLeads = stats.total_leads ?? campaignLeads.length;
  const emailsSent = stats.emails_sent ?? 0;
  const openRate =
    emailsSent > 0
      ? (((stats.emails_opened ?? 0) / emailsSent) * 100).toFixed(1)
      : "0";
  const replyRate =
    emailsSent > 0
      ? (((stats.emails_replied ?? 0) / emailsSent) * 100).toFixed(1)
      : "0";
  const meetingsBooked = stats.meetings_booked ?? 0;

  const filteredAvailableLeads = availableLeads.filter((lead) => {
    if (!leadSearch) return true;
    const q = leadSearch.toLowerCase();
    return (
      lead.first_name.toLowerCase().includes(q) ||
      lead.last_name.toLowerCase().includes(q) ||
      lead.company.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q)
    );
  });

  // ── Render ───────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center text-neutral-500">
        {t("campaignDetail.notFound")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{campaign.name}</h2>
              <Badge
                variant="secondary"
                className={statusColors[campaign.status]}
              >
                {statusLabels[campaign.status]}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500">
              {t("campaignDetail.createdOn")}{" "}
              {new Date(campaign.created_at).toLocaleDateString("nl-NL")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={toggleStatus}
            disabled={toggling}
          >
            {campaign.status === "active" ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                {t("campaigns.pause")}
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                {t("campaigns.activate")}
              </>
            )}
          </Button>
          <Link href={`/campaigns/${campaign.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: t("campaigns.totalLeads"),
            value: totalLeads,
            icon: <Users className="h-4 w-4 text-neutral-400" />,
            color: "text-neutral-900 dark:text-white",
          },
          {
            label: t("campaigns.sent"),
            value: emailsSent,
            icon: <Mail className="h-4 w-4 text-blue-400" />,
            color: "text-blue-600",
          },
          {
            label: t("campaignDetail.openRate"),
            value: `${openRate}%`,
            icon: <Eye className="h-4 w-4 text-purple-400" />,
            color: "text-purple-600",
          },
          {
            label: t("campaignDetail.replyRate"),
            value: `${replyRate}%`,
            icon: <MessageSquare className="h-4 w-4 text-green-400" />,
            color: "text-green-600",
          },
          {
            label: t("campaigns.meetings"),
            value: meetingsBooked,
            icon: <CalendarCheck className="h-4 w-4 text-teal-400" />,
            color: "text-teal-600",
          },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="flex items-center gap-3">
              {stat.icon}
              <div>
                <p className="text-xs text-neutral-500">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Leads Tab ────────────────────── */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                {campaignLeads.length} lead
                {campaignLeads.length !== 1 ? "s" : ""} {t("campaignDetail.inThisCampaign")}
              </p>
              <Dialog
                open={addLeadsOpen}
                onOpenChange={(open) => {
                  setAddLeadsOpen(open);
                  if (open) {
                    loadAvailableLeads();
                    setSelectedLeadIds(new Set());
                    setLeadSearch("");
                  }
                }}
              >
                <DialogTrigger
                  render={<Button variant="outline" />}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("leads.addLead")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("campaignDetail.addLeadsTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("campaignDetail.addLeadsDesc")}
                    </DialogDescription>
                  </DialogHeader>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      type="search"
                      placeholder={t("leads.search")}
                      className="pl-9"
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                    />
                  </div>

                  {/* Lead list */}
                  <ScrollArea className="h-64">
                    {loadingAvailable ? (
                      <div className="flex h-full items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                      </div>
                    ) : filteredAvailableLeads.length === 0 ? (
                      <p className="py-8 text-center text-sm text-neutral-500">
                        {t("campaignDetail.noAvailableLeads")}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {filteredAvailableLeads.map((lead) => (
                          <label
                            key={lead.id}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                          >
                            <Checkbox
                              checked={selectedLeadIds.has(lead.id)}
                              onCheckedChange={() =>
                                toggleLeadSelection(lead.id)
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {lead.first_name} {lead.last_name}
                              </p>
                              <p className="text-xs text-neutral-500 truncate">
                                {lead.title ? `${lead.title} - ` : ""}
                                {lead.company}
                              </p>
                            </div>
                            {lead.icp_score !== null && (
                              <Badge variant="secondary" className="shrink-0">
                                {lead.icp_score}%
                              </Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAddLeadsOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={addSelectedLeads}
                      disabled={selectedLeadIds.size === 0 || addingLeads}
                    >
                      {addingLeads ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("campaignDetail.adding")}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          {selectedLeadIds.size} lead
                          {selectedLeadIds.size !== 1 ? "s" : ""} {t("campaignDetail.addAction")}
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("campaignDetail.name")}</TableHead>
                    <TableHead>{t("campaignDetail.company")}</TableHead>
                    <TableHead>{t("campaignDetail.function")}</TableHead>
                    <TableHead className="text-right">{t("campaignDetail.icpScore")}</TableHead>
                    <TableHead>{t("campaignDetail.status")}</TableHead>
                    <TableHead>{t("campaignDetail.added")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignLeads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-neutral-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                          <p>
                            {t("campaignDetail.noLeadsYet")}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaignLeads.map((cl) => (
                      <TableRow
                        key={cl.id}
                        className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        onClick={() => router.push(`/leads/${cl.lead.id}`)}
                      >
                        <TableCell className="font-medium">
                          {cl.lead.first_name} {cl.lead.last_name}
                        </TableCell>
                        <TableCell>{cl.lead.company}</TableCell>
                        <TableCell className="text-neutral-500">
                          {cl.lead.title || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {cl.lead.icp_score !== null ? (
                            <span className="font-medium">
                              {cl.lead.icp_score}%
                            </span>
                          ) : (
                            <span className="text-neutral-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {leadStatusLabels[cl.lead.status] ?? cl.lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-neutral-500">
                          {new Date(cl.added_at).toLocaleDateString("nl-NL")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Sequences Tab ────────────────── */}
        {activeTab === "sequences" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {sequences.length} sequence
              {sequences.length !== 1 ? "s" : ""} {t("campaignDetail.linkedToCampaign")}
            </p>

            {sequences.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                  <ListOrdered className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                  <p className="text-neutral-500">
                    {t("campaignDetail.noSequencesYet")}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sequences.map((seq) => (
                  <Card key={seq.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{seq.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={
                            sequenceStatusColors[seq.status]
                          }
                        >
                          {sequenceStatusLabels[seq.status]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 text-sm text-neutral-500">
                        <span>
                          <strong className="text-neutral-900 dark:text-white">
                            {seq.steps_count}
                          </strong>{" "}
                          {t("campaignDetail.steps")}
                        </span>
                        <span>
                          {t("campaignDetail.createdOn")}{" "}
                          {new Date(seq.created_at).toLocaleDateString("nl-NL")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings Tab ─────────────────── */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-2 gap-6">
            {/* Campaign settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t("campaignDetail.campaignSettings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.dailyLimit")}</span>
                  <span className="font-medium">
                    {campaign.settings?.daily_limit ?? "-"} {t("campaignDetail.emailsPerDay")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.timezone")}</span>
                  <span className="font-medium">
                    {campaign.settings?.timezone ?? "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.sendWindow")}</span>
                  <span className="font-medium">
                    {campaign.settings?.send_window_start &&
                    campaign.settings?.send_window_end
                      ? `${campaign.settings.send_window_start} - ${campaign.settings.send_window_end}`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.skipWeekends")}</span>
                  <span className="font-medium">
                    {campaign.settings?.skip_weekends ? t("campaignDetail.yes") : t("campaignDetail.no")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Profiles */}
            <Card>
              <CardHeader>
                <CardTitle>{t("campaignDetail.profiles")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.icpProfile")}</span>
                  <span className="font-medium">
                    {campaign.icp_profiles?.name ?? (
                      <span className="text-neutral-400">{t("campaignDetail.notSet")}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.voiceProfile")}</span>
                  <span className="font-medium">
                    {campaign.voice_profiles?.name ?? (
                      <span className="text-neutral-400">{t("campaignDetail.notSet")}</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.status")}</span>
                  <Badge
                    variant="secondary"
                    className={statusColors[campaign.status]}
                  >
                    {statusLabels[campaign.status]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">{t("campaignDetail.lastUpdated")}</span>
                  <span className="font-medium">
                    {new Date(campaign.updated_at).toLocaleDateString("nl-NL")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
