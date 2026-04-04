import { Sparkles, Target, BarChart3 } from "lucide-react";

const features = [
  { icon: Sparkles, text: "6 AI Agents die samenwerken" },
  { icon: Target, text: "ICP-gebaseerde lead scoring" },
  { icon: BarChart3, text: "Real-time analytics & A/B testing" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/5 blur-[80px]" />
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-white/5 blur-[60px]" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-14">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <span className="text-xl font-bold text-white">P</span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">
              PROLEAD
            </span>
          </div>
          <h2 className="text-4xl font-bold text-white leading-[1.15] tracking-tight">
            Van koude lead tot
            <br />
            geboekt gesprek.
          </h2>
          <p className="mt-5 text-lg text-white/50 max-w-md leading-relaxed">
            AI-powered sales outreach automation voor B2B teams.
          </p>
          <div className="mt-14 space-y-5">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.text}
                  className="flex items-center gap-3 text-white/70"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 border border-white/10">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Form Panel */}
      <div className="flex flex-1 items-center justify-center bg-background p-6">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
