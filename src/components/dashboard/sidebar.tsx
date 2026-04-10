"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Sparkles,
  Users,
  Megaphone,
  GitBranch,
  Inbox,
  Calendar,
  FileText,
  Target,
  BarChart3,
  Plug,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Rocket,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/components/language-provider";

const navItems = [
  { href: "/onboarding", labelKey: "nav.onboarding", icon: Rocket },
  { href: "/overview", labelKey: "nav.overview", icon: LayoutDashboard },
  { href: "/bedrijf", labelKey: "nav.company", icon: Building2 },
  { href: "/leadprompter", labelKey: "nav.leadprompter", icon: Sparkles },
  { href: "/leads", labelKey: "nav.leads", icon: Users },
  { href: "/campaigns", labelKey: "nav.campaigns", icon: Megaphone },
  { href: "/sequences", labelKey: "nav.sequences", icon: GitBranch },
  { href: "/inbox", labelKey: "nav.inbox", icon: Inbox },
  { href: "/meetings", labelKey: "nav.meetings", icon: Calendar },
  { href: "/templates", labelKey: "nav.templates", icon: FileText },
  { href: "/icp", labelKey: "nav.icp", icon: Target },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
  { href: "/integrations", labelKey: "nav.integrations", icon: Plug },
];

const bottomItems = [
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-200 dark:border-neutral-800 dark:bg-neutral-950",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
        {!collapsed && (
          <Link href="/leads" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand shadow-brand">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight">PROLEAD</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 shrink-0"
        >
          {collapsed ? (
            <Menu className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const label = t(item.labelKey);

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/8 text-primary dark:bg-primary/10 dark:text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        "justify-center px-2",
                      )}
                    />
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/8 text-primary dark:bg-primary/10 dark:text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/8 text-primary dark:bg-primary/10 dark:text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>{t("nav.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
