import Link from "next/link";
import { Crown } from "lucide-react";
import { FREE_LIMIT, type UsageState } from "@/lib/billing";
import { cx } from "@/components/ui";

export function UsagePill({ usage }: { usage: UsageState }) {
  if (usage.isPro) {
    return (
      <Link href="/billing" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-semibold text-primary-soft-ink">
        <Crown className="size-3.5" aria-hidden /> Pro
      </Link>
    );
  }
  return (
    <Link
      href={usage.remaining ? "/dashboard" : "/checkout"}
      className={cx(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium whitespace-nowrap",
        usage.remaining ? "border-line bg-card text-ink-2" : "border-transparent bg-partial-bg text-partial",
      )}
    >
      <Dots used={usage.used} />
      <span className="tabular-nums">
        {usage.remaining} of {FREE_LIMIT}
        <span className="hidden sm:inline"> free left</span>
      </span>
    </Link>
  );
}

export function Dots({ used, large }: { used: number; large?: boolean }) {
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: FREE_LIMIT }, (_, i) => (
        <span key={i} className={cx("rounded-full", large ? "size-3" : "size-2", i < used ? "bg-line-strong" : "bg-primary")} />
      ))}
    </span>
  );
}
