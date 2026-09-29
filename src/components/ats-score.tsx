"use client";

import { useMemo } from "react";
import { CircleCheck, CircleDashed, CircleX, Gauge, Info } from "lucide-react";
import { scoreATS, type CheckStatus } from "@/lib/ats";
import type { Analysis, CVData, CVDesign } from "@/lib/types";
import { Card, cx } from "@/components/ui";

const ICON: Record<CheckStatus, typeof CircleCheck> = { good: CircleCheck, ok: CircleDashed, poor: CircleX };
const TONE: Record<CheckStatus, string> = { good: "text-match", ok: "text-partial", poor: "text-missing" };

function Ring({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone = value >= 80 ? "var(--match)" : value >= 60 ? "var(--partial)" : "var(--missing)";
  return (
    <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="8" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        style={{ transition: "stroke-dashoffset 500ms var(--ease-out)" }}
      />
    </svg>
  );
}

export function ATSScoreCard({ cv, original, analysis, design }: { cv: CVData; original?: CVData; analysis: Analysis; design?: CVDesign }) {
  const result = useMemo(() => scoreATS(cv, analysis, design), [cv, analysis, design]);
  const before = useMemo(() => (original ? scoreATS(original, analysis, design).score : null), [original, analysis, design]);
  const missing = result.checks.find((c) => c.id === "keywords")?.missing ?? [];

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-semibold"><Gauge className="size-4.5 text-primary" aria-hidden /> Tentative ATS score</h2>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative">
          <Ring value={result.score} />
          <span className="absolute inset-0 grid place-items-center font-display text-xl font-semibold tabular-nums">{result.score}</span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{result.band}</p>
          {before !== null && before !== result.score && (
            <p className="text-sm text-muted">
              Original CV: <span className="tabular-nums">{before}</span>{" "}
              <span className={cx("font-semibold tabular-nums", result.score > before ? "text-match" : "text-missing")}>
                ({result.score > before ? "+" : ""}{result.score - before})
              </span>
            </p>
          )}
          <p className="mt-1 flex gap-1.5 text-[12px] leading-snug text-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden /> Estimate — real employer systems differ and don&apos;t share their scoring.
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
        {result.checks.map((c) => {
          const Icon = ICON[c.status];
          return (
            <li key={c.id} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium"><Icon className={cx("size-4", TONE[c.status])} aria-hidden />{c.label}</span>
                <span className="text-xs text-muted tabular-nums">{c.points}/{c.max}</span>
              </div>
              <p className="mt-0.5 pl-6 text-[12.5px] leading-snug text-muted">{c.detail}</p>
            </li>
          );
        })}
      </ul>

      {missing.length > 0 && (
        <div className="mt-4 rounded-xl bg-sunken p-3">
          <p className="text-[12.5px] font-medium text-ink-2">Keywords not in your CV</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {missing.map((k) => (
              <li key={k} className="rounded-full border border-dashed border-line-strong px-2 py-0.5 text-[12px] text-muted">{k}</li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-snug text-muted">Only add a keyword if it&apos;s true for you — never to game the score.</p>
        </div>
      )}
    </Card>
  );
}
