"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Megaphone,
  Loader2,
} from "lucide-react";

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

const statusLabels: Record<CampaignStatus, string> = {
  draft: "Concept",
  active: "Actief",
  paused: "Gepauzeerd",
  completed: "Voltooid",
  archived: "Gearchiveerd",
};

export default function CampaignsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleActivate = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/activate`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        alert(
          `Campaign geactiveerd! ${json.leads_activated} leads gestart, ${json.sequence_events_triggered} sequence events getriggerd.`,
        );
        fetchCampaigns();
      } else {
        alert(`Activatie mislukt: ${json.error}`);
      }
    } catch {
      alert("Activatie mislukt door een netwerkfout.");
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
      if (res.ok) {
        fetchCampaigns();
      }
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm("Weet je zeker dat je deze campaign wilt verwijderen?")) return;

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch {
      // Silently fail
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
              placeholder="Zoek campaigns..."
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
              <SelectItem value="all">Alle statussen</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nieuwe campaign
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Totaal leads",
            value: totalLeads,
            color: "text-neutral-900 dark:text-white",
          },
          {
            label: "Emails verstuurd",
            value: totalSent,
            color: "text-blue-600",
          },
          {
            label: "Gem. reply rate",
            value: `${avgReply}%`,
            color: "text-green-600",
          },
          {
            label: "Meetings geboekt",
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
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">Emails verstuurd</TableHead>
              <TableHead className="text-right">Reply rate</TableHead>
              <TableHead className="text-right">Meetings</TableHead>
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
                    <p>Campaigns laden...</p>
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
                        ? "Geen campaigns gevonden voor deze zoekopdracht"
                        : "Nog geen campaigns. Maak je eerste campaign aan."}
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
                      Aangemaakt op{" "}
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
                      {statusLabels[campaign.status]}
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
                                ? handleActivate(campaign.id)
                                : handleStatusChange(campaign.id, "active")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {campaign.status === "draft"
                              ? "Activeren"
                              : "Hervatten"}
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "active" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(campaign.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pauzeren
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Verwijderen
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
    </div>
  );
}
