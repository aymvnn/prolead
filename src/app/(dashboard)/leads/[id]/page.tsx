"use client";

import { useState, useEffect, use } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/hooks/use-org-id";
import type { Lead, LeadNote, LeadTag, LeadStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Globe,
  Sparkles,
  Send,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Tag,
  Pencil,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/language-provider";

// statusLabels moved inside component to use t()

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const { orgId } = useOrgId();

  const statusLabels: Record<LeadStatus, string> = {
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

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline editing
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadLead();
  }, [id]);

  async function loadLead() {
    setLoading(true);

    const [leadResult, notesResult, tagsResult] = await Promise.all([
      supabase.from("leads").select("*").eq("id", id).single(),
      supabase
        .from("lead_notes")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("lead_tags").select("*").eq("lead_id", id),
    ]);

    if (leadResult.data) setLead(leadResult.data);
    if (notesResult.data) setNotes(notesResult.data);
    if (tagsResult.data) setTags(tagsResult.data);

    setLoading(false);
  }

  async function updateStatus(status: string) {
    if (!lead) return;
    const { error } = await supabase
      .from("leads")
      .update({ status })
      .eq("id", lead.id);
    if (error) {
      toast.error(`Kon status niet bijwerken: ${error.message}`);
      return;
    }
    setLead({ ...lead, status: status as LeadStatus });
    toast.success("Status bijgewerkt.");
  }

  async function updateField(field: string, value: string) {
    if (!lead) return;
    const updates: Record<string, unknown> = { [field]: value || null };
    const { error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", lead.id);
    if (error) {
      toast.error(`Kon veld niet opslaan: ${error.message}`);
      return;
    }
    setLead({ ...lead, [field]: value || null });
    setEditing(null);
  }

  async function addNote() {
    if (!newNote.trim() || !lead) return;
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("lead_notes")
      .insert({
        org_id: orgId,
        lead_id: lead.id,
        user_id: user.id,
        content: newNote,
      })
      .select()
      .single();

    if (error || !data) {
      toast.error(`Kon notitie niet opslaan: ${error?.message ?? "onbekende fout"}`);
      return;
    }

    setNotes([data, ...notes]);
    setNewNote("");
    toast.success("Notitie toegevoegd.");
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase
      .from("lead_notes")
      .delete()
      .eq("id", noteId);
    if (error) {
      toast.error(`Kon notitie niet verwijderen: ${error.message}`);
      return;
    }
    setNotes(notes.filter((n) => n.id !== noteId));
  }

  async function addTag() {
    if (!newTag.trim() || !lead) return;
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }
    const trimmed = newTag.trim();

    // Check if tag already exists
    if (tags.some((t) => t.tag === trimmed)) {
      setNewTag("");
      return;
    }

    const { data, error } = await supabase
      .from("lead_tags")
      .insert({ org_id: orgId, lead_id: lead.id, tag: trimmed })
      .select()
      .single();

    if (error || !data) {
      toast.error(`Kon tag niet toevoegen: ${error?.message ?? "onbekende fout"}`);
      return;
    }

    setTags([...tags, data]);
    setNewTag("");
  }

  async function removeTag(tagId: string) {
    const { error } = await supabase.from("lead_tags").delete().eq("id", tagId);
    if (error) {
      toast.error(`Kon tag niet verwijderen: ${error.message}`);
      return;
    }
    setTags(tags.filter((t) => t.id !== tagId));
  }

  async function handleResearch() {
    if (!lead) return;
    setResearching(true);

    try {
      const response = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });

      if (response.ok) {
        await loadLead();
      }
    } finally {
      setResearching(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    setDeleting(true);

    // Parent delete first — CASCADE handles tags, notes, and trigger events.
    // Deleting children first would leave orphaned rows on RLS or FK failure.
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);

    if (error) {
      setDeleting(false);
      toast.error(`Kon lead niet verwijderen: ${error.message}`);
      return;
    }
    toast.success("Lead verwijderd.");
    router.push("/leads");
  }

  function startEdit(field: string, currentValue: string | null) {
    setEditing(field);
    setEditValue(currentValue || "");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center text-neutral-500">{t("leadDetail.notFound")}</div>
    );
  }

  const enrichment = lead.enrichment_data as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">
              {lead.first_name} {lead.last_name}
            </h2>
            <p className="text-neutral-500">
              {lead.title} {t("leadDetail.at")} {lead.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleResearch}
            disabled={researching}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {researching ? t("leadDetail.researching") : t("leads.research")}
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            {t("leadDetail.sendEmail")}
          </Button>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                />
              }
            >
              <Trash2 className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("leadDetail.deleteTitle")}</DialogTitle>
                <DialogDescription>
                  {t("leadDetail.deleteDesc1")} {lead.first_name} {lead.last_name} {t("leadDetail.deleteDesc2")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? t("leadDetail.deleting") : t("leadDetail.deleteConfirm")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Lead Info */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("leadDetail.contactInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <EditableField
                  icon={<Mail className="h-4 w-4 text-neutral-400" />}
                  label={t("leadDetail.email")}
                  value={lead.email}
                  field="email"
                  editing={editing}
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onSave={updateField}
                  onCancel={() => setEditing(null)}
                  onEditValueChange={setEditValue}
                />
                {/* Phone */}
                <EditableField
                  icon={<Phone className="h-4 w-4 text-neutral-400" />}
                  label={t("leadDetail.phone")}
                  value={lead.phone}
                  field="phone"
                  editing={editing}
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onSave={updateField}
                  onCancel={() => setEditing(null)}
                  onEditValueChange={setEditValue}
                />
                {/* Company */}
                <EditableField
                  icon={<Building2 className="h-4 w-4 text-neutral-400" />}
                  label={t("leadDetail.company")}
                  value={lead.company}
                  field="company"
                  editing={editing}
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onSave={updateField}
                  onCancel={() => setEditing(null)}
                  onEditValueChange={setEditValue}
                />
                {/* Title */}
                <EditableField
                  icon={<Briefcase className="h-4 w-4 text-neutral-400" />}
                  label={t("leadDetail.jobTitle")}
                  value={lead.title}
                  field="title"
                  editing={editing}
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onSave={updateField}
                  onCancel={() => setEditing(null)}
                  onEditValueChange={setEditValue}
                />
                {/* Website */}
                <EditableField
                  icon={<Globe className="h-4 w-4 text-neutral-400" />}
                  label={t("leadDetail.website")}
                  value={lead.website}
                  field="website"
                  editing={editing}
                  editValue={editValue}
                  onStartEdit={startEdit}
                  onSave={updateField}
                  onCancel={() => setEditing(null)}
                  onEditValueChange={setEditValue}
                />
                {/* LinkedIn */}
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-4 w-4 text-neutral-400" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-500">LinkedIn</p>
                    {editing === "linkedin_url" ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              updateField("linkedin_url", editValue);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() =>
                            updateField("linkedin_url", editValue)
                          }
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditing(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : lead.linkedin_url ? (
                      <div className="group flex items-center gap-1">
                        <a
                          href={lead.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {t("leadDetail.viewProfile")}
                        </a>
                        <button
                          onClick={() =>
                            startEdit("linkedin_url", lead.linkedin_url)
                          }
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <Pencil className="h-3 w-3 text-neutral-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit("linkedin_url", null)}
                        className="text-sm text-neutral-400 hover:text-neutral-600"
                      >
                        + {t("leadDetail.add")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enrichment Data */}
          {enrichment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Research Data
                </CardTitle>
                <CardDescription>
                  {t("leadDetail.enrichmentDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(enrichment).map(([key, value]) => {
                    if (key === "icp_score") return null;
                    const label = key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase());

                    if (Array.isArray(value)) {
                      return (
                        <div key={key}>
                          <p className="mb-1 text-sm font-medium text-neutral-500">
                            {label}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {value.map((item, i) => (
                              <Badge key={i} variant="secondary">
                                {String(item)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={key}>
                        <p className="text-sm font-medium text-neutral-500">
                          {label}
                        </p>
                        <p className="text-sm">{String(value)}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>{t("leadDetail.notes")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder={t("leadDetail.addNotePlaceholder")}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      addNote();
                    }
                  }}
                />
                <Button onClick={addNote} disabled={!newNote.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Separator />
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-sm text-neutral-500">{t("leadDetail.noNotes")}</p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="group rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm">{note.content}</p>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="ml-2 shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-neutral-100 group-hover:opacity-100 dark:hover:bg-neutral-800"
                        >
                          <X className="h-3 w-3 text-neutral-400" />
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">
                        {new Date(note.created_at).toLocaleString("nl-NL")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("campaignDetail.status")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={lead.status}
                onValueChange={(v) => v && updateStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("leadDetail.icpScore")}</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.icp_score !== null ? (
                <div className="text-center">
                  <span className="text-4xl font-bold">{lead.icp_score}%</span>
                  <p className="mt-1 text-sm text-neutral-500">{t("leadDetail.matchScore")}</p>
                </div>
              ) : (
                <p className="text-center text-sm text-neutral-500">
                  {t("leadDetail.notScoredYet")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tags - with add/remove */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {tags.length === 0 ? (
                  <p className="text-sm text-neutral-500">{t("leadDetail.noTags")}</p>
                ) : (
                  tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {tag.tag}
                      <button
                        onClick={() => removeTag(tag.id)}
                        className="ml-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("leadDetail.addTagPlaceholder")}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={addTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("leadDetail.details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">{t("leadDetail.industry")}</span>
                <span>{lead.industry || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t("leadDetail.employees")}</span>
                <span>{lead.employee_count || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t("leadDetail.source")}</span>
                <span>{lead.source || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t("campaignDetail.added")}</span>
                <span>
                  {new Date(lead.created_at).toLocaleDateString("nl-NL")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t("campaignDetail.lastUpdated")}</span>
                <span>
                  {new Date(lead.updated_at).toLocaleDateString("nl-NL")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Inline editable field component
function EditableField({
  icon,
  label,
  value,
  field,
  editing,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onEditValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  field: string;
  editing: string | null;
  editValue: string;
  onStartEdit: (field: string, value: string | null) => void;
  onSave: (field: string, value: string) => void;
  onCancel: () => void;
  onEditValueChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <p className="text-sm text-neutral-500">{label}</p>
        {editing === field ? (
          <div className="flex items-center gap-1">
            <Input
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="h-7 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave(field, editValue);
                if (e.key === "Escape") onCancel();
              }}
              autoFocus
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onSave(field, editValue)}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onCancel}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="group flex items-center gap-1">
            <p className="font-medium">{value || "-"}</p>
            <button
              onClick={() => onStartEdit(field, value)}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Pencil className="h-3 w-3 text-neutral-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
