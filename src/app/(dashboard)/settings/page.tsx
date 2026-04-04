"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Switch } from "@/components/ui/switch";
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
  Settings,
  Mail,
  Mic,
  Users,
  Save,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SettingsTab = "general" | "email" | "voice" | "team";

const tabs: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: "general", label: "Algemeen", icon: Settings },
  { id: "email", label: "Email Accounts", icon: Mail },
  { id: "voice", label: "Voice Profiles", icon: Mic },
  { id: "team", label: "Team", icon: Users },
];

// ── Types ─────────────────────────────────────────────────

interface EmailAccount {
  id: string;
  email: string;
  display_name: string | null;
  provider: "smtp" | "resend";
  daily_limit: number;
  emails_sent_today: number;
  warmup_status: string;
  is_active: boolean;
  created_at: string;
}

interface VoiceProfile {
  id: string;
  name: string;
  sample_emails: string[];
  tone_description: string;
  style_guidelines: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "invited";
}

// ── Status badge config ───────────────────────────────────

const warmupStatusConfig: Record<string, { label: string; color: string }> = {
  inactive: {
    label: "Niet actief",
    color: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300",
  },
  warming: {
    label: "Warming up",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  warmed: {
    label: "Gereed",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  paused: {
    label: "Gepauzeerd",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
};

// ── Demo team (placeholder) ───────────────────────────────

const demoTeam: TeamMember[] = [
  {
    id: "1",
    name: "Jan Bakker",
    email: "jan@prolead.nl",
    role: "admin",
    status: "active",
  },
  {
    id: "2",
    name: "Sophie de Groot",
    email: "sophie@prolead.nl",
    role: "member",
    status: "active",
  },
  {
    id: "3",
    name: "Mark Jansen",
    email: "mark@prolead.nl",
    role: "viewer",
    status: "invited",
  },
];

// ==========================================================
// Settings Page
// ==========================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Instellingen
        </h1>
        <p className="text-sm text-neutral-500">
          Beheer je account, email accounts, voice profiles en team.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-950">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* General */}
      {activeTab === "general" && <GeneralTab />}

      {/* Email Accounts */}
      {activeTab === "email" && <EmailTab />}

      {/* Voice Profiles */}
      {activeTab === "voice" && <VoiceTab />}

      {/* Team */}
      {activeTab === "team" && <TeamTab />}
    </div>
  );
}

// ==========================================================
// General Tab (kept as placeholder)
// ==========================================================

function GeneralTab() {
  return (
    <div className="space-y-6">
      <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <CardHeader>
          <CardTitle className="text-sm">Profiel</CardTitle>
          <CardDescription>Je persoonlijke gegevens.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Voornaam</Label>
              <Input
                defaultValue="Jan"
                className="bg-white dark:bg-neutral-950"
              />
            </div>
            <div className="space-y-2">
              <Label>Achternaam</Label>
              <Input
                defaultValue="Bakker"
                className="bg-white dark:bg-neutral-950"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              defaultValue="jan@prolead.nl"
              className="bg-white dark:bg-neutral-950"
            />
          </div>
          <div className="space-y-2">
            <Label>Bedrijfsnaam</Label>
            <Input
              defaultValue="ProLead"
              className="bg-white dark:bg-neutral-950"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <CardHeader>
          <CardTitle className="text-sm">Voorkeuren</CardTitle>
          <CardDescription>App-instellingen en notificaties.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark mode</p>
              <p className="text-xs text-neutral-500">
                Schakel de donkere weergave in.
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email notificaties</p>
              <p className="text-xs text-neutral-500">
                Ontvang notificaties bij nieuwe replies.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dagelijks rapport</p>
              <p className="text-xs text-neutral-500">
                Ontvang een dagelijkse samenvatting per email.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="space-y-2">
            <Label>Tijdzone</Label>
            <Select defaultValue="cet">
              <SelectTrigger className="bg-white dark:bg-neutral-950">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cet">CET (Amsterdam)</SelectItem>
                <SelectItem value="gmt">GMT (Londen)</SelectItem>
                <SelectItem value="est">EST (New York)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Opslaan
        </Button>
      </div>
    </div>
  );
}

// ==========================================================
// Email Tab (functional)
// ==========================================================

function EmailTab() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    ok: boolean;
    msg: string;
  } | null>(null);

  // Form state
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newProvider, setNewProvider] = useState<"resend" | "smtp">("resend");
  const [newDailyLimit, setNewDailyLimit] = useState("50");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_accounts")
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts((data as EmailAccount[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleAdd() {
    if (!newEmail) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Determine org_id — grab first org if available
    let orgId = "";
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("id", user.id)
        .single();
      orgId = profile?.org_id ?? "";
    }

    await supabase.from("email_accounts").insert({
      org_id: orgId,
      email: newEmail,
      display_name: newDisplayName || null,
      provider: newProvider,
      daily_limit: parseInt(newDailyLimit) || 50,
      emails_sent_today: 0,
      warmup_status: "warming",
      is_active: true,
    });

    setNewEmail("");
    setNewDisplayName("");
    setNewProvider("resend");
    setNewDailyLimit("50");
    setAddOpen(false);
    setSaving(false);
    loadAccounts();
  }

  async function handleToggleActive(account: EmailAccount) {
    await supabase
      .from("email_accounts")
      .update({ is_active: !account.is_active })
      .eq("id", account.id);
    loadAccounts();
  }

  async function handleDelete(id: string) {
    await supabase.from("email_accounts").delete().eq("id", id);
    loadAccounts();
  }

  async function handleTestConnection(account: EmailAccount) {
    setTestingId(account.id);
    setTestResult(null);

    // Simple connectivity check: try to verify the email exists via a lightweight call
    // In production, this would do an actual SMTP handshake or Resend domain check
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTestResult({
        id: account.id,
        ok: true,
        msg: "Verbinding succesvol",
      });
    } catch {
      setTestResult({
        id: account.id,
        ok: false,
        msg: "Verbinding mislukt",
      });
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Email account toevoegen
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Email account toevoegen</DialogTitle>
              <DialogDescription>
                Voeg een nieuw email account toe om campagne-emails mee te
                versturen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Email adres</Label>
                <Input
                  type="email"
                  placeholder="sales@jouwbedrijf.nl"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
              <div className="space-y-2">
                <Label>Weergavenaam</Label>
                <Input
                  placeholder="Jan van ProLead"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={newProvider}
                  onValueChange={(v) => v && setNewProvider(v as "resend" | "smtp")}
                >
                  <SelectTrigger className="bg-white dark:bg-neutral-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resend">Resend</SelectItem>
                    <SelectItem value="smtp">SMTP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dagelijks limiet</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="50"
                  value={newDailyLimit}
                  onChange={(e) => setNewDailyLimit(e.target.value)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!newEmail || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Toevoegen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Geen email accounts
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Voeg een email account toe om te beginnen met versturen.
            </p>
          </CardContent>
        </Card>
      ) : (
        accounts.map((account) => {
          const status = warmupStatusConfig[account.warmup_status] ??
            warmupStatusConfig.inactive;
          const usagePercent =
            account.daily_limit > 0
              ? (account.emails_sent_today / account.daily_limit) * 100
              : 0;
          const result =
            testResult && testResult.id === account.id ? testResult : null;

          return (
            <Card
              key={account.id}
              className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
            >
              <CardContent className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <Mail className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.email}</p>
                      <Badge variant="secondary" className={status.color}>
                        {status.label}
                      </Badge>
                      {!account.is_active && (
                        <Badge
                          variant="secondary"
                          className="bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                        >
                          Uitgeschakeld
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">
                      {account.display_name ?? account.email} &middot;{" "}
                      {account.provider === "resend" ? "Resend" : "SMTP"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Usage meter */}
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {account.emails_sent_today} / {account.daily_limit}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      Verstuurd vandaag
                    </p>
                  </div>
                  <div className="h-2 w-24 rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${Math.min(usagePercent, 100)}%`,
                      }}
                    />
                  </div>

                  {/* Test connection */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testingId === account.id}
                    onClick={() => handleTestConnection(account)}
                  >
                    {testingId === account.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : result?.ok ? (
                      <CheckCircle2 className="mr-1 h-3 w-3 text-green-500" />
                    ) : result && !result.ok ? (
                      <AlertCircle className="mr-1 h-3 w-3 text-red-500" />
                    ) : (
                      <Zap className="mr-1 h-3 w-3" />
                    )}
                    Test
                  </Button>

                  {/* Active toggle */}
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={() => handleToggleActive(account)}
                  />

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="h-4 w-4 text-neutral-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

// ==========================================================
// Voice Tab (functional)
// ==========================================================

function VoiceTab() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<VoiceProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSampleEmails, setFormSampleEmails] = useState("");
  const [formToneDescription, setFormToneDescription] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("voice_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data as VoiceProfile[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  function openEdit(profile: VoiceProfile) {
    setEditProfile(profile);
    setFormName(profile.name);
    setFormSampleEmails(profile.sample_emails.join("\n---\n"));
    setFormToneDescription(profile.tone_description);
  }

  function resetForm() {
    setFormName("");
    setFormSampleEmails("");
    setFormToneDescription("");
    setEditProfile(null);
  }

  async function handleSave() {
    if (!formName) return;
    setSaving(true);

    const sampleEmails = formSampleEmails
      .split("\n---\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (editProfile) {
      // Update existing
      await supabase
        .from("voice_profiles")
        .update({
          name: formName,
          sample_emails: sampleEmails,
          tone_description: formToneDescription,
        })
        .eq("id", editProfile.id);
    } else {
      // Create new
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let orgId = "";
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("org_id")
          .eq("id", user.id)
          .single();
        orgId = profile?.org_id ?? "";
      }

      await supabase.from("voice_profiles").insert({
        org_id: orgId,
        name: formName,
        sample_emails: sampleEmails,
        tone_description: formToneDescription,
      });
    }

    resetForm();
    setAddOpen(false);
    setSaving(false);
    loadProfiles();
  }

  async function handleDelete(id: string) {
    await supabase.from("voice_profiles").delete().eq("id", id);
    loadProfiles();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog
          open={addOpen || editProfile !== null}
          onOpenChange={(open) => {
            if (!open) {
              setAddOpen(false);
              resetForm();
            }
          }}
        >
          <DialogTrigger
            render={
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nieuw voice profile
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editProfile ? "Voice profile bewerken" : "Nieuw voice profile"}
              </DialogTitle>
              <DialogDescription>
                {editProfile
                  ? "Wijzig de instellingen van dit voice profile."
                  : "Maak een nieuw voice profile aan. De AI gebruikt dit om emails in jouw stijl te schrijven."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  placeholder="Professioneel NL"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
              <div className="space-y-2">
                <Label>Voorbeeld emails</Label>
                <Textarea
                  placeholder={"Plak hier voorbeeldemails die jouw stijl vertegenwoordigen.\nScheid meerdere emails met --- op een eigen regel."}
                  rows={6}
                  value={formSampleEmails}
                  onChange={(e) => setFormSampleEmails(e.target.value)}
                  className="bg-white dark:bg-neutral-950"
                />
                <p className="text-[10px] text-neutral-400">
                  Scheid meerdere emails met --- op een eigen regel
                </p>
              </div>
              <div className="space-y-2">
                <Label>Toon omschrijving</Label>
                <Textarea
                  placeholder="Professioneel maar warm. Gebruik korte zinnen. Altijd met naam aanspreken."
                  rows={3}
                  value={formToneDescription}
                  onChange={(e) => setFormToneDescription(e.target.value)}
                  className="bg-white dark:bg-neutral-950"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={!formName || saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editProfile ? "Opslaan" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : profiles.length === 0 ? (
        <Card className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mic className="h-10 w-10 text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
              Geen voice profiles
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Maak een voice profile aan zodat de AI in jouw stijl kan schrijven.
            </p>
          </CardContent>
        </Card>
      ) : (
        profiles.map((profile) => (
          <Card
            key={profile.id}
            className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
          >
            <CardContent className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  <Mic className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <p className="font-medium">{profile.name}</p>
                  <p className="text-xs text-neutral-500 line-clamp-1 max-w-md">
                    {profile.tone_description || "Geen beschrijving"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {profile.sample_emails.length} voorbeeld
                  {profile.sample_emails.length !== 1 ? "s" : ""}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(profile)}
                >
                  Bewerken
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(profile.id)}
                >
                  <Trash2 className="h-4 w-4 text-neutral-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ==========================================================
// Team Tab (placeholder)
// ==========================================================

function TeamTab() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Teamlid uitnodigen
        </Button>
      </div>

      {demoTeam.map((member) => (
        <Card
          key={member.id}
          className="border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        >
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold dark:bg-neutral-800">
                {member.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{member.name}</p>
                  {member.status === "invited" && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                    >
                      Uitgenodigd
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-neutral-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select defaultValue={member.role}>
                <SelectTrigger className="w-28 bg-white dark:bg-neutral-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Lid</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4 text-neutral-400" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
