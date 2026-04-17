"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Megaphone,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  leads_count: number;
  emails_sent: number;
  emails_replied: number;
  reply_rate: number;
  meetings_count: number;
  created_at: string;
  icp_profiles: { name: string } | null;
  voice_profiles: { name: string } | null;
}

interface PreviewLead {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  icp_score: number | null;
}

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

const statusKeys: Record<CampaignStatus, string> = {
  draft: "common.draft",
  active: "common.active",
  paused: "common.paused",
  completed: "common.completed",
  archived: "common.archived",
};

export default function CampaignsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const confirm = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activating, setActivating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setCampaigns(json.data);
      }
    } catch {
      // Network error - campaigns stay empty
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleShowPreview = async (campaignId: string) => {
    setPreviewCampaignId(campaignId);
    setPreviewOpen(true);
    setLoadingPreview(true);
    setPreviewLeads([]);

    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("campaign_leads")
        .select("leads(first_name, last_name, company, icp_score)")
        .eq("campaign_id", campaignId)
        .order("leads(icp_score)", { ascending: false })
        .limit(3);

      if (data) {
        const leads: PreviewLead[] = data
          .map((row: Record<string, unknown>) => row.leads as PreviewLead | null)
          .filter(Boolean) as PreviewLead[];
        setPreviewLeads(leads);
      }
    } catch {
      // If join fails, try a simpler approach
      try {
        const supabase = createClient();
        const { data: clData } = await supabase
          .from("campaign_leads")
          .select("lead_id")
          .eq("campaign_id", campaignId)
          .limit(3);

        if (clData && clData.length > 0) {
          const leadIds = clData.map((cl: { lead_id: string }) => cl.lead_id);
          const { data: leadsData } = await supabase
            .from("leads")
            .select("first_name, last_name, company, icp_score")
            .in("id", leadIds)
            .order("icp_score", { ascending: false });

          if (leadsData) setPreviewLeads(leadsData);
        }
      } catch {
        // Silently fail
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleActivate = async (campaignId: string) => {
    setActivating(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setPreviewOpen(false);
        setPreviewCampaignId(null);
        toast.success(
          `Campaign geactiveerd — ${json.leads_activated ?? 0} leads gestart, ${json.sequence_events_triggered ?? 0} sequence events getriggerd.`,
        );
        fetchCampaigns();
      } else {
        toast.error(`Activatie mislukt: ${json.error ?? res.statusText}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      toast.error(`Activatie mislukt: ${msg}`);
    } finally {
      setActivating(false);
    }
  };

  const handleStatusChange = async (
    campaignId: string,
    newStatus: CampaignStatus,
  ) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          `Kon status niet bijwerken: ${body.error ?? res.statusText}`,
        );
        return;
      }
      toast.success("Status bijgewerkt.");
      fetchCampaigns();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      toast.error(`Kon status niet bijwerken: ${msg}`);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const ok = await confirm({
      title: "Campagne verwijderen?",
      description:
        "Actieve campagnes worden gearchiveerd in plaats van verwijderd zodat lopende sequences niet breken.",
      confirmLabel: "Verwijderen",
      tone: "destructive",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(
          `Kon campagne niet verwijderen: ${body.error ?? res.statusText}`,
        );
        return;
      }
      toast.success("Campagne verwijderd.");
      fetchCampaigns();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      toast.error(`Kon campagne niet verwijderen: ${msg}`);
    }
  };

  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads_count, 0);
  const totalSent = campaigns.reduce((sum, c) => sum + c.emails_sent, 0);
  const totalReplied = campaigns.reduce(
    (sum, c) => sum + c.emails_replied,
    0,
  );
  const avgReply =
    totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0";
  const totalMeetings = campaigns.reduce(
    (sum, c) => sum + c.meetings_count,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              placeholder={t("campaigns.search")}
              className="w-72 bg-white pl-9 dark:bg-neutral-950"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => v && setStatusFilter(v)}
          >
            <SelectTrigger className="w-40 bg-white dark:bg-neutral-950">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("campaigns.allStatuses")}</SelectItem>
              {Object.entries(statusKeys).map(([value, key]) => (
                <SelectItem key={value} value={value}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("campaigns.new")}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: t("campaigns.totalLeads"),
            value: totalLeads,
            color: "text-neutral-900 dark:text-white",
          },
          {
            label: t("campaigns.sent"),
            value: totalSent,
            color: "text-blue-600",
          },
          {
            label: t("campaigns.replyRate"),
            value: `${avgReply}%`,
            color: "text-green-600",
          },
          {
            label: t("campaigns.meetings"),
            value: totalMeetings,
            color: "text-teal-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
          >
            <p className="text-sm text-neutral-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaigns Table */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("campaigns.campaign")}</TableHead>
              <TableHead>{t("campaigns.status")}</TableHead>
              <TableHead className="text-right">{t("campaigns.leads")}</TableHead>
              <TableHead className="text-right">{t("campaigns.emailsSent")}</TableHead>
              <TableHead className="text-right">{t("campaigns.replyRateCol")}</TableHead>
              <TableHead className="text-right">{t("campaigns.meetingsCol")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-neutral-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                    <p>{t("campaigns.loading")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-32 text-center text-neutral-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Megaphone className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                    <p>
                      {searchQuery
                        ? t("campaigns.noSearchResults")
                        : t("campaigns.noCampaigns")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-neutral-500">
                      {t("campaigns.createdOn")}{" "}
                      {new Date(campaign.created_at).toLocaleDateString(
                        "nl-NL",
                      )}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[campaign.status]}
                    >
                      {t(statusKeys[campaign.status])}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.leads_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.emails_sent}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.emails_sent > 0
                      ? `${campaign.reply_rate}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.meetings_count}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(campaign.status === "draft" ||
                          campaign.status === "paused") && (
                          <DropdownMenuItem
                            onClick={() =>
                              campaign.status === "draft"
                                ? handleShowPreview(campaign.id)
                                : handleStatusChange(campaign.id, "active")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {campaign.status === "draft"
                              ? t("campaigns.activate")
                              : t("campaigns.resume")}
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "active" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(campaign.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            {t("campaigns.pause")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("campaigns.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Activation Preview Dialog */}
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewCampaignId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("campaigns.previewTitle")}</DialogTitle>
            <DialogDescription>
              {t("campaigns.previewDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">
                  {t("campaigns.previewLoading")}
                </span>
              </div>
            ) : previewLeads.length === 0 ? (
              <p className="py-4 text-center text-sm text-neutral-500">
                {t("campaigns.previewNoLeads")}
              </p>
            ) : (
              <>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("campaigns.previewName")}</TableHead>
                        <TableHead>{t("campaigns.previewCompany")}</TableHead>
                        <TableHead className="text-right">
                          {t("campaigns.previewIcpScore")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewLeads.map((lead, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {[lead.first_name, lead.last_name]
                              .filter(Boolean)
                              .join(" ") || "-"}
                          </TableCell>
                          <TableCell>{lead.company || "-"}</TableCell>
                          <TableCell className="text-right">
                            {lead.icp_score != null ? (
                              <Badge
                                variant="secondary"
                                className={
                                  lead.icp_score >= 80
                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                    : lead.icp_score >= 50
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                                }
                              >
                                {lead.icp_score}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {t("campaigns.previewNote")}
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPreviewOpen(false);
                setPreviewCampaignId(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={activating || loadingPreview}
              onClick={() => {
                if (previewCampaignId) handleActivate(previewCampaignId);
              }}
            >
              {activating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("campaigns.activating")}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {t("campaigns.activateCampaign")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
