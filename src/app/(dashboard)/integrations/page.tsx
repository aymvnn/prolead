"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Integration as IntegrationType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Plug,
  Calendar,
  Link2,
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings2,
  RefreshCw,
} from "lucide-react";

interface IntegrationConfig {
  key: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  type: IntegrationType["type"];
  category: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

const integrationConfigs: IntegrationConfig[] = [
  {
    key: "google_calendar",
    name: "Google Calendar",
    description:
      "Synchroniseer meetings en beschikbaarheid. Automatisch meetings plannen vanuit ProLead.",
    icon: Calendar,
    type: "google_calendar",
    category: "Agenda",
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Google OAuth Client ID",
      },
      {
        key: "client_secret",
        label: "Client Secret",
        placeholder: "Google OAuth Client Secret",
        type: "password",
      },
    ],
  },
  {
    key: "linkedin",
    name: "LinkedIn / HeyReach",
    description:
      "Koppel je LinkedIn account via HeyReach voor profielverrijking en connectie-tracking.",
    icon: Link2,
    type: "linkedin",
    category: "Sociaal",
    fields: [
      {
        key: "api_key",
        label: "HeyReach API Key",
        placeholder: "Je HeyReach API key",
        type: "password",
      },
    ],
  },
  {
    key: "smtp",
    name: "Email SMTP",
    description:
      "Verbind je eigen SMTP-server voor het versturen van emails via je eigen domein.",
    icon: Mail,
    type: "smtp",
    category: "Email",
    fields: [
      { key: "host", label: "SMTP Host", placeholder: "smtp.example.com" },
      { key: "port", label: "Port", placeholder: "587" },
      { key: "username", label: "Gebruikersnaam", placeholder: "user@example.com" },
      {
        key: "password",
        label: "Wachtwoord",
        placeholder: "SMTP wachtwoord",
        type: "password",
      },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    description:
      "Gebruik Resend als email API voor betrouwbare aflevering en tracking.",
    icon: Send,
    type: "resend",
    category: "Email",
    fields: [
      {
        key: "api_key",
        label: "Resend API Key",
        placeholder: "re_...",
        type: "password",
      },
    ],
  },
];

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  connected: {
    label: "Verbonden",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle2,
  },
  disconnected: {
    label: "Niet verbonden",
    color:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    icon: XCircle,
  },
  error: {
    label: "Fout",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: XCircle,
  },
};

export default function IntegrationsPage() {
  const [dbIntegrations, setDbIntegrations] = useState<IntegrationType[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [configDialog, setConfigDialog] = useState<IntegrationConfig | null>(
    null,
  );
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setDbIntegrations(data);
    setLoading(false);
  }

  function getDbIntegration(type: string): IntegrationType | undefined {
    return dbIntegrations.find((i) => i.type === type);
  }

  function openConfig(config: IntegrationConfig) {
    const existing = getDbIntegration(config.type);
    const values: Record<string, string> = {};
    if (existing?.config && typeof existing.config === "object") {
      const cfg = existing.config as Record<string, string>;
      config.fields.forEach((f) => {
        values[f.key] = cfg[f.key] || "";
      });
    }
    setConfigValues(values);
    setConfigDialog(config);
  }

  async function saveConfig() {
    if (!configDialog) return;
    setSaving(true);

    const existing = getDbIntegration(configDialog.type);

    if (existing) {
      await supabase
        .from("integrations")
        .update({
          config: configValues,
          status: "connected",
          last_sync_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("integrations").insert({
        type: configDialog.type,
        config: configValues,
        status: "connected",
        last_sync_at: new Date().toISOString(),
      });
    }

    setConfigDialog(null);
    setConfigValues({});
    setSaving(false);
    await loadIntegrations();
  }

  async function toggleConnection(config: IntegrationConfig) {
    const existing = getDbIntegration(config.type);

    if (existing) {
      const newStatus =
        existing.status === "connected" ? "disconnected" : "connected";
      await supabase
        .from("integrations")
        .update({ status: newStatus })
        .eq("id", existing.id);
      await loadIntegrations();
    } else {
      openConfig(config);
    }
  }

  const connected = integrationConfigs.filter(
    (c) => getDbIntegration(c.type)?.status === "connected",
  );
  const disconnected = integrationConfigs.filter(
    (c) => getDbIntegration(c.type)?.status !== "connected",
  );

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
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Plug className="h-5 w-5" />
          Integraties
        </h1>
        <p className="text-sm text-neutral-500">
          Beheer je koppelingen met externe diensten.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">Totaal integraties</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {integrationConfigs.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">Verbonden</p>
          <p className="text-2xl font-bold text-green-600">
            {connected.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">Niet verbonden</p>
          <p className="text-2xl font-bold text-neutral-400">
            {disconnected.length}
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrationConfigs.map((config) => {
          const Icon = config.icon;
          const dbInt = getDbIntegration(config.type);
          const isConnected = dbInt?.status === "connected";
          const status = statusConfig[dbInt?.status || "disconnected"];
          const StatusIcon = status.icon;

          return (
            <Card
              key={config.key}
              className={`border-neutral-200 bg-white transition-shadow dark:border-neutral-800 dark:bg-neutral-950 ${
                isConnected
                  ? "ring-1 ring-green-200 dark:ring-green-900"
                  : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isConnected
                          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                          : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{config.name}</CardTitle>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant="secondary" className={status.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={isConnected}
                    onCheckedChange={() => toggleConnection(config)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-neutral-500">
                  {config.description}
                </p>
                {dbInt?.last_sync_at && (
                  <p className="text-[10px] text-neutral-400">
                    Laatste sync:{" "}
                    {new Date(dbInt.last_sync_at).toLocaleString("nl-NL")}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfig(config)}
                    >
                      <Settings2 className="mr-2 h-3 w-3" />
                      Instellingen
                    </Button>
                  )}
                  {!isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfig(config)}
                    >
                      <Plug className="mr-2 h-3 w-3" />
                      Verbinden
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Config Dialog */}
      {configDialog && (
        <Dialog
          open={!!configDialog}
          onOpenChange={(open) => !open && setConfigDialog(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{configDialog.name} configureren</DialogTitle>
              <DialogDescription>
                Voer de vereiste gegevens in om {configDialog.name} te
                verbinden.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {configDialog.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={configValues[field.key] || ""}
                    onChange={(e) =>
                      setConfigValues({
                        ...configValues,
                        [field.key]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfigDialog(null)}
              >
                Annuleren
              </Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? "Opslaan..." : "Verbinden"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
