"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/language-provider";

const pageTitleKeys: Record<string, string> = {
  "/overview": "nav.overview",
  "/bedrijf": "nav.company",
  "/leadprompter": "nav.leadprompter",
  "/leads": "nav.leads",
  "/campaigns": "nav.campaigns",
  "/sequences": "nav.sequences",
  "/inbox": "nav.inbox",
  "/meetings": "nav.meetings",
  "/templates": "nav.templates",
  "/icp": "nav.icp",
  "/analytics": "nav.analytics",
  "/integrations": "nav.integrations",
  "/settings": "nav.settings",
};

export function Header() {
  const pathname = usePathname();
  const { t } = useTranslation();

  let titleKey = "nav.overview";
  for (const [path, key] of Object.entries(pageTitleKeys)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      titleKey = key;
      break;
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-background shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] px-6">
      <h1 className="text-xl font-semibold tracking-tight">{t(titleKey)}</h1>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            type="search"
            placeholder={t("header.search")}
            className="w-64 pl-9"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  );
}
