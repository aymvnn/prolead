"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CompanyProfile } from "@/types/database";
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
  Building2,
  Globe,
  Package,
  Trophy,
  Users,
  Target,
  MessageSquare,
  Save,
  Loader2,
  Check,
  Plus,
  X,
  Info,
  Sparkles,
} from "lucide-react";

export default function BedrijfsprofielPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Form fields
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [products, setProducts] = useState("");
  const [usps, setUsps] = useState<string[]>([]);
  const [newUsp, setNewUsp] = useState("");
  const [pricingInfo, setPricingInfo] = useState("");
  const [clientCases, setClientCases] = useState("");
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState("");
  const [targetRegions, setTargetRegions] = useState("");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [extraContext, setExtraContext] = useState("");

  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    // Get current user's org
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!userData) {
      setLoading(false);
      return;
    }

    setOrgId(userData.org_id);

    const { data: org } = await supabase
      .from("organizations")
      .select("company_profile")
      .eq("id", userData.org_id)
      .single();

    if (org?.company_profile) {
      const p = org.company_profile as CompanyProfile;
      setCompanyName(p.company_name || "");
      setWebsite(p.website || "");
      setDescription(p.description || "");
      setProducts(p.products || "");
      setUsps(p.usps || []);
      setPricingInfo(p.pricing_info || "");
      setClientCases(p.client_cases || "");
      setCompetitiveAdvantage(p.competitive_advantage || "");
      setTargetRegions(p.target_regions || "");
      setToneOfVoice(p.tone_of_voice || "");
      setExtraContext(p.extra_context || "");
    }

    setLoading(false);
  }

  const handleSave = useCallback(async () => {
    if (!orgId) return;
    setSaving(true);
    setSaved(false);

    const profile: CompanyProfile = {
      company_name: companyName,
      website,
      description,
      products,
      usps,
      pricing_info: pricingInfo,
      client_cases: clientCases,
      competitive_advantage: competitiveAdvantage,
      target_regions: targetRegions,
      tone_of_voice: toneOfVoice,
      extra_context: extraContext,
    };

    await supabase
      .from("organizations")
      .update({ company_profile: profile })
      .eq("id", orgId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }, [
    orgId,
    companyName,
    website,
    description,
    products,
    usps,
    pricingInfo,
    clientCases,
    competitiveAdvantage,
    targetRegions,
    toneOfVoice,
    extraContext,
    supabase,
  ]);

  function addUsp() {
    if (!newUsp.trim()) return;
    setUsps([...usps, newUsp.trim()]);
    setNewUsp("");
  }

  function removeUsp(index: number) {
    setUsps(usps.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Building2 className="h-5 w-5 text-primary" />
            Bedrijfsprofiel
          </h1>
          <p className="text-sm text-muted-foreground">
            Alles over je bedrijf op een plek. De AI agents gebruiken dit bij
            elke email.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? "Opgeslagen!" : "Opslaan"}
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Dit profiel wordt door alle AI agents gelezen
            </p>
            <p className="mt-1 text-muted-foreground">
              Hoe meer je invult, hoe beter de AI je emails personaliseert.
              De Writer Agent gebruikt je USPs, klantcases en
              concurrentievoordelen om overtuigende emails te schrijven.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Basis info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />
                Basisinformatie
              </CardTitle>
              <CardDescription>
                Naam en website van je bedrijf.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Bedrijfsnaam</Label>
                <Input
                  id="company-name"
                  placeholder="ASSET+ Fleet Solutions"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  Website
                </Label>
                <Input
                  id="website"
                  placeholder="assetplusgcc.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">
                  Wat doet je bedrijf? (1-3 zinnen)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Officieel distributeur van Burgers Double Deck Trailers voor de GCC-regio. Wij leveren fabrieksvernieuwde dubbeldeks opleggers die 55 europallets per rit laden."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Product info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-primary" />
                Product / Dienst
              </CardTitle>
              <CardDescription>
                Wat verkoop je precies? Wees specifiek.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="products">
                  Productbeschrijving
                </Label>
                <Textarea
                  id="products"
                  placeholder="ELC Double Deck Trailers — fabrieksvernieuwde dubbeldeks opleggers van Burgers Carrosserie (NL, sinds 1918). 13.60m lang, 55 europallets per trailer, 33 ton capaciteit. 35% brandstofbesparing per pallet, 40% CO2 reductie. Voldoet aan UAE Cabinet Resolution No. 138."
                  rows={5}
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricing">
                  Prijsindicatie (optioneel, intern)
                </Label>
                <Textarea
                  id="pricing"
                  placeholder="40-60% goedkoper dan een nieuw trailer. ROI binnen 12 maanden door brandstofbesparing. Prijzen op aanvraag."
                  rows={2}
                  value={pricingInfo}
                  onChange={(e) => setPricingInfo(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Target regions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-primary" />
                Doelmarkt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="regions">
                  Regio&apos;s en markten
                </Label>
                <Textarea
                  id="regions"
                  placeholder="UAE, Saudi Arabia, Oman, Kuwait, Bahrain, Qatar (GCC). Focus op logistics bedrijven, FMCG distributeurs, 3PL partijen en fleet operators met 20+ trailers."
                  rows={3}
                  value={targetRegions}
                  onChange={(e) => setTargetRegions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* USPs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                Unique Selling Points
              </CardTitle>
              <CardDescription>
                Waarom moeten klanten bij jou kopen? De AI gebruikt deze
                punten in outreach emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {usps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {usps.map((usp, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="gap-1 py-1.5 pl-3 pr-1.5"
                    >
                      {usp}
                      <button
                        onClick={() => removeUsp(i)}
                        className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Bijv. Enige dubbeldeks aanbieder in GCC"
                  value={newUsp}
                  onChange={(e) => setNewUsp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUsp();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={addUsp}
                  disabled={!newUsp.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                Klantcases & Referenties
              </CardTitle>
              <CardDescription>
                Welke bedrijven gebruiken jouw product al? Dit vergroot
                geloofwaardigheid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Action (NL retailer, 2000+ winkels) gebruikt Burgers trailers voor al hun distributie. Zeeman en bpost ook. In de GCC zijn wij de eerste en enige aanbieder van dit type trailer."
                rows={4}
                value={clientCases}
                onChange={(e) => setClientCases(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Competitive advantage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                Concurrentievoordeel
              </CardTitle>
              <CardDescription>
                Wat maakt jou anders dan de concurrentie?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Geen directe concurrentie in GCC voor dubbeldeks trailers. Alternatieven zijn standaard opleggers (minder capaciteit) of extra trucks kopen (hogere kosten). Onze ELC trailers bieden nieuwwaardige kwaliteit tegen 40-60% lagere kosten."
                rows={4}
                value={competitiveAdvantage}
                onChange={(e) => setCompetitiveAdvantage(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Tone of voice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4 text-primary" />
                Communicatiestijl
              </CardTitle>
              <CardDescription>
                Hoe wil je dat de AI communiceert namens jou?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tone">Tone of voice</Label>
                <Textarea
                  id="tone"
                  placeholder="Professioneel maar persoonlijk. Niet pushy — altijd waarde-eerst benadering. Toon expertise zonder arrogant te zijn. Gebruik concrete cijfers (35% besparing, 55 pallets). Engels voor GCC markt."
                  rows={3}
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Extra context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-primary" />
                Extra context
              </CardTitle>
              <CardDescription>
                Alles wat de AI nog moet weten. Vrij tekstveld.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="We zijn gevestigd in Dubai. Levering vanuit Nederland, transit tijd 3-4 weken. We bieden ook fleet consultancy aan. CEO is bereikbaar voor demo's in heel de GCC."
                rows={4}
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="shadow-brand-lg"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saved ? "Opgeslagen!" : "Profiel opslaan"}
        </Button>
      </div>
    </div>
  );
}
