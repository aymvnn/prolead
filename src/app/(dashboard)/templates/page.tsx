"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useOrgId } from "@/hooks/use-org-id";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { EmailTemplate } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Pencil,
  Trash2,
  Star,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

export default function TemplatesPage() {
  const { t } = useTranslation();
  const { orgId } = useOrgId();
  const confirm = useConfirm();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Alle");

  // Create/Edit dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTemplates(data as EmailTemplate[]);
    }
    setLoading(false);
  }

  // Extract variables like {first_name} from template text
  function extractVariables(text: string): string[] {
    const matches = text.match(/\{(\w+)\}/g);
    if (!matches) return [];
    return [...new Set(matches)];
  }

  // Unique categories from loaded templates
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of templates) {
      if (t.category) cats.add(t.category);
    }
    return ["Alle", ...Array.from(cats).sort()];
  }, [templates]);

  const filtered = templates.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "Alle" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  function openCreateDialog() {
    setEditingId(null);
    setFormName("");
    setFormSubject("");
    setFormBody("");
    setFormCategory("");
    setShowDialog(true);
  }

  function openEditDialog(template: EmailTemplate) {
    setEditingId(template.id);
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormBody(template.body);
    setFormCategory(template.category ?? "");
    setShowDialog(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formSubject.trim() || !formBody.trim()) return;
    if (!orgId) {
      toast.error("No organization found. Please sign in again.");
      return;
    }

    setSaving(true);

    const variables = extractVariables(formSubject + " " + formBody);
    const payload = {
      name: formName.trim(),
      subject: formSubject.trim(),
      body: formBody.trim(),
      variables,
      category: formCategory.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("email_templates")
        .update(payload)
        .eq("id", editingId);
      setSaving(false);
      if (error) {
        toast.error(`Kon template niet opslaan: ${error.message}`);
        return;
      }
      toast.success("Template opgeslagen.");
      setShowDialog(false);
      loadTemplates();
    } else {
      // New templates MUST carry org_id — RLS rejects inserts without it.
      const { error } = await supabase
        .from("email_templates")
        .insert({ ...payload, org_id: orgId });
      setSaving(false);
      if (error) {
        toast.error(`Kon template niet aanmaken: ${error.message}`);
        return;
      }
      toast.success("Template aangemaakt.");
      setShowDialog(false);
      loadTemplates();
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Template verwijderen?",
      description: "Deze actie kan niet ongedaan worden gemaakt.",
      confirmLabel: "Verwijderen",
      tone: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(`Kon template niet verwijderen: ${error.message}`);
      return;
    }
    toast.success("Template verwijderd.");
    if (editingId === id) setShowDialog(false);
    loadTemplates();
  }

  const previewVariables = useMemo(() => {
    return extractVariables(formSubject + " " + formBody);
  }, [formSubject, formBody]);

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            placeholder={t("templates.search")}
            className="w-72 bg-white pl-9 dark:bg-neutral-950"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger
            render={<Button />}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("templates.new")}
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? t("templates.editTitle") : t("templates.new")}
                </DialogTitle>
                <DialogDescription>
                  Gebruik variabelen zoals {"{first_name}"}, {"{company}"},{" "}
                  {"{title}"} in je template.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tpl-name">{t("templates.name")}</Label>
                  <Input
                    id="tpl-name"
                    placeholder="Bijv. Koude introductie"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-category">{t("templates.category")}</Label>
                  <Input
                    id="tpl-category"
                    placeholder="Bijv. Introductie, Follow-up"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-subject">{t("templates.subject")}</Label>
                  <Input
                    id="tpl-subject"
                    placeholder="Hoi {first_name}, even voorstellen"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tpl-body">{t("templates.body")}</Label>
                  <Textarea
                    id="tpl-body"
                    placeholder="Schrijf hier je email template..."
                    rows={6}
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    required
                  />
                </div>
                {previewVariables.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-neutral-500">
                      {t("templates.foundVariables")}:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {previewVariables.map((v) => (
                        <Badge
                          key={v}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button type="submit" disabled={saving}>
                  {saving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingId ? t("common.save") : t("common.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "Alle" ? t("templates.all") : cat}
          </Button>
        ))}
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          <span className="ml-3 text-neutral-500">{t("common.loading")}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-300 bg-white py-16 text-center dark:border-neutral-700 dark:bg-neutral-950">
          <FileText className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <div>
            <p className="font-medium text-neutral-600 dark:text-neutral-400">
              {t("templates.noTemplates")}
            </p>
            <p className="text-sm text-neutral-400">
              {searchQuery
                ? t("templates.tryDifferentSearch")
                : t("templates.createFirst")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const vars = extractVariables(
              template.subject + " " + template.body,
            );
            const perf = (template.performance_stats ?? {}) as {
              open_rate?: number;
              reply_rate?: number;
              uses?: number;
            };
            return (
              <Card
                key={template.id}
                className="border-neutral-200 bg-white transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {template.subject}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(template)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("templates.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("templates.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="line-clamp-2 text-xs text-neutral-500">
                    {template.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {template.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {template.category}
                      </Badge>
                    )}
                    {vars.map((v) => (
                      <Badge
                        key={v}
                        variant="secondary"
                        className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      >
                        {v}
                      </Badge>
                    ))}
                  </div>
                  {perf.uses !== undefined && (
                    <span className="text-[10px] text-neutral-400">
                      {perf.uses}x gebruikt
                    </span>
                  )}
                  <div className="flex items-center gap-4 border-t border-neutral-100 pt-2 dark:border-neutral-800">
                    <div className="text-center">
                      <p className="text-xs font-semibold">
                        {perf.open_rate !== undefined
                          ? `${perf.open_rate}%`
                          : "-"}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        Open rate
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-green-600">
                        {perf.reply_rate !== undefined
                          ? `${perf.reply_rate}%`
                          : "-"}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        Reply rate
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
