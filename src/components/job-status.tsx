import type { JobStatus } from "@/lib/types";
import { cx } from "@/components/ui";

const STYLE: Record<JobStatus, string> = {
  Saved: "bg-sunken text-ink-2 border border-line",
  Applied: "bg-primary-soft text-primary-soft-ink",
  Interview: "bg-partial-bg text-partial",
  Offer: "bg-match-bg text-match",
  Rejected: "bg-missing-bg text-missing",
  Closed: "bg-unknown-bg text-unknown",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", STYLE[status])}>{status}</span>;
}
