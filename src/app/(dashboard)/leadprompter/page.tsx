"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";

export default function LeadPrompterPage() {
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
          Lead Prompter
        </h1>
        <p className="text-sm text-neutral-500">
          Genereer een kant-en-klare prompt voor Claude om leads te zoeken.
          Kopieer de prompt en plak hem in Claude Cowork.
        </p>
      </div>

      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 pt-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-300">
              Hoe het werkt
            </p>
            <div className="flex flex-wrap items-center gap-2 text-blue-800 dark:text-blue-400">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                1. Configureer
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                2. Kopieer prompt
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                3. Plak in Claude
              </Badge>
              <ArrowRight className="h-3 w-3" />
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary"
              >
                4. Importeer CSV
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
              <CardTitle className="text-sm">Configuratie</CardTitle>
              <CardDescription>
                Pas de parameters aan voor je lead zoektocht.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ICP Profile */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  ICP Profiel
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
                  <Label>Bedrijfsnaam</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Jouw bedrijfsnaam"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="jouwbedrijf.com"
                  />
                </div>
              </div>

              {/* Product */}
              <div className="space-y-2">
                <Label>Product/Dienst beschrijving</Label>
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
                  Doelregio&apos;s
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
                    Aantal leads
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
                  <Label>Taal van leads</Label>
                  <Select
                    value={language}
                    onValueChange={(v) => v && setLanguage(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">Engels</SelectItem>
                      <SelectItem value="ar">Arabisch + Engels</SelectItem>
                      <SelectItem value="nl">Nederlands</SelectItem>
                      <SelectItem value="de">Duits</SelectItem>
                      <SelectItem value="fr">Frans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Extra instructions */}
              <div className="space-y-2">
                <Label>Extra instructies (optioneel)</Label>
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
                <p className="font-medium">Verzendlimiet: 100 emails/dag</p>
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
                    Gegenereerde Prompt
                  </CardTitle>
                  <CardDescription>
                    Kopieer en plak in Claude Cowork.
                  </CardDescription>
                </div>
                <Button onClick={handleCopy} className="shrink-0 bg-gradient-brand text-white shadow-brand hover:opacity-90">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Gekopieerd!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Kopieer prompt
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
              <CardTitle className="text-sm">Na het importeren</CardTitle>
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
    </div>
  );
}
