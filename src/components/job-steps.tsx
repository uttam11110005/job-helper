"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, ClipboardList, FilePen, FileText, MessagesSquare, ScanText, Send, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui";

export interface Step {
  slug: string;
  label: string;
  icon: string;
  enabled: boolean;
  done: boolean;
}

const ICONS: Record<string, LucideIcon> = { ScanText, BookOpenText, FilePen, FileText, Send, MessagesSquare, ClipboardList };

export function JobSteps({ jobId, steps }: { jobId: string; steps: Step[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Job workflow" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
      <ol className="flex min-w-max gap-1 rounded-2xl border border-line bg-card p-1.5">
        {steps.map((s, i) => {
          const href = `/jobs/${jobId}/${s.slug}`;
          const active = path === href;
          const Icon = ICONS[s.icon];
          const inner = (
            <>
              <span
                className={cx(
                  "grid size-6 place-items-center rounded-full text-[11px] font-semibold tabular-nums",
                  active ? "bg-primary text-primary-ink" : s.done ? "bg-match-bg text-match" : "bg-sunken text-muted",
                )}
              >
                {Icon ? <Icon className="size-3.5" aria-hidden /> : i + 1}
              </span>
              {s.label}
            </>
          );
          return (
            <li key={s.slug}>
              {s.enabled ? (
                <Link
                  href={href}
                  aria-current={active ? "step" : undefined}
                  className={cx(
                    "pressable flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap",
                    active ? "bg-primary-soft text-primary-soft-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
                  )}
                >
                  {inner}
                </Link>
              ) : (
                <span aria-disabled className="flex h-10 cursor-not-allowed items-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap text-muted/60">
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
