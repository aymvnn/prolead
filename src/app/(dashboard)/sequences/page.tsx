"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  MoreHorizontal,
  GitBranch,
  Pencil,
  Trash2,
  RefreshCw,
  Play,
  Pause,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

interface SequenceRow {
  id: string;
  name: string;
  steps_count: number;
  status: string;
  created_at: string;
  campaign_id: string;
  campaigns: { id: string; name: string } | null;
}

const statusColors: Record<string, string> = {
  active:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  draft:
    "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  paused:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export default function SequencesPage() {
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    active: t("common.active"),
    draft: t("common.draft"),
    paused: t("common.paused"),
    completed: t("common.completed"),
  };

  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [campaigns, setCampaigns] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSequence, setNewSequence] = useState({
    name: "",
    campaign_id: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [seqResult, campResult] = await Promise.all([
      supabase
        .from("sequences")
        .select("*, campaigns(id, name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("campaigns")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    if (seqResult.data) setSequences(seqResult.data as SequenceRow[]);
    if (campResult.data) setCampaigns(campResult.data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSequence.name.trim() || !newSequence.campaign_id) return;

    const { error } = await supabase.from("sequences").insert({
      name: newSequence.name.trim(),
      campaign_id: newSequence.campaign_id,
      status: "draft",
      steps_count: 0,
    });

    if (!error) {
      setShowCreateDialog(false);
      setNewSequence({ name: "", campaign_id: "" });
      await loadData();
    }
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("sequences").update({ status }).eq("id", id);
    await loadData();
  }

  async function deleteSequence(id: string) {
    if (!confirm("Weet je zeker dat je deze sequence wilt verwijderen?"))
      return;

    await supabase.from("sequence_steps").delete().eq("sequence_id", id);
    await supabase.from("sequences").delete().eq("id", id);
    await loadData();
  }

  const filtered = sequences.filter(
    (s) =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            placeholder={t("sequences.search")}
            className="w-72 bg-white pl-9 dark:bg-neutral-950"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            {t("sequences.new")}
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>{t("sequences.new")}</DialogTitle>
                <DialogDescription>
                  {t("sequences.newDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="seq_name">{t("sequences.name")}</Label>
                  <Input
                    id="seq_name"
                    placeholder="bijv. SaaS Intro + 3 Follow-ups"
                    value={newSequence.name}
                    onChange={(e) =>
                      setNewSequence({ ...newSequence, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("sequences.campaign")}</Label>
                  {campaigns.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      {t("sequences.noCampaigns")}{" "}
                      <Link
                        href="/campaigns/new"
                        className="text-blue-600 hover:underline"
                      >
                        Campaigns
                      </Link>
                      .
                    </p>
                  ) : (
                    <Select
                      value={newSequence.campaign_id}
                      onValueChange={(v) =>
                        v && setNewSequence({ ...newSequence, campaign_id: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("sequences.selectCampaign")} />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !newSequence.name.trim() || !newSequence.campaign_id
                  }
                >
                  {t("common.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sequences Table */}
      <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sequences.sequence")}</TableHead>
              <TableHead>{t("sequences.steps")}</TableHead>
              <TableHead>{t("sequences.campaign")}</TableHead>
              <TableHead>{t("sequences.status")}</TableHead>
              <TableHead>{t("sequences.created")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin text-neutral-400" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-neutral-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <GitBranch className="h-8 w-8 text-neutral-300 dark:text-neutral-600" />
                    <p>
                      {searchQuery
                        ? t("sequences.noResults")
                        : t("sequences.empty")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((seq) => (
                <TableRow
                  key={seq.id}
                  className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">{seq.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {seq.steps_count} {t("sequences.stepsLabel")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {seq.campaigns ? (
                      <Link
                        href={`/campaigns`}
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {seq.campaigns.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-neutral-400">
                        {t("sequences.notLinked")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        statusColors[seq.status] || statusColors.draft
                      }
                    >
                      {statusLabels[seq.status] || seq.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">
                    {new Date(seq.created_at).toLocaleDateString("nl-NL")}
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
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        {seq.status === "draft" || seq.status === "paused" ? (
                          <DropdownMenuItem
                            onClick={() => updateStatus(seq.id, "active")}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {t("campaigns.activate")}
                          </DropdownMenuItem>
                        ) : seq.status === "active" ? (
                          <DropdownMenuItem
                            onClick={() => updateStatus(seq.id, "paused")}
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            {t("campaigns.pause")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteSequence(seq.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("common.delete")}
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
