import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert } from "lucide-react";
import { cx } from "@/components/ui";

export type VerdictLevel = "high" | "mid" | "low" | "unknown";

/** ≥70 go · 60–69 borderline · <60 recommend not applying. */
export function verdictLevel(pct: number | null): VerdictLevel {
  if (pct === null) return "unknown";
  if (pct >= 70) return "high";
  if (pct >= 60) return "mid";
  return "low";
}

const COPY: Record<VerdictLevel, { title: string; body: (p: number | null) => string; icon: typeof CircleCheck; box: string; accent: string }> = {
  high: {
    title: "Good match — go ahead and apply",
    body: (p) => `Your CV covers about ${p}% of what this job asks for. Let Job Helper rewrite your CV for this job.`,
    icon: CircleCheck,
    box: "bg-match-bg",
    accent: "text-match",
  },
  mid: {
    title: "Borderline match",
    body: (p) => `Your CV covers about ${p}% of the requirements. You can apply, but address the gaps below in your CV and application.`,
    icon: TriangleAlert,
    box: "bg-partial-bg",
    accent: "text-partial",
  },
  low: {
    title: "We recommend not applying to this job",
    body: (p) =>
      `Your CV covers only about ${p}% of the requirements (below 60%). Your time is better spent on jobs closer to your experience — or close the gaps below first.`,
    icon: OctagonAlert,
    box: "bg-missing-bg",
    accent: "text-missing",
  },
  unknown: {
    title: "Match couldn’t be calculated",
    body: () =>
      "This ad doesn’t list requirements we could check against your CV. Read the duties yourself — or add a free AI key (Gemini) and re-run the analysis for a full reading.",
    icon: CircleHelp,
    box: "bg-unknown-bg",
    accent: "text-unknown",
  },
};

export function MatchVerdict({ pct, missing = [], children, className, noCV }: { pct: number | null; missing?: string[]; children?: React.ReactNode; className?: string; noCV?: boolean }) {
  const level = verdictLevel(pct);
  const c = COPY[level];
  return (
    <section className={cx("rounded-2xl p-5 sm:p-6", c.box, className)} aria-label="Job match">
      <div className="flex items-start gap-4">
        <div className={cx("shrink-0 text-center", c.accent)}>
          <div className="font-display text-[40px] leading-none font-semibold tabular-nums">{pct ?? "–"}<span className="text-xl">%</span></div>
          <div className="mt-1 text-[11px] font-semibold tracking-wide uppercase">Job match</div>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className={cx("flex items-center gap-2 text-lg font-semibold", c.accent)}>
            <c.icon className="size-5 shrink-0" aria-hidden /> {c.title}
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">{noCV ? "Add your CV, then re-run the analysis to see how well you match this job." : c.body(pct)}</p>
          {level === "low" && missing.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
              {missing.slice(0, 4).map((m) => <li key={m}>Missing: {m}</li>)}
            </ul>
          )}
          <p className="mt-2 text-[12px] text-muted">Guidance based on the requirements we could check — not a prediction of whether you’ll be hired.</p>
          {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </section>
  );
}
