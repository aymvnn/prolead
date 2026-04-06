"use client";

import { use, useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Mail,
  Link2,
  Check,
  X,
} from "lucide-react";
import type {
  Sequence,
  SequenceStep,
  EmailTemplate,
  Channel,
} from "@/types/database";
import { useTranslation } from "@/components/language-provider";

// ── Local types ──────────────────────────────

interface SequenceWithCampaign extends Sequence {
  campaigns: { id: string; name: string } | null;
}

interface StepWithTemplate extends SequenceStep {
  template: { id: string; name: string } | null;
}

interface StepFormData {
  channel: Channel;
  delay_days: number;
  delay_hours: number;
  template_id: string;
}

// ── Helpers ──────────────────────────────────

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  draft: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

// statusLabels moved inside component to use t()

// formatDelay moved inside component to use t()

const channelIcon = (channel: Channel) =>
  channel === "email" ? (
    <Mail className="h-3.5 w-3.5" />
  ) : (
    <Link2 className="h-3.5 w-3.5" />
  );

const channelLabel = (channel: Channel) =>
  channel === "email" ? "Email" : "LinkedIn";

const emptyForm: StepFormData = {
  channel: "email",
  delay_days: 0,
  delay_hours: 0,
  template_id: "",
};

// ── Page component ───────────────────────────

export default function SequenceEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = createClient();
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    active: t("common.active"),
    draft: t("common.draft"),
    paused: t("common.paused"),
    completed: t("common.completed"),
  };

  function formatDelay(days: number, hours: number): string {
    if (days === 0 && hours === 0) return `${t("sequenceDetail.day")} 0`;
    const parts: string[] = [];
    if (days > 0) parts.push(`${t("sequenceDetail.day")} ${days}`);
    if (hours > 0) parts.push(`${hours} ${t("sequenceDetail.hour")}`);
    return parts.join(" + ");
  }

  // ── State ──
  const [sequence, setSequence] = useState<SequenceWithCampaign | null>(null);
  const [steps, setSteps] = useState<StepWithTemplate[]>([]);
  const [templates, setTemplates] = useState<Pick<EmailTemplate, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  // Step dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<StepWithTemplate | null>(null);
  const [form, setForm] = useState<StepFormData>({ ...emptyForm });

  // ── Data loading ──

  const loadData = useCallback(async () => {
    setLoading(true);
    const [seqResult, stepsResult, tplResult] = await Promise.all([
      supabase
        .from("sequences")
        .select("*, campaigns(id, name)")
        .eq("id", id)
        .single(),
      supabase
        .from("sequence_steps")
        .select("*, template:email_templates(id, name)")
        .eq("sequence_id", id)
        .order("step_number"),
      supabase.from("email_templates").select("id, name"),
    ]);

    if (seqResult.data) setSequence(seqResult.data as SequenceWithCampaign);
    if (stepsResult.data) setSteps(stepsResult.data as StepWithTemplate[]);
    if (tplResult.data) setTemplates(tplResult.data);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Name editing ──

  function startEditingName() {
    if (!sequence) return;
    setNameDraft(sequence.name);
    setEditingName(true);
  }

  async function saveName() {
    if (!sequence || !nameDraft.trim()) return;
    await supabase
      .from("sequences")
      .update({ name: nameDraft.trim() })
      .eq("id", id);
    setSequence({ ...sequence, name: nameDraft.trim() });
    setEditingName(false);
  }

  function cancelEditingName() {
    setEditingName(false);
  }

  // ── Step dialog helpers ──

  function openAddDialog() {
    setEditingStep(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEditDialog(step: StepWithTemplate) {
    setEditingStep(step);
    setForm({
      channel: step.channel,
      delay_days: step.delay_days,
      delay_hours: step.delay_hours,
      template_id: step.template_id ?? "",
    });
    setDialogOpen(true);
  }

  // ── Step CRUD ──

  async function handleSaveStep(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingStep) {
      // Update existing step
      await fetch(`/api/sequences/${id}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: editingStep.id,
          channel: form.channel,
          delay_days: form.delay_days,
          delay_hours: form.delay_hours,
          template_id: form.template_id || null,
        }),
      });
    } else {
      // Create new step
      const nextStepNumber =
        steps.length > 0 ? Math.max(...steps.map((s) => s.step_number)) + 1 : 1;

      await fetch(`/api/sequences/${id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_number: nextStepNumber,
          channel: form.channel,
          delay_days: form.delay_days,
          delay_hours: form.delay_hours,
          template_id: form.template_id || null,
        }),
      });
    }

    setSaving(false);
    setDialogOpen(false);
    await loadData();
  }

  async function handleDeleteStep(stepId: string) {
    if (!confirm(t("sequenceDetail.confirmDeleteStep"))) return;

    await fetch(`/api/sequences/${id}/steps?step_id=${stepId}`, {
      method: "DELETE",
    });

    await loadData();
  }

  // ── Render ─────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="space-y-4">
        <Link href="/sequences">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("sequenceDetail.back")}
          </Button>
        </Link>
        <p className="text-center text-neutral-500">{t("sequenceDetail.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/sequences">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0">
            {/* Editable name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="h-8 w-64 bg-white text-lg font-semibold dark:bg-neutral-950"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") cancelEditingName();
                  }}
                />
                <Button variant="ghost" size="icon-sm" onClick={saveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={cancelEditingName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={startEditingName}
                className="group flex items-center gap-2 text-left"
              >
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {sequence.name}
                </h1>
                <Pencil className="h-3.5 w-3.5 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}

            {/* Campaign link */}
            {sequence.campaigns && (
              <Link
                href="/campaigns"
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {sequence.campaigns.name}
              </Link>
            )}
          </div>
        </div>

        {/* Status badge */}
        <Badge
          variant="secondary"
          className={statusColors[sequence.status] || statusColors.draft}
        >
          {statusLabels[sequence.status] || sequence.status}
        </Badge>
      </div>

      {/* ── Steps timeline ── */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-6 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {t("sequenceDetail.stepsCount")} ({steps.length})
        </h2>

        {steps.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-neutral-400">
            <Mail className="h-10 w-10" />
            <p className="text-sm">
              {t("sequenceDetail.noStepsYet")}
            </p>
          </div>
        ) : (
          <div className="relative">
            {steps.map((step, idx) => (
              <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
                {/* Vertical timeline line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />
                )}

                {/* Step circle indicator */}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 bg-white text-xs font-semibold text-neutral-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                  {step.step_number}
                </div>

                {/* Step content card */}
                <div className="flex flex-1 items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Channel badge */}
                    <Badge
                      variant="outline"
                      className="gap-1"
                    >
                      {channelIcon(step.channel)}
                      {channelLabel(step.channel)}
                    </Badge>

                    {/* Delay */}
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formatDelay(step.delay_days, step.delay_hours)}
                    </span>

                    {/* Template name */}
                    {step.template && (
                      <Badge variant="secondary" className="max-w-48 truncate">
                        {step.template.name}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(step)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add step button */}
        <div className="mt-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button variant="outline" />} onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t("sequences.addStep")}
            </DialogTrigger>

            <DialogContent>
              <form onSubmit={handleSaveStep}>
                <DialogHeader>
                  <DialogTitle>
                    {editingStep ? t("sequenceDetail.editStep") : t("sequences.addStep")}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStep
                      ? `${t("sequenceDetail.editStepDesc")} ${editingStep.step_number}`
                      : t("sequenceDetail.addStepDesc")}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* Step number (read-only info) */}
                  <div className="space-y-2">
                    <Label>{t("sequenceDetail.step")}</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {editingStep
                        ? `${t("sequenceDetail.step")} ${editingStep.step_number}`
                        : `${t("sequenceDetail.step")} ${steps.length + 1}`}
                    </p>
                  </div>

                  {/* Channel */}
                  <div className="space-y-2">
                    <Label>{t("sequences.channel")}</Label>
                    <Select
                      value={form.channel}
                      onValueChange={(v) =>
                        v && setForm({ ...form, channel: v as Channel })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("sequenceDetail.selectChannel")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <Mail className="mr-2 h-4 w-4" />
                          Email
                        </SelectItem>
                        <SelectItem value="linkedin">
                          <Link2 className="mr-2 h-4 w-4" />
                          LinkedIn
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delay */}
                  <div className="space-y-2">
                    <Label>{t("sequences.delay")}</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="mb-1 text-xs text-neutral-500">
                          {t("newCampaign.days")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={form.delay_days}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              delay_days: parseInt(e.target.value) || 0,
                            })
                          }
                          className="bg-white dark:bg-neutral-950"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="mb-1 text-xs text-neutral-500">
                          {t("newCampaign.hours")}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={form.delay_hours}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              delay_hours: parseInt(e.target.value) || 0,
                            })
                          }
                          className="bg-white dark:bg-neutral-950"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Template */}
                  <div className="space-y-2">
                    <Label>{t("sequenceDetail.template")}</Label>
                    <Select
                      value={form.template_id}
                      onValueChange={(v) =>
                        v && setForm({ ...form, template_id: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("sequenceDetail.selectTemplate")} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {editingStep ? t("common.save") : t("sequenceDetail.add")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
