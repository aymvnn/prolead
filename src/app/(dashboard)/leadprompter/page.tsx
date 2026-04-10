"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Copy,
  Check,
  Target,
  Building2,
  Users,
  Briefcase,
  Globe,
  AlertTriangle,
  Loader2,
  Info,
  ArrowRight,
  Upload,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

export default function LeadPrompterPage() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<ICPProfile[]>([]);
  const [campaigns, setCampaigns] = useState<
    { id: string; name: string; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  // User inputs
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [companyName, setCompanyName] = useState("ASSET+ Fleet Solutions");
  const [companyWebsite, setCompanyWebsite] = useState("assetplusgcc.com");
  const [productDescription, setProductDescription] = useState(
    "ELC Double Deck Trailers — fabrieksvernieuwde dubbeldeks opleggers van Burgers Carrosserie (NL). 55 europallets per trailer, 35% brandstofbesparing per pallet, 40% CO2 reductie. Voldoet aan UAE Cabinet Resolution No. 138.",
  );
  const [targetRegions, setTargetRegions] = useState(
    "UAE, Saudi Arabia, Oman, Kuwait, Bahrain, Qatar (GCC)",
  );
  const [leadCount, setLeadCount] = useState(50);
  const [language, setLanguage] = useState("en");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [copied, setCopied] = useState(false);

  // Direct CSV paste state
  const [csvText, setCsvText] = useState("");
  const [parsedLeads, setParsedLeads] = useState<
    { data: Record<string, string>; valid: boolean; errors: string[] }[]
  >([]);
  const [showParsed, setShowParsed] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    errors: string[];
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [profilesRes, campaignsRes] = await Promise.all([
      supabase
        .from("icp_profiles")
        .select("*")
        .order("is_active", { ascending: false }),
      supabase
        .from("campaigns")
        .select("id, name, status")
        .order("created_at", { ascending: false }),
    ]);

    if (profilesRes.data) {
      setProfiles(profilesRes.data);
      const active = profilesRes.data.find((p) => p.is_active);
      if (active) setSelectedProfileId(active.id);
    }
    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    setLoading(false);
  }

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  const generatedPrompt = useMemo(() => {
    const criteria = selectedProfile?.criteria || {};
    const industries = criteria.industries || [];
    const titles = criteria.titles || [];
    const painPoints = criteria.pain_points || [];
    const locations = criteria.locations || [];
    const companySize = criteria.company_sizes || {};

    return `# Lead Research Opdracht

## Over mijn bedrijf
**Bedrijf:** ${companyName}
**Website:** ${companyWebsite}
**Product/Dienst:** ${productDescription}

## Wat ik zoek
Ik heb **${leadCount} B2B leads** nodig die passen bij het volgende Ideal Customer Profile (ICP).

## ICP Criteria
${selectedProfile ? `**Profiel:** ${selectedProfile.name}` : ""}
${industries.length > 0 ? `**Industrieen:** ${industries.join(", ")}` : ""}
${titles.length > 0 ? `**Functietitels (beslissers):** ${titles.join(", ")}` : ""}
${locations.length > 0 ? `**Locaties:** ${locations.join(", ")}` : ""}
${targetRegions ? `**Doelregio's:** ${targetRegions}` : ""}
${companySize.min || companySize.max ? `**Bedrijfsgrootte:** ${companySize.min || "?"}-${companySize.max || "?"} medewerkers` : ""}
${painPoints.length > 0 ? `**Pain points die ons product oplost:**\n${painPoints.map((p: string) => `- ${p}`).join("\n")}` : ""}
${selectedProfile?.description ? `\n**Aanvullende context:**\n${selectedProfile.description}` : ""}
${extraInstructions ? `\n**Extra instructies:**\n${extraInstructions}` : ""}

## Rangschikking (BELANGRIJK)
Rangschik ALLE leads van **WARM naar KOUD** op basis van:
1. **Warm (score 80-100):** Bedrijf heeft duidelijke behoefte aan ons product, beslisser is direct bereikbaar, recent relevant nieuws (bijv. fleet uitbreiding, duurzaamheidsinitiatieven, groei)
2. **Medium (score 50-79):** Bedrijf past bij ICP maar geen directe trigger, wel de juiste industrie en grootte
3. **Koud (score 20-49):** Bedrijf zou kunnen passen maar minder duidelijke match, verkennend contact

## Output Format
Lever de leads aan als een **CSV tabel** met EXACT deze kolommen (voor directe import in PROLEAD):

\`\`\`
first_name,last_name,email,company,title,linkedin_url,phone,website,industry,icp_score
\`\`\`

**Per lead moet je opleveren:**
- **first_name** — Voornaam van de contactpersoon
- **last_name** — Achternaam
- **email** — Zakelijk emailadres (probeer het echte adres te vinden, niet info@)
- **company** — Bedrijfsnaam
- **title** — Functietitel (bijv. Fleet Manager, Logistics Director)
- **linkedin_url** — LinkedIn profiel URL (als vindbaar)
- **phone** — Zakelijk telefoonnummer (als vindbaar)
- **website** — Bedrijfswebsite
- **industry** — Industrie/sector
- **icp_score** — Score 0-100 (hoe warm de lead is, 100 = warmst)

## Taal
Zoek leads die ${language === "en" ? "Engels" : language === "ar" ? "Arabisch en/of Engels" : "de lokale taal"} spreken.

## Kwaliteitseisen
- Alleen **B2B leads** — geen consumenten
- Alleen **beslissers of beïnvloeders** — geen junior medewerkers
- **Echte bedrijven** met een online aanwezigheid (website of LinkedIn)
- **Geen duplicaten** — elk bedrijf maximaal 1-2 contactpersonen
- Sorteer de CSV van hoog naar laag op icp_score (warmst bovenaan)
- Geef bij elke lead een realistische icp_score (niet allemaal 90+)

## Voorbeeld
\`\`\`csv
first_name,last_name,email,company,title,linkedin_url,phone,website,industry,icp_score
Ahmed,Al-Rashid,ahmed@agility.com,Agility Logistics,Fleet Director,https://linkedin.com/in/ahmed-rashid,+971501234567,agility.com,Logistics & Transportation,92
\`\`\`

Zoek nu ${leadCount} leads die aan bovenstaande criteria voldoen. Begin met de warmste leads.`;
  }, [
    selectedProfile,
    companyName,
    companyWebsite,
    productDescription,
    targetRegions,
    leadCount,
    language,
    extraInstructions,
  ]);

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const CSV_COLUMNS = [
    "first_name",
    "last_name",
    "email",
    "company",
    "title",
    "linkedin_url",
    "phone",
    "website",
    "industry",
    "icp_score",
  ];
  const REQUIRED_COLUMNS = ["first_name", "last_name", "email", "company"];

  function handleParseCSV() {
    setImportResult(null);
    const lines = csvText
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setParsedLeads([]);
      setShowParsed(true);
      return;
    }

    // Detect header row
    const headerLine = lines[0].toLowerCase();
    const hasHeader = headerLine.includes("first_name") || headerLine.includes("email");
    const headers = hasHeader
      ? lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
      : CSV_COLUMNS;
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const parsed = dataLines.map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const data: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (CSV_COLUMNS.includes(h)) {
          data[h] = values[i] || "";
        }
      });

      const errors: string[] = [];
      for (const req of REQUIRED_COLUMNS) {
        if (!data[req]) errors.push(req);
      }
      // Basic email validation
      if (data.email && !data.email.includes("@")) {
        errors.push("email (invalid)");
      }

      return { data, valid: errors.length === 0, errors };
    });

    setParsedLeads(parsed);
    setShowParsed(true);
  }

  const validLeads = parsedLeads.filter((l) => l.valid);
  const invalidLeads = parsedLeads.filter((l) => !l.valid);

  async function handleImportLeads() {
    if (validLeads.length === 0) return;
    setImporting(true);
    setImportResult(null);

    try {
      const rows = validLeads.map((l) => ({
        first_name: l.data.first_name,
        last_name: l.data.last_name,
        email: l.data.email,
        company: l.data.company,
        title: l.data.title || null,
        linkedin_url: l.data.linkedin_url || null,
        phone: l.data.phone || null,
        website: l.data.website || null,
        industry: l.data.industry || null,
        icp_score: l.data.icp_score ? parseInt(l.data.icp_score, 10) || null : null,
        status: "new" as const,
      }));

      const { error } = await supabase.from("leads").insert(rows);

      if (error) {
        setImportResult({
          success: false,
          count: 0,
          errors: [error.message],
        });
      } else {
        setImportResult({
          success: true,
          count: rows.length,
          errors: [],
        });
        setCsvText("");
        setParsedLeads([]);
        setShowParsed(false);
      }
    } catch (err) {
      setImportResult({
        success: false,
        count: 0,
        errors: [(err as Error).message],
      });
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("prompter.title")}
        </h1>
        <p className="text-sm text-neutral-500">
          {t("prompter.desc")}
        </p>
      </div>

      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-300">
              {t("prompter.howItWorks")}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-blue-800 dark:text-blue-400">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                {t("prompter.step1")}
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                {t("prompter.step2")}
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                {t("prompter.step3")}
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                {t("prompter.step4")}
              </Badge>
            </div>
            <p className="text-blue-700 dark:text-blue-400">
              Claude levert een CSV op die je direct kunt importeren in
              PROLEAD. Leads worden automatisch gesorteerd van warm naar koud.
              PROLEAD verstuurt dan eerst de warmste leads (max 100/dag).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Configuration */}
        <div className="space-y-4">
          <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <CardHeader>
              <CardTitle className="text-sm">{t("prompter.config")}</CardTitle>
              <CardDescription>
                {t("prompter.configDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ICP Profile */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  {t("prompter.icpProfile")}
                </Label>
                <Select
                  value={selectedProfileId}
                  onValueChange={(v) => v && setSelectedProfileId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer ICP profiel" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.is_active && " (actief)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProfile && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(selectedProfile.criteria?.industries || []).map(
                      (ind: string) => (
                        <Badge key={ind} variant="secondary" className="text-[10px]">
                          <Building2 className="mr-1 h-3 w-3" />
                          {ind}
                        </Badge>
                      ),
                    )}
                    {(selectedProfile.criteria?.titles || []).map(
                      (title: string) => (
                        <Badge key={title} variant="secondary" className="text-[10px]">
                          <Briefcase className="mr-1 h-3 w-3" />
                          {title}
                        </Badge>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* Company info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("prompter.companyName")}</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Jouw bedrijfsnaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("company.website")}</Label>
                  <Input
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="jouwbedrijf.com"
                  />
                </div>
              </div>

              {/* Product */}
              <div className="space-y-2">
                <Label>{t("prompter.product")}</Label>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  placeholder="Beschrijf wat je verkoopt en waarom het waardevol is..."
                />
              </div>

              {/* Regions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {t("prompter.regions")}
                </Label>
                <Input
                  value={targetRegions}
                  onChange={(e) => setTargetRegions(e.target.value)}
                  placeholder="bijv. UAE, Saudi Arabia, Oman"
                />
              </div>

              {/* Count + Language */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t("prompter.leadCount")}
                  </Label>
                  <Input
                    type="number"
                    min={10}
                    max={200}
                    value={leadCount}
                    onChange={(e) =>
                      setLeadCount(parseInt(e.target.value) || 50)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("prompter.language")}</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => v && setLanguage(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("icp.langEn")}</SelectItem>
                      <SelectItem value="ar">{t("prompter.langAr")}</SelectItem>
                      <SelectItem value="nl">{t("icp.langNl")}</SelectItem>
                      <SelectItem value="de">{t("icp.langDe")}</SelectItem>
                      <SelectItem value="fr">{t("icp.langFr")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extra instructions */}
              <div className="space-y-2">
                <Label>{t("prompter.extra")}</Label>
                <Textarea
                  value={extraInstructions}
                  onChange={(e) => setExtraInstructions(e.target.value)}
                  rows={2}
                  placeholder="bijv. Focus op bedrijven die recent vlootuitbreiding hebben aangekondigd..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Daily limit reminder */}
          <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              <div className="text-sm text-yellow-800 dark:text-yellow-400">
                <p className="font-medium">{t("prompter.sendLimit")}</p>
                <p className="mt-1">
                  PROLEAD verstuurt automatisch de warmste leads eerst
                  (hoogste ICP score). Bij {leadCount} leads duurt het{" "}
                  {Math.ceil(leadCount / 100)} dag(en) om iedereen te
                  bereiken.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Generated Prompt */}
        <div className="space-y-4">
          <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">
                    {t("prompter.generated")}
                  </CardTitle>
                  <CardDescription>
                    {t("prompter.generatedDesc")}
                  </CardDescription>
                </div>
                <Button onClick={handleCopy} className="shrink-0 bg-gradient-brand text-white shadow-brand hover:opacity-90">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      {t("prompter.copied")}
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      {t("prompter.copy")}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-y-auto rounded-lg border border-border/60 border-l-3 border-l-primary bg-muted/50 p-4">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {generatedPrompt}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Next steps */}
          <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <CardHeader>
              <CardTitle className="text-sm">{t("prompter.afterImport")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
              <p>
                1. Claude levert een CSV op — sla deze op als bestand
              </p>
              <p>
                2. Ga naar{" "}
                <a
                  href="/leads/import"
                  className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Leads &gt; Importeren
                </a>{" "}
                en upload de CSV
              </p>
              <p>
                3. Maak een Campaign aan en voeg de leads toe
              </p>
              <p>
                4. PROLEAD verstuurt automatisch van warm → koud
                (max 100/dag)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Direct CSV Paste Card */}
      <Card className="border-primary/30 bg-white dark:bg-neutral-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Upload className="h-4 w-4 text-primary" />
            {t("prompter.directImport")}
          </CardTitle>
          <CardDescription>
            {t("prompter.directImportDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            placeholder={t("prompter.pasteCSV")}
            className="font-mono text-xs"
          />
          <Button
            onClick={handleParseCSV}
            disabled={!csvText.trim()}
          >
            {t("prompter.parseImport")}
          </Button>

          {/* Import success message */}
          {importResult?.success && (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
              <div className="flex-1 text-sm text-green-800 dark:text-green-300">
                <p className="font-medium">
                  {importResult.count} {t("prompter.importSuccess")}
                </p>
              </div>
              <Link href="/leads">
                <Button variant="outline" size="sm">
                  {t("prompter.goToLeads")}
                </Button>
              </Link>
            </div>
          )}

          {/* Import error */}
          {importResult && !importResult.success && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-medium">{t("prompter.importError")}</p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="mt-1">{err}</p>
                ))}
              </div>
            </div>
          )}

          {/* Parsed preview */}
          {showParsed && parsedLeads.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">
                {t("prompter.previewTitle")}
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>{t("leads.firstName")}</TableHead>
                      <TableHead>{t("leads.lastName")}</TableHead>
                      <TableHead>{t("leadDetail.email")}</TableHead>
                      <TableHead>{t("leads.company")}</TableHead>
                      <TableHead>{t("leads.icpScore")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 5).map((lead, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {lead.valid ? (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {t("prompter.valid")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              {t("prompter.invalid")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{lead.data.first_name || "-"}</TableCell>
                        <TableCell>{lead.data.last_name || "-"}</TableCell>
                        <TableCell className="max-w-40 truncate">
                          {lead.data.email || "-"}
                        </TableCell>
                        <TableCell>{lead.data.company || "-"}</TableCell>
                        <TableCell>{lead.data.icp_score || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Invalid row errors */}
              {invalidLeads.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/20">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">
                    {invalidLeads.length} {t("importLeads.rowsSkipped")}
                  </p>
                  {invalidLeads.slice(0, 3).map((lead, i) => (
                    <p
                      key={i}
                      className="mt-1 text-yellow-700 dark:text-yellow-400"
                    >
                      {t("prompter.rowFailed")}: {t("prompter.missingFields")} — {lead.errors.join(", ")}
                    </p>
                  ))}
                </div>
              )}

              {/* No valid leads */}
              {validLeads.length === 0 && (
                <p className="text-sm text-red-600">{t("prompter.noValidLeads")}</p>
              )}

              {/* Import button */}
              {validLeads.length > 0 && (
                <Button
                  onClick={handleImportLeads}
                  disabled={importing}
                  className="bg-gradient-brand text-white shadow-brand hover:opacity-90"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("prompter.importing")}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {validLeads.length} {t("prompter.importLeads")}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* No results from parse */}
          {showParsed && parsedLeads.length === 0 && (
            <p className="text-sm text-neutral-500">
              {t("prompter.noValidLeads")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
