"use client";

import { useEffect, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { cx } from "@/components/ui";

const STAGES = [
  "Reading the job advertisement",
  "Separating mandatory and preferred requirements",
  "Checking language requirements",
  "Comparing with your CV and profile",
  "Preparing truthful CV suggestions",
];

export function AnalysisProgress({ title = "Analysing the job", stages = STAGES }: { title?: string; stages?: string[] }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), 3500);
    return () => clearInterval(t);
  }, [stages.length]);
  return (
    <div className="enter mx-auto max-w-lg rounded-2xl border border-line bg-card p-6 sm:p-8" role="status" aria-live="polite">
      <h2 className="text-xl font-semibold">{title}…</h2>
      <p className="mt-1 text-sm text-muted">This usually takes 15–40 seconds. Please keep this page open.</p>
      <div className="progress-indeterminate mt-5 h-1.5 rounded-full bg-sunken" />
      <ol className="mt-6 space-y-3">
        {stages.map((s, i) => (
          <li key={s} className={cx("flex items-center gap-3 text-[15px] transition-colors duration-200", i > stage ? "text-muted/60" : "text-ink")}>
            <span className="grid size-5 place-items-center">
              {i < stage ? <Check className="size-4 text-match" aria-hidden /> : i === stage ? <LoaderCircle className="size-4 spin text-primary" aria-hidden /> : <span className="size-1.5 rounded-full bg-line-strong" />}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
