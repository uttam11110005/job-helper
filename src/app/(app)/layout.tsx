import { Logo } from "@/components/logo";
import { DesktopNav, MobileTabBar, UserMenu } from "@/components/app-nav";
import { UsagePill } from "@/components/usage-meter";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/billing";
import { engine } from "@/lib/ai/engine";

// AI calls (analysis, rewrite) can take up to a minute on free tiers.
export const maxDuration = 60;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const usage = await getUsage(user.id);
  return (
    <div className="min-h-dvh pb-20 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Logo href="/dashboard" />
            <DesktopNav />
          </div>
          <div className="flex items-center gap-2.5">
            {engine() === "demo" && (
              <span
                className="hidden h-8 items-center whitespace-nowrap rounded-full bg-partial-bg px-3 text-xs font-medium text-partial xl:inline-flex"
                title="No OPENAI_API_KEY set — using the offline demo engine"
              >
                Demo
              </span>
            )}
            <UsagePill usage={usage} />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <MobileTabBar />
    </div>
  );
}
