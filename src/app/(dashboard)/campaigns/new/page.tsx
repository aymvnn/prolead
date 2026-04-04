"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Settings2,
  Users,
  Mic,
  GitBranch,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

const steps = [
  { id: 1, label: "Naam & Instellingen", icon: Settings2 },
  { id: 2, label: "ICP & Voice", icon: Mic },
  { id: 3, label: "Sequence Setup", icon: GitBranch },
  { id: 4, label: "Lead Selectie", icon: Users },
];

interface IcpProfile {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

interface VoiceProfile {
  id: string;
  name: string;
  tone_description: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  title: string;
  status: string;
  icp_score: number | null;
}

interface SequenceStep {
  step_number: number;
  channel: "email" | "linkedin";
  delay_days: number;
  delay_hours: number;
  label: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Campaign info
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [sendSchedule, setSendSchedule] = useState("business");
  const [timezone, setTimezone] = useState("cet");
  const [maxEmailsPerDay, setMaxEmailsPerDay] = useState(50);

  // Step 2: ICP & Voice
  const [icpProfiles, setIcpProfiles] = useState<IcpProfile[]>([]);
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>([]);
  const [selectedIcpId, setSelectedIcpId] = useState<string>("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Step 3: Sequence steps
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>([
    { step_number: 1, channel: "email", delay_days: 0, delay_hours: 0, label: "Eerste email" },
    { step_number: 2, channel: "email", delay_days: 3, delay_hours: 0, label: "Follow-up 1" },
    { step_number: 3, channel: "email", delay_days: 7, delay_hours: 0, label: "Follow-up 2" },
  ]);

  // Step 4: Lead selection
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(
    new Set(),
  );
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Load ICP and Voice profiles when entering step 2
  const loadProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const [icpRes, voiceRes] = await Promise.all([
        fetch("/api/icp"),
        fetch("/api/voice-profiles").catch(() => null),
      ]);

      const icpJson = await icpRes.json();
      if (icpJson.data) setIcpProfiles(icpJson.data);

      if (voiceRes && voiceRes.ok) {
        const voiceJson = await voiceRes.json();
        if (voiceJson.data) setVoiceProfiles(voiceJson.data);
      }
    } catch {
      // Profiles stay empty
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  // Load leads when entering step 4
  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams();
      if (leadSearch) params.set("search", leadSearch);
      if (leadStatusFilter !== "all") params.set("status", leadStatusFilter);
      if (minScore) params.set("min_score", minScore);
      params.set("limit", "200");

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (json.data) setLeads(json.data);
    } catch {
      // Leads stay empty
    } finally {
      setLoadingLeads(false);
    }
  }, [leadSearch, leadStatusFilter, minScore]);

  useEffect(() => {
    if (currentStep === 2) loadProfiles();
  }, [currentStep, loadProfiles]);

  useEffect(() => {
    if (currentStep === 4) loadLeads();
  }, [currentStep, loadLeads]);

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedLeadIds.size === leads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(leads.map((l) => l.id)));
    }
  };

  const addSequenceStep = () => {
    const lastStep = sequenceSteps[sequenceSteps.length - 1];
    const newStepNumber = lastStep ? lastStep.step_number + 1 : 1;
    const newDelay = lastStep ? lastStep.delay_days + 3 : 0;
    setSequenceSteps([
      ...sequenceSteps,
      {
        step_number: newStepNumber,
        channel: "email",
        delay_days: newDelay,
        delay_hours: 0,
        label: `Follow-up ${newStepNumber - 1}`,
      },
    ]);
  };

  const removeSequenceStep = (index: number) => {
    if (sequenceSteps.length <= 1) return;
    const updated = sequenceSteps.filter((_, i) => i !== index);
    // Renumber
    const renumbered = updated.map((s, i) => ({
      ...s,
      step_number: i + 1,
      label: i === 0 ? "Eerste email" : `Follow-up ${i}`,
    }));
    setSequenceSteps(renumbered);
  };

  const updateSequenceStep = (
    index: number,
    field: keyof SequenceStep,
    value: string | number,
  ) => {
    const updated = [...sequenceSteps];
    updated[index] = { ...updated[index], [field]: value };
    setSequenceSteps(updated);
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return campaignName.trim().length > 0;
      case 2:
        return true; // ICP and voice are optional
      case 3:
        return sequenceSteps.length > 0;
      case 4:
        return true; // Leads can be added later
      default:
        return false;
    }
  };

  const handleCreate = async () => {
    if (!campaignName.trim()) return;

    setSaving(true);
    try {
      // 1. Create campaign
      const campaignRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          icp_id: selectedIcpId || null,
          voice_profile_id: selectedVoiceId || null,
          settings: {
            description: campaignDescription,
            send_schedule: sendSchedule,
            timezone,
            max_emails_per_day: maxEmailsPerDay,
          },
        }),
      });

      const campaignJson = await campaignRes.json();
      if (!campaignRes.ok || !campaignJson.data) {
        alert(`Fout bij aanmaken campaign: ${campaignJson.error || "Onbekende fout"}`);
        setSaving(false);
        return;
      }

      const campaignId = campaignJson.data.id;

      // 2. Create sequence
      const seqRes = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaignId,
          name: `${campaignName} - Sequence`,
        }),
      });

      const seqJson = await seqRes.json();

      if (seqRes.ok && seqJson.data) {
        const sequenceId = seqJson.data.id;

        // 3. Create sequence steps
        for (const step of sequenceSteps) {
          await fetch(`/api/sequences/${sequenceId}/steps`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              step_number: step.step_number,
              channel: step.channel,
              delay_days: step.delay_days,
              delay_hours: step.delay_hours,
            }),
          });
        }
      }

      // 4. Add selected leads
      if (selectedLeadIds.size > 0) {
        await fetch(`/api/campaigns/${campaignId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_ids: Array.from(selectedLeadIds),
          }),
        });
      }

      // Redirect to campaigns list
      router.push("/campaigns");
    } catch {
      alert("Er is een fout opgetreden bij het aanmaken van de campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Nieuwe campaign</h1>
          <p className="text-sm text-neutral-500">
            Stel je outreach campaign in via de onderstaande stappen.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : isCompleted
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
              {index < steps.length - 1 && (
                <div className="h-px w-8 bg-neutral-200 dark:bg-neutral-700" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Name & Settings */}
      {currentStep === 1 && (
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle>Naam & Instellingen</CardTitle>
            <CardDescription>
              Geef je campaign een naam en stel de basisinstellingen in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign naam *</Label>
              <Input
                id="campaign-name"
                placeholder="bijv. Q2 SaaS Founders Outreach"
                className="bg-white dark:bg-neutral-950"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-description">
                Beschrijving (optioneel)
              </Label>
              <Textarea
                id="campaign-description"
                placeholder="Beschrijf het doel van deze campaign..."
                className="bg-white dark:bg-neutral-950"
                value={campaignDescription}
                onChange={(e) => setCampaignDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Verzendschema</Label>
                <Select
                  value={sendSchedule}
                  onValueChange={(v) => v && setSendSchedule(v)}
                >
                  <SelectTrigger className="bg-white dark:bg-neutral-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">
                      Kantooruren (9-17)
                    </SelectItem>
                    <SelectItem value="morning">Ochtend (7-12)</SelectItem>
                    <SelectItem value="afternoon">Middag (12-18)</SelectItem>
                    <SelectItem value="custom">Aangepast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tijdzone</Label>
                <Select
                  value={timezone}
                  onValueChange={(v) => v && setTimezone(v)}
                >
                  <SelectTrigger className="bg-white dark:bg-neutral-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cet">CET (Amsterdam)</SelectItem>
                    <SelectItem value="gmt">GMT (Londen)</SelectItem>
                    <SelectItem value="est">EST (New York)</SelectItem>
                    <SelectItem value="pst">PST (Los Angeles)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Max emails per dag</Label>
              <Input
                type="number"
                value={maxEmailsPerDay}
                onChange={(e) => setMaxEmailsPerDay(parseInt(e.target.value) || 50)}
                className="w-32 bg-white dark:bg-neutral-950"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: ICP & Voice Profile */}
      {currentStep === 2 && (
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle>ICP & Voice Profile</CardTitle>
            <CardDescription>
              Koppel een ICP profiel en voice profile aan deze campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingProfiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">
                  Profielen laden...
                </span>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>ICP Profiel (optioneel)</Label>
                  {icpProfiles.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
                      Geen ICP profielen gevonden.{" "}
                      <Link href="/icp" className="text-blue-600 underline">
                        Maak er een aan.
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {icpProfiles.map((icp) => (
                        <button
                          key={icp.id}
                          onClick={() =>
                            setSelectedIcpId(
                              selectedIcpId === icp.id ? "" : icp.id,
                            )
                          }
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedIcpId === icp.id
                              ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
                              : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{icp.name}</span>
                            {icp.is_active && (
                              <Badge
                                variant="secondary"
                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              >
                                Actief
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                            {icp.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>Voice Profile (optioneel)</Label>
                  {voiceProfiles.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-center text-sm text-neutral-500 dark:border-neutral-700">
                      Geen voice profielen gevonden. Deze kun je later
                      toevoegen.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {voiceProfiles.map((vp) => (
                        <button
                          key={vp.id}
                          onClick={() =>
                            setSelectedVoiceId(
                              selectedVoiceId === vp.id ? "" : vp.id,
                            )
                          }
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedVoiceId === vp.id
                              ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
                              : "border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
                          }`}
                        >
                          <span className="font-medium">{vp.name}</span>
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                            {vp.tone_description}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Sequence Setup */}
      {currentStep === 3 && (
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle>Sequence Setup</CardTitle>
            <CardDescription>
              Definieer de stappen voor je outreach sequence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sequenceSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold dark:bg-neutral-800">
                  {step.step_number}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <Input
                      value={step.label}
                      onChange={(e) =>
                        updateSequenceStep(index, "label", e.target.value)
                      }
                      className="flex-1 bg-white dark:bg-neutral-950"
                      placeholder="Stap naam"
                    />
                    <Select
                      value={step.channel}
                      onValueChange={(v) =>
                        v && updateSequenceStep(index, "channel", v)
                      }
                    >
                      <SelectTrigger className="w-32 bg-white dark:bg-neutral-950">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-500">Wacht</span>
                    <Input
                      type="number"
                      value={step.delay_days}
                      onChange={(e) =>
                        updateSequenceStep(
                          index,
                          "delay_days",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-16 bg-white dark:bg-neutral-950"
                      min={0}
                    />
                    <span className="text-neutral-500">dagen</span>
                    <Input
                      type="number"
                      value={step.delay_hours}
                      onChange={(e) =>
                        updateSequenceStep(
                          index,
                          "delay_hours",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-16 bg-white dark:bg-neutral-950"
                      min={0}
                      max={23}
                    />
                    <span className="text-neutral-500">uren</span>
                  </div>
                </div>
                <Badge variant="secondary">
                  Dag {step.delay_days}
                </Badge>
                {sequenceSteps.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => removeSequenceStep(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={addSequenceStep}
            >
              <Plus className="mr-2 h-4 w-4" />
              Stap toevoegen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Lead Selection */}
      {currentStep === 4 && (
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardHeader>
            <CardTitle>Lead Selectie</CardTitle>
            <CardDescription>
              Kies welke leads je aan deze campaign wilt toevoegen.
              Je kunt ook later leads toevoegen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Zoek op naam, email of bedrijf..."
                  className="bg-white dark:bg-neutral-950"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
              </div>
              <Select
                value={leadStatusFilter}
                onValueChange={(v) => v && setLeadStatusFilter(v)}
              >
                <SelectTrigger className="w-40 bg-white dark:bg-neutral-950">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="new">Nieuw</SelectItem>
                  <SelectItem value="researched">Geresearcht</SelectItem>
                  <SelectItem value="contacted">Gecontacteerd</SelectItem>
                  <SelectItem value="replied">Gereageerd</SelectItem>
                  <SelectItem value="interested">Geinteresseerd</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Min ICP score"
                className="w-32 bg-white dark:bg-neutral-950"
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                min={0}
                max={100}
              />
            </div>

            {/* Selection summary */}
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2 dark:bg-neutral-900">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                {selectedLeadIds.size} van {leads.length} leads geselecteerd
              </span>
              {leads.length > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedLeadIds.size === leads.length
                    ? "Deselecteer alles"
                    : "Selecteer alles"}
                </Button>
              )}
            </div>

            {/* Lead list */}
            {loadingLeads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">
                  Leads laden...
                </span>
              </div>
            ) : leads.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
                <Users className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Geen leads gevonden
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Pas de filters aan of voeg eerst leads toe.
                </p>
              </div>
            ) : (
              <div className="max-h-96 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                {leads.map((lead) => (
                  <label
                    key={lead.id}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                      selectedLeadIds.has(lead.id)
                        ? "bg-neutral-50 dark:bg-neutral-900"
                        : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedLeadIds.has(lead.id)}
                      onCheckedChange={() => toggleLead(lead.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {lead.first_name} {lead.last_name}
                        </span>
                        {lead.icp_score !== null && (
                          <Badge
                            variant="secondary"
                            className={
                              lead.icp_score >= 80
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                : lead.icp_score >= 60
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                            }
                          >
                            {lead.icp_score}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 truncate">
                        {lead.title ? `${lead.title} bij ` : ""}
                        {lead.company} - {lead.email}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vorige
        </Button>
        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            disabled={!canProceed()}
          >
            Volgende
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleCreate} disabled={saving || !campaignName.trim()}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aanmaken...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Campaign aanmaken
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
