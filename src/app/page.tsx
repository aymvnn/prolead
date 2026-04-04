import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Mail,
  MessageSquare,
  Calendar,
  Target,
  BarChart3,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Lead Research",
    description:
      "Automatische lead enrichment met bedrijfsdata, pijnpunten en trigger events.",
  },
  {
    icon: Mail,
    title: "Gepersonaliseerde Emails",
    description:
      "Elke email geschreven from scratch door AI, in jouw stem en stijl.",
  },
  {
    icon: MessageSquare,
    title: "AI Auto-Responder",
    description:
      "Beantwoordt replies automatisch, handelt bezwaren af en voert gesprekken.",
  },
  {
    icon: Calendar,
    title: "Meeting Booking",
    description:
      "Detecteert meeting intent en boekt automatisch via Google Calendar.",
  },
  {
    icon: Target,
    title: "ICP Prompt Forge",
    description:
      "Definieer je ideale klantprofiel en laat AI je leads scoren.",
  },
  {
    icon: BarChart3,
    title: "Analytics & A/B Testing",
    description:
      "Real-time performance tracking en automatische A/B test optimalisatie.",
  },
];

const stats = [
  { value: "6", label: "AI Agents", icon: Zap },
  { value: "100%", label: "Automatisch", icon: TrendingUp },
  { value: "<$15", label: "Per maand", icon: Shield },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-[oklch(0.12_0.06_264/80%)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/10">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              PROLEAD
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                Inloggen
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-white text-[oklch(0.2_0.12_264)] hover:bg-white/90 shadow-brand font-semibold">
                Aan de slag
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center overflow-hidden bg-gradient-hero px-6 pb-24 pt-36 text-center text-white">
        {/* Decorative elements */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-[oklch(0.4_0.15_264/8%)] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[oklch(0.5_0.2_280/6%)] blur-[80px]" />
        <div className="absolute top-20 right-10 h-48 w-48 rounded-full bg-[oklch(0.4_0.18_240/6%)] blur-[60px]" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-[oklch(0.7_0.15_264)]" />
            Powered by 6 AI Agents
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
            Van koude lead tot
            <br />
            <span className="text-gradient-brand bg-gradient-to-r from-white via-[oklch(0.8_0.1_264)] to-[oklch(0.7_0.15_280)] bg-clip-text text-transparent">
              geboekt gesprek.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl">
            PROLEAD automatiseert je complete outreach pipeline. Lead research,
            gepersonaliseerde emails, AI replies en meeting booking.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-12 bg-white px-8 text-[oklch(0.2_0.12_264)] hover:bg-white/90 shadow-brand-lg font-semibold text-base"
              >
                Start gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button
                size="lg"
                variant="ghost"
                className="h-12 border border-white/15 px-8 text-white/70 hover:text-white hover:bg-white/5 text-base"
              >
                Bekijk features
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 flex items-center justify-center gap-12">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Icon className="h-4 w-4 text-[oklch(0.7_0.15_264)]" />
                    <span className="text-2xl font-bold text-white">
                      {stat.value}
                    </span>
                  </div>
                  <span className="mt-1 text-xs text-white/40 uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative bg-background px-6 py-24"
      >
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Features
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              6 AI Agents. 1 Platform.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Alles wat je nodig hebt voor end-to-end sales outreach automation.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 transition-colors group-hover:bg-primary/12">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Klaar om te starten?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Maak een account aan en begin vandaag nog met je eerste campaign.
          </p>
          <div className="mt-8">
            <Link href="/signup">
              <Button
                size="lg"
                className="h-12 px-8 shadow-brand font-semibold text-base"
              >
                Gratis beginnen
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-muted-foreground">
          <p>PROLEAD — GHAYM Group</p>
          <p>AI-powered Sales Outreach Platform</p>
        </div>
      </footer>
    </div>
  );
}
