import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <TooltipProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto bg-neutral-50 p-6 dark:bg-neutral-900">
              {children}
            </main>
          </div>
        </div>
        {/* Single root-mounted confirm dialog — any page can call useConfirm(). */}
        <ConfirmDialog />
      </TooltipProvider>
    </LanguageProvider>
  );
}
