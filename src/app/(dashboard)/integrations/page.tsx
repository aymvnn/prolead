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
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "@/components/language-provider";

interface IntegrationConfig {
  key: string;
  name: string;
  description: string;
  icon: typeof Calendar;
  type: IntegrationType["type"];
  category: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

interface IntegrationConfigDef {
  key: string;
  name: string;
  descKey: string;
  icon: typeof Calendar;
  type: IntegrationType["type"];
  categoryKey: string;
  fields: { key: string; labelKey: string; placeholder: string; type?: string }[];
}

const integrationConfigsDef = [
  {
    key: "google_calendar",
    name: "Google Calendar",
    descKey: "integrations.googleCalendarDesc",
    icon: Calendar,
    type: "google_calendar" as IntegrationType["type"],
    categoryKey: "integrations.catAgenda",
    fields: [
      { key: "client_id", labelKey: "integrations.clientId", placeholder: "Google OAuth Client ID" },
      { key: "client_secret", labelKey: "integrations.clientSecret", placeholder: "Google OAuth Client Secret", type: "password" },
    ],
  },
  {
    key: "linkedin",
    name: "LinkedIn / HeyReach",
    descKey: "integrations.linkedinDesc",
    icon: Link2,
    type: "linkedin" as IntegrationType["type"],
    categoryKey: "integrations.catSocial",
    fields: [
      { key: "api_key", labelKey: "integrations.heyreachApiKey", placeholder: "HeyReach API Key", type: "password" },
    ],
  },
  {
    key: "smtp",
    name: "Email SMTP",
    descKey: "integrations.smtpDesc",
    icon: Mail,
    type: "smtp" as IntegrationType["type"],
    categoryKey: "integrations.catEmail",
    fields: [
      { key: "host", labelKey: "integrations.smtpHost", placeholder: "smtp.example.com" },
      { key: "port", labelKey: "integrations.smtpPort", placeholder: "587" },
      { key: "username", labelKey: "integrations.username", placeholder: "user@example.com" },
      { key: "password", labelKey: "integrations.password", placeholder: "SMTP", type: "password" },
    ],
  },
  {
    key: "resend",
    name: "Resend",
    descKey: "integrations.resendDesc",
    icon: Send,
    type: "resend" as IntegrationType["type"],
    categoryKey: "integrations.catEmail",
    fields: [
      { key: "api_key", labelKey: "integrations.resendApiKey", placeholder: "re_...", type: "password" },
    ],
  },
];

const statusConfigColors: Record<
  string,
  { labelKey: string; color: string; icon: typeof CheckCircle2 }
> = {
  connected: {
    labelKey: "integrations.connected",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    icon: CheckCircle2,
  },
  disconnected: {
    labelKey: "integrations.disconnected",
    color:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    icon: XCircle,
  },
  error: {
    labelKey: "integrations.error",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: XCircle,
  },
};

export default function IntegrationsPage() {
  const { t } = useTranslation();

  const integrationConfigs: IntegrationConfig[] = integrationConfigsDef.map((def) => ({
    key: def.key,
    name: def.name,
    description: t(def.descKey),
    icon: def.icon,
    type: def.type,
    category: t(def.categoryKey),
    fields: def.fields.map((f) => ({ key: f.key, label: t(f.labelKey), placeholder: f.placeholder, type: f.type })),
  }));

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = Object.fromEntries(
    Object.entries(statusConfigColors).map(([k, v]) => [k, { label: t(v.labelKey), color: v.color, icon: v.icon }]),
  );

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
          {t("integrations.title")}
        </h1>
        <p className="text-sm text-neutral-500">
          {t("integrations.subtitle")}
        </p>
      </div>

      {/* Warning: deze tegels slaan credentials op maar worden nog niet live gebruikt */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="space-y-1 text-amber-900 dark:text-amber-200">
          <p className="font-medium">Deze integraties zijn nog niet actief in PROLEAD</p>
          <p>
            De instellingen hieronder slaan credentials veilig op, maar worden op dit moment nog niet gebruikt door de verzend- of sync-logica. De enige werkende email-route is Resend via de <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">RESEND_API_KEY</code> environment variable. LinkedIn/HeyReach, Google Calendar en SMTP komen in een latere fase.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">{t("integrations.totalIntegrations")}</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {integrationConfigs.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">{t("integrations.connected")}</p>
          <p className="text-2xl font-bold text-green-600">
            {connected.length}
          </p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">{t("integrations.disconnected")}</p>
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
                      <CardTitle className="flex items-center gap-2 text-sm">
                        {config.name}
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-[10px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        >
                          Coming soon
                        </Badge>
                      </CardTitle>
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
                    {t("integrations.lastSync")}{" "}
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
                      {t("integrations.settings")}
                    </Button>
                  )}
                  {!isConnected && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConfig(config)}
                    >
                      <Plug className="mr-2 h-3 w-3" />
                      {t("integrations.connect")}
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
              <DialogTitle>{t("integrations.configure")} {configDialog.name}</DialogTitle>
              <DialogDescription>
                {t("integrations.configureDesc")} {configDialog.name}.
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
                {t("common.cancel")}
              </Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving ? t("common.loading") : t("integrations.connect")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
