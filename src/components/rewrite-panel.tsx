"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, BriefcaseBusiness, Search, Shuffle, Sparkles } from "lucide-react";
import { rewriteCVAction } from "@/app/actions/jobs";
import type { CVFormat } from "@/lib/types";
import { Badge, Button, LinkButton, cx } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { AnalysisProgress } from "@/components/analysis-progress";
import { MatchVerdict, verdictLevel } from "@/components/match-verdict";

const FORMATS: { key: CVFormat; name: string; icon: typeof Shuffle; body: string }[] = [
  { key: "experience", name: "Experience-focused", icon: BriefcaseBusiness, body: "You have relevant experience. Jobs in detail, newest first." },
  { key: "skills", name: "Career change", icon: Shuffle, body: "You're switching field. Expertise areas first; jobs listed compactly." },
];

const STAGES = [
  "Reading your whole CV",
  "Matching it to the job requirements",
  "Rewriting headline and summary",
  "Choosing only relevant skills",
  "Checking every fact against your CV",
];

export function RewritePanel({
  jobId,
  pct,
  missing,
  strategy,
  existing,
}: {
  jobId: string;
  pct: number | null;
  missing: string[];
  strategy?: { recommended: CVFormat; reason: string };
  existing: { id: string; version: number; approved: boolean } | null;
}) {
  const router = useRouter();
  const [format, setFormat] = useState<CVFormat>(strategy?.recommended ?? "experience");
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const level = verdictLevel(pct);

  const rewrite = () =>
    start(async () => {
      setConfirm(false);
      const r = await rewriteCVAction(jobId, format);
      if (!r.ok) return void toast.error(r.error);
      router.push(`/jobs/${jobId}/cv?v=${r.id}`);
    });

  if (pending) return <AnalysisProgress title="Rewriting your CV for this job" stages={STAGES} />;

  return (
    <div className="space-y-5">
      <MatchVerdict pct={pct} missing={missing}>
        {level === "low" && (
          <LinkButton href="/jobs/new" variant="secondary" size="sm">
            <Search className="size-4" aria-hidden /> Analyse a better-matched job
          </LinkButton>
        )}
      </MatchVerdict>

      <section aria-labelledby="cv-type" className="rounded-2xl border border-line bg-card p-5">
        <h2 id="cv-type" className="text-lg font-semibold">Which CV fits this job?</h2>
        {strategy && <p className="mt-0.5 text-sm text-muted">{strategy.reason}</p>}
        <div role="radiogroup" aria-labelledby="cv-type" className="mt-3 grid gap-2 sm:grid-cols-2">
          {FORMATS.map((f) => {
            const active = format === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFormat(f.key)}
                className={cx(
                  "pressable flex cursor-pointer gap-3 rounded-xl border p-3.5 text-left",
                  active ? "border-primary bg-primary-soft/60 ring-1 ring-primary" : "border-line hover:border-line-strong",
                )}
              >
                <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg", active ? "bg-primary text-primary-ink" : "bg-sunken text-muted")}>
                  <f.icon className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {f.name}
                    {strategy?.recommended === f.key && <Badge tone="match">Recommended</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{f.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Rewrite my CV for this job</h2>
        <p className="mt-1 text-sm text-muted">
          Job Helper reads your whole CV and rewrites the headline, summary, experience points and a relevant-only skills list for this job. Your job titles, employers, dates and education are never changed. You’ll check everything before choosing a template.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => (level === "low" ? setConfirm(true) : rewrite())} variant={level === "low" ? "secondary" : "primary"}>
            <Sparkles className="size-4" aria-hidden /> {existing ? "Rewrite again" : "Rewrite my CV"}
          </Button>
          {existing && (
            <Link href={`/jobs/${jobId}/cv?v=${existing.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Open version {existing.version} {existing.approved ? "" : "(not checked yet)"} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Rewrite anyway?">
        <p className="text-[15px] text-ink-2">
          Your CV matches only about {pct}% of this job. We recommend spending your time on better-matched jobs. You can still rewrite your CV — it will stay truthful, so it can’t hide the missing requirements.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <LinkButton href="/jobs/new" variant="ghost">Find a better match</LinkButton>
          <Button onClick={rewrite}>Rewrite anyway</Button>
        </div>
      </Dialog>
    </div>
  );
}
