"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/hooks/use-org-id";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { Lead, LeadStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Upload,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
  Trash2,
  Download,
  Tag,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useTranslation } from "@/components/language-provider";

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  researched:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  contacted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  replied:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  interested:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  meeting_booked:
    "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  closed_won:
    "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-200",
  closed_lost:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  unsubscribed:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  bounced:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const statusKeys: Record<LeadStatus, string> = {
  new: "status.new",
  researched: "status.researched",
  contacted: "status.contacted",
  replied: "status.replied",
  interested: "status.interested",
  meeting_booked: "status.meeting_booked",
  closed_won: "status.closed_won",
  closed_lost: "status.closed_lost",
  unsubscribed: "status.unsubscribed",
  bounced: "status.bounced",
};

export default function LeadsPage() {
  const { t } = useTranslation();
  const { orgId } = useOrgId();
  const confirm = useConfirm();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [bulkTag, setBulkTag] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: "",
    last_name: "",
    email: "",
    company: "",
    title: "",
    linkedin_url: "",
  });
  const supabase = createClient();

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  async function loadLeads() {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setLeads(data);
    }
    setSelectedIds(new Set());
    setLoading(false);
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }

    const { error } = await supabase.from("leads").insert({
      ...newLead,
      org_id: orgId,
      status: "new",
    });

    if (error) {
      toast.error(`Kon lead niet toevoegen: ${error.message}`);
      return;
    }

    toast.success("Lead toegevoegd.");
    setShowAddDialog(false);
    setNewLead({
      first_name: "",
      last_name: "",
      email: "",
      company: "",
      title: "",
      linkedin_url: "",
    });
    loadLeads();
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `${selectedIds.size} lead${selectedIds.size !== 1 ? "s" : ""} verwijderen?`,
      description: "Deze actie kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      tone: "destructive",
    });
    if (!ok) return;

    setDeleting(true);
    const ids = Array.from(selectedIds);

    // Delete parent `leads` first — CASCADE handles lead_tags, lead_notes,
    // and lead_trigger_events. Deleting children up front would orphan rows
    // if the parent delete failed for any reason (RLS, FK, etc).
    const { error } = await supabase.from("leads").delete().in("id", ids);

    setDeleting(false);

    if (error) {
      toast.error(`Kon leads niet verwijderen: ${error.message}`);
      return;
    }

    toast.success(`${ids.length} lead${ids.length !== 1 ? "s" : ""} verwijderd.`);
    await loadLeads();
  }

  async function handleBulkTag() {
    if (selectedIds.size === 0 || !bulkTag.trim()) return;
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }
    const ids = Array.from(selectedIds);

    // Get existing tags for these leads
    const { data: existingTags } = await supabase
      .from("lead_tags")
      .select("lead_id, tag")
      .in("lead_id", ids)
      .eq("tag", bulkTag.trim());

    const existingSet = new Set(existingTags?.map((t) => t.lead_id) || []);
    const newTagInserts = ids
      .filter((id) => !existingSet.has(id))
      .map((id) => ({ org_id: orgId, lead_id: id, tag: bulkTag.trim() }));

    if (newTagInserts.length > 0) {
      const { error } = await supabase.from("lead_tags").insert(newTagInserts);
      if (error) {
        toast.error(`Kon tag niet toevoegen: ${error.message}`);
        return;
      }
    }

    toast.success(`Tag "${bulkTag.trim()}" toegevoegd.`);
    setBulkTag("");
    setShowTagDialog(false);
    setSelectedIds(new Set());
  }

  async function handleExport() {
    const ids =
      selectedIds.size > 0 ? Array.from(selectedIds) : leads.map((l) => l.id);

    // Build CSV in client
    const headers = [
      "first_name",
      "last_name",
      "email",
      "company",
      "title",
      "phone",
      "linkedin_url",
      "website",
      "industry",
      "employee_count",
      "status",
      "icp_score",
      "source",
      "created_at",
    ];

    const leadsToExport = leads.filter((l) => ids.includes(l.id));
    const csvRows = [
      headers.join(","),
      ...leadsToExport.map((lead) =>
        headers
          .map((h) => {
            const val = lead[h as keyof typeof lead];
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (
              str.includes(",") ||
              str.includes('"') ||
              str.includes("\n")
            ) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(","),
      ),
    ];

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prolead-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleAIResearch(leadId: string) {
    try {
      await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      await loadLeads();
    } catch {
      // silently fail
    }
  }

  async function handleDeleteSingle(leadId: string) {
    const ok = await confirm({
      title: "Lead verwijderen?",
      description: "Deze actie kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      tone: "destructive",
    });
    if (!ok) return;

    // Parent delete first — CASCADE handles tags/notes/trigger events.
    const { error } = await supabase.from("leads").delete().eq("id", leadId);
    if (error) {
      toast.error(`Kon lead niet verwijderen: ${error.message}`);
      return;
    }
    toast.success("Lead verwijderd.");
    await loadLeads();
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  }

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.first_name.toLowerCase().includes(q) ||
      lead.last_name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.company.toLowerCase().includes(q) ||
      (lead.title && lead.title.toLowerCase().includes(q))
    );
  });

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="search"
              placeholder={t("leads.search")}
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
              <SelectItem value="all">{t("leads.allStatuses")}</SelectItem>
              {Object.entries(statusKeys).map(([value, key]) => (
                <SelectItem key={value} value={value}>
                  {t(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadLeads}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("leads.refresh")}
          </Button>
          <Link href="/leads/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              {t("leads.import")}
            </Button>
          </Link>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" />
              {t("leads.addLead")}
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddLead}>
                <DialogHeader>
                  <DialogTitle>{t("leads.addLeadTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("leads.addLeadDesc")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">{t("leads.firstName")}</Label>
                      <Input
                        id="first_name"
                        value={newLead.first_name}
                        onChange={(e) =>
                          setNewLead({
                            ...newLead,
                            first_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">{t("leads.lastName")}</Label>
                      <Input
                        id="last_name"
                        value={newLead.last_name}
                        onChange={(e) =>
                          setNewLead({
                            ...newLead,
                            last_name: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newLead.email}
                      onChange={(e) =>
                        setNewLead({ ...newLead, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">{t("leads.company")}</Label>
                    <Input
                      id="company"
                      value={newLead.company}
                      onChange={(e) =>
                        setNewLead({ ...newLead, company: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title">{t("leads.jobTitle")}</Label>
                    <Input
                      id="title"
                      value={newLead.title}
                      onChange={(e) =>
                        setNewLead({ ...newLead, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn URL</Label>
                    <Input
                      id="linkedin"
                      value={newLead.linkedin_url}
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          linkedin_url: e.target.value,
                        })
                      }
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit">{t("leads.add")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          <span className="text-sm font-medium">
            {selectedIds.size} {t("leads.selected")}
          </span>
          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
          <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Tag className="mr-2 h-3.5 w-3.5" />
              {t("leads.addTag")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("leads.addTag")}</DialogTitle>
                <DialogDescription>
                  {t("leads.addTagDesc").replace("{count}", String(selectedIds.size))}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">{t("leads.tagName")}</Label>
                  <Input
                    id="tag"
                    placeholder="bijv. Priority, Follow-up, VIP"
                    value={bulkTag}
                    onChange={(e) => setBulkTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBulkTag();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowTagDialog(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleBulkTag} disabled={!bulkTag.trim()}>
                  {t("leads.add")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-3.5 w-3.5" />
            {t("leads.export")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={deleting}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {deleting ? t("leads.deleting") : t("leads.delete")}
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {t("leads.deselect")}
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: t("leads.total"),
            value: leads.length,
            color: "text-neutral-900 dark:text-white",
          },
          {
            label: t("status.new"),
            value: leads.filter((l) => l.status === "new").length,
            color: "text-blue-600",
          },
          {
            label: t("status.contacted"),
            value: leads.filter((l) => l.status === "contacted").length,
            color: "text-yellow-600",
          },
          {
            label: t("status.replied"),
            value: leads.filter((l) => l.status === "replied").length,
            color: "text-green-600",
          },
          {
            label: t("status.meeting_booked"),
            value: leads.filter((l) => l.status === "meeting_booked").length,
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

      {/* Leads Table */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    filteredLeads.length > 0 &&
                    selectedIds.size === filteredLeads.length
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>{t("leads.name")}</TableHead>
              <TableHead>{t("leads.company")}</TableHead>
              <TableHead>{t("leads.jobTitle")}</TableHead>
              <TableHead>{t("leads.status")}</TableHead>
              <TableHead>{t("leads.icpScore")}</TableHead>
              <TableHead>{t("leads.lastActive")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin text-neutral-400" />
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-32 text-center text-neutral-500"
                >
                  {searchQuery
                    ? t("leads.noLeadsSearch")
                    : t("leads.noLeadsEmpty")}
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={`cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                    selectedIds.has(lead.id)
                      ? "bg-neutral-50 dark:bg-neutral-900"
                      : ""
                  }`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium dark:bg-neutral-800">
                        {lead.first_name[0]}
                        {lead.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-neutral-500">{lead.email}</p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell className="text-neutral-500">
                    {lead.title || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[lead.status]}
                    >
                      {t(statusKeys[lead.status])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {lead.icp_score !== null ? (
                      <span
                        className={
                          lead.icp_score >= 70
                            ? "font-medium text-green-600"
                            : "text-neutral-500"
                        }
                      >
                        {lead.icp_score}%
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {lead.last_activity_at
                      ? new Date(lead.last_activity_at).toLocaleDateString(
                          "nl-NL",
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem
                          render={<Link href={`/leads/${lead.id}`} />}
                        >
                          {t("leads.view")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAIResearch(lead.id)}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          {t("leads.research")}
                        </DropdownMenuItem>
                        {lead.linkedin_url && (
                          <DropdownMenuItem
                            render={
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            }
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            LinkedIn
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteSingle(lead.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("leads.delete")}
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
