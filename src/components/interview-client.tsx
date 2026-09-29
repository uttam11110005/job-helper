"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Languages, MessagesSquare, Quote, RefreshCw, Sparkles } from "lucide-react";
import { generateInterviewAction } from "@/app/actions/jobs";
import type { InterviewCategory, InterviewPrep, LanguageRequirement } from "@/lib/types";
import { Button, Card, CardHeader, EmptyState, FitBadge, LinkButton, cx } from "@/components/ui";
import { AnalysisProgress } from "@/components/analysis-progress";
import { CopyButton } from "@/components/application-client";

type Lang = "fi" | "en" | "both";

const LANG_OPTIONS: { key: Lang; label: string }[] = [
  { key: "fi", label: "Suomi" },
  { key: "en", label: "English" },
  { key: "both", label: "Both" },
];

const CATEGORY_LABEL: Record<InterviewCategory, string> = {
  experience: "Experience",
  motivation: "Motivation",
  practical: "Practical",
  language: "Language",
  gap: "Gaps",
};

const STORAGE_KEY = "fjh.interviewLang";

export function InterviewClient({ jobId, prep, languages }: { jobId: string; prep: InterviewPrep | null; languages: LanguageRequirement[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lang, setLang] = useState<Lang>("both");
  const [filter, setFilter] = useState<InterviewCategory | "all">("all");

  // Remember the practice language per viewer (convenience only).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && ["fi", "en", "both"].includes(saved)) setLang(saved);
    } catch {}
  }, []);
  const chooseLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  };

  const generate = () =>
    start(async () => {
      const r = await generateInterviewAction(jobId);
      if (!r.ok) toast.error(r.error);
      else router.refresh();
    });

  if (pending) return <AnalysisProgress title="Preparing interview questions" />;
  if (!prep) {
    return (
      <EmptyState icon={<MessagesSquare className="size-6" />} title="Prepare for the interview" action={<Button onClick={generate}>Generate interview prep</Button>}>
        Role-specific questions in Finnish and English, a language-level check, sample answers from your real experience, and useful Finnish phrases.
      </EmptyState>
    );
  }

  const outdated = prep.questions.some((q) => !q.category) || !prep.language_check;
  const categories = [...new Set(prep.questions.map((q) => q.category).filter(Boolean))] as InterviewCategory[];
  const shown = filter === "all" ? prep.questions : prep.questions.filter((q) => q.category === filter);
  const showFi = lang !== "en";
  const showEn = lang !== "fi";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Likely questions</h2>
          <div className="flex items-center gap-2">
            <div role="radiogroup" aria-label="Practice language" className="inline-flex rounded-xl bg-sunken p-1">
              {LANG_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  role="radio"
                  aria-checked={lang === o.key}
                  onClick={() => chooseLang(o.key)}
                  className={cx("pressable h-8 cursor-pointer rounded-lg px-3 text-sm font-medium", lang === o.key ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink")}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={generate} aria-label="Regenerate interview prep">
              <RefreshCw className="size-4" aria-hidden /> <span className="hidden sm:inline">Regenerate</span>
            </Button>
          </div>
        </div>

        {outdated && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-soft-ink">
            <span>New: language questions, a language check and sample answers. Regenerate to get them for this job.</span>
            <Button size="sm" onClick={generate}>Regenerate</Button>
          </div>
        )}

        {categories.length > 1 && (
          <nav aria-label="Filter questions" className="flex flex-wrap gap-2">
            {(["all", ...categories] as const).map((c) => {
              const count = c === "all" ? prep.questions.length : prep.questions.filter((q) => q.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  aria-pressed={filter === c}
                  className={cx(
                    "pressable inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium",
                    filter === c ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line bg-card text-ink-2 hover:border-line-strong",
                  )}
                >
                  {c === "language" && <Languages className="size-3.5" aria-hidden />}
                  {c === "all" ? "All" : CATEGORY_LABEL[c]} <span className="text-xs tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </nav>
        )}

        <p className="text-sm text-muted">Try answering out loud first, then open the question for tips and a sample answer.</p>
        <ol className="space-y-3">
          {shown.map((q) => {
            const n = prep.questions.indexOf(q) + 1;
            return (
              <li key={`${n}-${q.question_en}`}>
                <details className="group rounded-2xl border border-line bg-card">
                  <summary className="flex cursor-pointer list-none gap-4 px-5 py-4">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-ink tabular-nums">{n}</span>
                    <span className="min-w-0 flex-1">
                      {showFi && <span className="block font-medium" lang="fi">{q.question_fi}</span>}
                      {showEn && <span className={cx("block", showFi ? "text-sm text-muted" : "font-medium")}>{q.question_en}</span>}
                      {q.category && (
                        <span className={cx("mt-1.5 inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold", q.category === "language" ? "bg-primary-soft text-primary-soft-ink" : "bg-sunken text-muted")}>
                          {CATEGORY_LABEL[q.category]}
                        </span>
                      )}
                    </span>
                    <span className="text-xl leading-none text-muted transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-45" aria-hidden>+</span>
                  </summary>
                  <div className="space-y-3 border-t border-line px-5 py-4 text-sm sm:pl-16">
                    <p className="text-muted"><span className="font-medium text-ink-2">Why they ask:</span> {q.why}</p>
                    <p className="text-ink-2"><span className="font-medium">How to answer:</span> {q.answer_hint}</p>
                    {(q.sample_answer_fi || q.sample_answer_en) && (
                      <div className="rounded-xl border border-suggest-border bg-suggest-bg/60 p-3">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-suggest">
                            <Sparkles className="size-3.5" aria-hidden /> Suggested answer — say it in your own words
                          </span>
                          {showFi && q.sample_answer_fi && <CopyButton text={q.sample_answer_fi} label="Copy" />}
                        </div>
                        {showFi && q.sample_answer_fi && <p className="text-suggest" lang="fi">{q.sample_answer_fi}</p>}
                        {showEn && q.sample_answer_en && <p className={cx(showFi ? "mt-1 text-muted" : "text-suggest")}>{q.sample_answer_en}</p>}
                      </div>
                    )}
                    {q.evidence && (
                      <p className="flex gap-2 rounded-lg bg-sunken px-3 py-2 text-ink-2">
                        <Quote className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden /> From your CV: {q.evidence}
                      </p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader title="Language check" icon={<Languages className="size-5" />} description="What the ad asks vs. what you stated." />
          {languages.length > 0 ? (
            <ul className="divide-y divide-line">
              {languages.map((l, i) => (
                <li key={`${l.language}-${i}`} className="flex items-start justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{l.language} <span className="font-normal text-muted">· {l.mandatory ? "required" : "an advantage"}</span></p>
                    <p className="text-ink-2">Asked {l.required_level} · You {l.applicant_level}</p>
                  </div>
                  <FitBadge status={l.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-muted">No language requirement in the ad.</p>
          )}
          {prep.language_check && (
            <div className="border-t border-line px-5 py-4 text-sm">
              <p className="text-ink-2">{prep.language_check.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
                {prep.language_check.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader title="Useful Finnish phrases" />
          <ul className="divide-y divide-line">
            {prep.phrases.map((p, i) => (
              <li key={i} className="flex items-start justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium" lang="fi">{p.fi}</p>
                  {lang !== "fi" && <p className="text-sm text-muted">{p.en}</p>}
                </div>
                <CopyButton text={p.fi} label="Copy phrase" />
              </li>
            ))}
          </ul>
        </Card>
        <LinkButton href={`/jobs/${jobId}/track`} variant="soft" className="w-full">
          Next: track this application <ArrowRight className="size-4" aria-hidden />
        </LinkButton>
      </aside>
    </div>
  );
}
