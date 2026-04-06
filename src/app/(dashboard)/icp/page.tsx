"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ICPProfile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Target,
  Save,
  Sparkles,
  Plus,
  X,
  Building2,
  Users,
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Globe,
  RefreshCw,
  Check,
  Trash2,
  FileText,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

export default function ICPPage() {
  const { t } = useTranslation();
  // ICP profiles list
  const [profiles, setProfiles] = useState<ICPProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ICPProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  // Form state
  const [industries, setIndustries] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [minEmployees, setMinEmployees] = useState(10);
  const [maxEmployees, setMaxEmployees] = useState(500);
  const [region, setRegion] = useState("benelux");
  const [language, setLanguage] = useState("nl");
  const [description, setDescription] = useState("");

  // Input fields
  const [newIndustry, setNewIndustry] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPainPoint, setNewPainPoint] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("icp_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProfiles(data);
      // Load the active profile or the first one
      const active = data.find((p: ICPProfile) => p.is_active) || data[0];
      if (active) {
        loadProfileIntoForm(active);
      }
    }
    setLoading(false);
  }

  function loadProfileIntoForm(profile: ICPProfile) {
    setActiveProfile(profile);
    const c = profile.criteria || {};
    setIndustries(c.industries || []);
    setTitles(c.titles || []);
    setPainPoints(c.pain_points || []);
    setLocations(c.locations || []);
    setMinEmployees(c.company_sizes?.min || 10);
    setMaxEmployees(c.company_sizes?.max || 500);
    setDescription(profile.description || "");
    // Parse region/language from locations if available
    if (c.locations?.includes("Benelux")) setRegion("benelux");
    else if (c.locations?.includes("Nederland")) setRegion("nl");
    else if (c.locations?.includes("DACH")) setRegion("dach");
    else if (c.locations?.includes("Europa")) setRegion("europe");
    else if (c.locations?.includes("Wereldwijd")) setRegion("global");
  }

  function buildCriteria() {
    const regionMap: Record<string, string> = {
      nl: "Nederland",
      benelux: "Benelux",
      dach: "DACH",
      europe: "Europa",
      global: "Wereldwijd",
    };

    return {
      industries,
      company_sizes: { min: minEmployees, max: maxEmployees },
      titles,
      locations: [regionMap[region] || region],
      pain_points: painPoints,
    };
  }

  function buildDescription() {
    const parts = [];
    if (industries.length > 0)
      parts.push(`Industrieën: ${industries.join(", ")}`);
    parts.push(`Bedrijfsgrootte: ${minEmployees}-${maxEmployees} medewerkers`);
    if (titles.length > 0) parts.push(`Functietitels: ${titles.join(", ")}`);
    if (painPoints.length > 0)
      parts.push(`Pijnpunten: ${painPoints.join("; ")}`);
    if (description) parts.push(`Waardepropositie: ${description}`);
    return parts.join("\n");
  }

  async function handleSave() {
    setSaving(true);
    const criteria = buildCriteria();
    const desc = buildDescription();

    if (activeProfile) {
      // Update existing
      const { error } = await supabase
        .from("icp_profiles")
        .update({
          criteria,
          description: desc,
        })
        .eq("id", activeProfile.id);

      if (!error) {
        await loadProfiles();
      }
    }
    setSaving(false);
  }

  async function handleCreateProfile() {
    if (!newProfileName.trim()) return;
    setSaving(true);

    const criteria = buildCriteria();
    const desc = buildDescription();

    // Deactivate other profiles
    await supabase
      .from("icp_profiles")
      .update({ is_active: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    const { data, error } = await supabase
      .from("icp_profiles")
      .insert({
        name: newProfileName.trim(),
        criteria,
        description: desc,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setShowNewDialog(false);
      setNewProfileName("");
      await loadProfiles();
    }
    setSaving(false);
  }

  async function handleSetActive(profileId: string) {
    await supabase
      .from("icp_profiles")
      .update({ is_active: false })
      .neq("id", profileId);

    await supabase
      .from("icp_profiles")
      .update({ is_active: true })
      .eq("id", profileId);

    await loadProfiles();
  }

  async function handleDeleteProfile(profileId: string) {
    if (!confirm("Weet je zeker dat je dit ICP profiel wilt verwijderen?")) return;

    await supabase.from("icp_profiles").delete().eq("id", profileId);
    await loadProfiles();
  }

  function addTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput("");
  }

  function removeTag(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
  ) {
    setList(list.filter((item) => item !== value));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Target className="h-5 w-5" />
            {t("icp.title")}
          </h1>
          <p className="text-sm text-neutral-500">
            {t("icp.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger render={<Button variant="outline" />}>
              <Plus className="mr-2 h-4 w-4" />
              {t("icp.newProfile")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("icp.newProfileTitle")}</DialogTitle>
                <DialogDescription>
                  {t("icp.newProfileDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="profile_name">{t("icp.profileName")}</Label>
                  <Input
                    id="profile_name"
                    placeholder="bijv. SaaS Founders Benelux"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateProfile();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowNewDialog(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim() || saving}
                >
                  {saving ? t("common.loading") : t("common.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} disabled={saving || !activeProfile}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>

      {/* Profile Selector */}
      {profiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className={`group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                activeProfile?.id === profile.id
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
              }`}
            >
              <button
                onClick={() => loadProfileIntoForm(profile)}
                className="flex items-center gap-2"
              >
                <FileText className="h-3.5 w-3.5" />
                {profile.name}
                {profile.is_active && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {t("common.active")}
                  </Badge>
                )}
              </button>
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!profile.is_active && (
                  <button
                    onClick={() => handleSetActive(profile.id)}
                    className="rounded p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    title="Activeren"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteProfile(profile.id)}
                  className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900"
                  title="Verwijderen"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No profiles message */}
      {profiles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="mb-4 h-12 w-12 text-neutral-300" />
            <h3 className="mb-2 text-lg font-medium">{t("icp.noProfiles")}</h3>
            <p className="mb-4 text-sm text-neutral-500">
              {t("icp.noProfilesDesc")}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Industries */}
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              {t("icp.industries")}
            </CardTitle>
            <CardDescription>
              {t("icp.industriesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <Badge
                  key={industry}
                  variant="secondary"
                  className="gap-1 pr-1"
                >
                  {industry}
                  <button
                    onClick={() =>
                      removeTag(industry, industries, setIndustries)
                    }
                    className="ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("icp.addIndustry")}
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(
                      newIndustry,
                      industries,
                      setIndustries,
                      setNewIndustry,
                    );
                  }
                }}
                className="bg-white dark:bg-neutral-950"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  addTag(
                    newIndustry,
                    industries,
                    setIndustries,
                    setNewIndustry,
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Company Size */}
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              {t("icp.companySize")}
            </CardTitle>
            <CardDescription>
              {t("icp.companySizeDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("icp.minEmployees")}</Label>
                <Input
                  type="number"
                  value={minEmployees}
                  onChange={(e) => setMinEmployees(parseInt(e.target.value) || 0)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("icp.maxEmployees")}</Label>
                <Input
                  type="number"
                  value={maxEmployees}
                  onChange={(e) => setMaxEmployees(parseInt(e.target.value) || 0)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Titles */}
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4" />
              {t("icp.titles")}
            </CardTitle>
            <CardDescription>
              {t("icp.titlesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {titles.map((title) => (
                <Badge key={title} variant="secondary" className="gap-1 pr-1">
                  {title}
                  <button
                    onClick={() => removeTag(title, titles, setTitles)}
                    className="ml-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("icp.addTitle")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(newTitle, titles, setTitles, setNewTitle);
                  }
                }}
                className="bg-white dark:bg-neutral-950"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => addTag(newTitle, titles, setTitles, setNewTitle)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Geography */}
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              {t("icp.geography")}
            </CardTitle>
            <CardDescription>
              {t("icp.geographyDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("icp.regions")}</Label>
              <Select value={region} onValueChange={(v) => v && setRegion(v)}>
                <SelectTrigger className="bg-white dark:bg-neutral-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">{t("icp.regionNl")}</SelectItem>
                  <SelectItem value="benelux">{t("icp.regionBenelux")}</SelectItem>
                  <SelectItem value="dach">{t("icp.regionDach")}</SelectItem>
                  <SelectItem value="europe">{t("icp.regionEurope")}</SelectItem>
                  <SelectItem value="global">{t("icp.regionGlobal")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("icp.languages")}</Label>
              <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
                <SelectTrigger className="bg-white dark:bg-neutral-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nl">{t("icp.langNl")}</SelectItem>
                  <SelectItem value="en">{t("icp.langEn")}</SelectItem>
                  <SelectItem value="de">{t("icp.langDe")}</SelectItem>
                  <SelectItem value="fr">{t("icp.langFr")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Pain Points */}
        <Card className="border-neutral-200 bg-white lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              {t("icp.painPoints")}
            </CardTitle>
            <CardDescription>
              {t("icp.painPointsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {painPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
                >
                  <span className="text-sm">{point}</span>
                  <button
                    onClick={() =>
                      removeTag(point, painPoints, setPainPoints)
                    }
                    className="rounded-full p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <X className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("icp.addPainPoint")}
                value={newPainPoint}
                onChange={(e) => setNewPainPoint(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(
                      newPainPoint,
                      painPoints,
                      setPainPoints,
                      setNewPainPoint,
                    );
                  }
                }}
                className="bg-white dark:bg-neutral-950"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  addTag(
                    newPainPoint,
                    painPoints,
                    setPainPoints,
                    setNewPainPoint,
                  )
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Value Proposition */}
        <Card className="border-neutral-200 bg-white lg:col-span-2 dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              {t("icp.valueProposition")}
            </CardTitle>
            <CardDescription>
              {t("icp.valuePropositionDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="bijv. Wij helpen B2B SaaS-bedrijven hun outbound sales te automatiseren met AI-gepersonaliseerde emails..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-white dark:bg-neutral-950"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
