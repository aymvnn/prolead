"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Building2, Target, Upload, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";

interface StepStatus {
  companyDone: boolean;
  icpDone: boolean;
  leadsDone: boolean;
  campaignsDone: boolean;
}

const stepIcons = [Building2, Target, Upload, Megaphone];

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StepStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Check company profile
        const { data: profile } = await supabase
          .from("company_profiles")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        // Check ICP profiles
        const { count: icpCount } = await supabase
          .from("icp_profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Check leads
        const { count: leadsCount } = await supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Check campaigns
        const { count: campaignsCount } = await supabase
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        setStatus({
          companyDone: (profile?.length ?? 0) > 0,
          icpDone: (icpCount ?? 0) > 0,
          leadsDone: (leadsCount ?? 0) > 0,
          campaignsDone: (campaignsCount ?? 0) > 0,
        });
      } catch {
        setStatus({
          companyDone: false,
          icpDone: false,
          leadsDone: false,
          campaignsDone: false,
        });
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  const steps = [
    {
      titleKey: "onboarding.step1.title",
      descKey: "onboarding.step1.desc",
      href: "/bedrijf",
      done: status?.companyDone ?? false,
    },
    {
      titleKey: "onboarding.step2.title",
      descKey: "onboarding.step2.desc",
      href: "/icp",
      done: status?.icpDone ?? false,
    },
    {
      titleKey: "onboarding.step3.title",
      descKey: "onboarding.step3.desc",
      href: "/leads/import",
      done: status?.leadsDone ?? false,
    },
    {
      titleKey: "onboarding.step4.title",
      descKey: "onboarding.step4.desc",
      href: "/campaigns/new",
      done: status?.campaignsDone ?? false,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {t("onboarding.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t("onboarding.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("onboarding.subtitle")}</p>
      </div>

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const Icon = stepIcons[idx];
          return (
            <div
              key={idx}
              className="flex items-start gap-4 rounded-xl border border-border bg-background p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Step circle */}
              <div
                className={
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
                  (step.done
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-primary/10 text-primary")
                }
              >
                {step.done ? <Check className="h-5 w-5" /> : idx + 1}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{t(step.titleKey)}</h3>
                  {step.done && (
                    <span className="ml-auto text-xs font-medium text-green-600 dark:text-green-400">
                      {t("onboarding.completed")}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{t(step.descKey)}</p>
                {!step.done && (
                  <Link href={step.href}>
                    <Button size="sm" className="mt-3">
                      {t("onboarding.goTo")} {t(step.titleKey).toLowerCase()}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
