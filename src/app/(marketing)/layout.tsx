import Link from "next/link";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/#how" className="hidden rounded-lg px-3 py-2 text-sm text-ink-2 hover:text-ink sm:block">How it works</Link>
            <Link href="/pricing" className="hidden rounded-lg px-3 py-2 text-sm text-ink-2 hover:text-ink sm:block">Pricing</Link>
            {user ? (
              <LinkButton href="/dashboard" size="sm">Open dashboard</LinkButton>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:text-ink">Log in</Link>
                <LinkButton href="/signup" size="sm">Start free</LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Job Helper. Guidance tool — not a hiring prediction.</p>
          <div className="flex gap-5">
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
