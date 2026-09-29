import { notFound } from "next/navigation";
import { ArrowRight, BookOpenText, Info, Languages, ListChecks, Quote, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getJob, getLatestCV } from "@/lib/repo";
import { FIT_LABEL, FIT_MEANING, fitCounts, guidanceIndicator } from "@/lib/fit";
import type { FitStatus, Requirement } from "@/lib/types";
import { Badge, Card, CardHeader, FitBadge, LinkButton, Notice } from "@/components/ui";
import { JobTextReview } from "@/components/job-text-review";
import { RerunButton } from "@/components/rerun-button";
import { MatchVerdict } from "@/components/match-verdict";

export const metadata = { title: "Job analysis" };

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  const rec = await getAnalysis(id);

  if (!rec) {
    return (
      <>
        <Notice tone="info" className="mb-6">This job hasn&apos;t been analysed yet. Check the text and run the analysis.</Notice>
        <JobTextReview jobId={id} initialText={job.raw_text} images={[]} clientOcr={false} warning={null} analyzed={false} />
      </>
    );
  }

  const a = rec.data;
  const counts = fitCounts(a);
  const indicator = guidanceIndicator(a);
  const hasCV = Boolean(await getLatestCV(user.id));
  const groups: { key: Requirement["category"]; title: string }[] = [
    { key: "mandatory", title: "Mandatory" },
    { key: "preferred", title: "Preferred (an advantage)" },
    { key: "unspecified", title: "Other requirements" },
  ];

  return (
    <div className="enter-stagger space-y-6">
      {hasCV && (
        <MatchVerdict
          pct={indicator}
          missing={a.requirements.filter((r) => r.status === "missing" && r.category === "mandatory").map((r) => r.text_en.replace(/^About: /, "") || r.text_original)}
        >
          <LinkButton href={`/jobs/${id}/tailor`} variant={indicator !== null && indicator < 60 ? "secondary" : "primary"} size="sm">
            {indicator !== null && indicator < 60 ? "See options" : "Rewrite my CV for this job"} <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </MatchVerdict>
      )}
      {/* Summary + fit overview */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="What this job is" icon={<BookOpenText className="size-5" />} />
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <p className="text-[16px] leading-relaxed text-ink-2">{a.summary}</p>
            <div className="flex flex-wrap gap-2">
              {a.job.employment_type && <Badge>{a.job.employment_type}</Badge>}
              {a.job.location && <Badge>{a.job.location}</Badge>}
              {a.job.deadline && <Badge tone="primary">Deadline {a.job.deadline}</Badge>}
            </div>
            {a.responsibilities.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink-2">Main duties</h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {a.responsibilities.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[15px]">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold">Requirements checked</h2>
          {hasCV ? (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-2">
                {(["match", "partial", "missing", "unknown"] as FitStatus[]).map((s) => (
                  <div key={s} className="rounded-xl bg-sunken px-3 py-2.5" title={FIT_MEANING[s]}>
                    <dt><FitBadge status={s} /></dt>
                    <dd className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{counts[s]}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Add your CV to see how you match each requirement.</p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <LinkButton href={`/jobs/${id}/tailor`}>
              Next: match & rewrite <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
            <RerunButton jobId={id} />
          </div>
        </Card>
      </div>

      {/* Requirements */}
      <Card>
        <CardHeader
          title="Requirements & fit check"
          icon={<ListChecks className="size-5" />}
          description="Each requirement compared with your CV and profile."
        />
        <div className="divide-y divide-line">
          {groups.map((g) => {
            const reqs = a.requirements.filter((r) => r.category === g.key);
            if (!reqs.length) return null;
            return (
              <section key={g.key} className="px-5 py-4 sm:px-6">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{g.title}</h3>
                <ul className="space-y-3">
                  {reqs.map((r) => (
                    <li key={`${r.id}-${r.text_original}`} className="rounded-xl border border-line bg-bg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium" lang="fi">{r.text_original}</p>
                          <p className="mt-0.5 text-sm text-muted">{r.text_en}</p>
                        </div>
                        <FitBadge status={r.status} />
                      </div>
                      <p className="mt-2.5 text-sm text-ink-2">{r.explanation}</p>
                      {r.evidence && (
                        <p className="mt-2 flex gap-2 rounded-lg bg-card px-3 py-2 text-sm text-ink-2">
                          <Quote className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                          <span><span className="font-medium">From your CV:</span> {r.evidence}</span>
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {a.requirements.length === 0 && <p className="px-6 py-5 text-sm text-muted">No explicit requirements were found in this ad.</p>}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line px-5 py-3 text-xs text-muted sm:px-6">
          {(["match", "partial", "missing", "unknown"] as FitStatus[]).map((s) => (
            <span key={s}><span className="font-semibold text-ink-2">{FIT_LABEL[s]}:</span> {FIT_MEANING[s]}</span>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Languages */}
        <Card>
          <CardHeader title="Language requirements" icon={<Languages className="size-5" />} />
          {a.languages.length ? (
            <ul className="divide-y divide-line">
              {a.languages.map((l, i) => (
                <li key={`${l.language}-${i}`} className="flex items-start justify-between gap-3 px-5 py-4 sm:px-6">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {l.language} <span className="font-normal text-muted">· {l.mandatory ? "required" : "an advantage"}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-2">Asked: <span className="font-medium">{l.required_level}</span> · You: <span className="font-medium">{l.applicant_level}</span></p>
                    {l.note && <p className="mt-1 text-[13px] text-muted" lang="fi">“{l.note}”</p>}
                  </div>
                  <FitBadge status={l.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-5 text-sm text-muted">The ad doesn&apos;t state a language requirement.</p>
          )}
        </Card>

        {/* Vocabulary */}
        <Card>
          <CardHeader title="Key Finnish words" icon={<BookOpenText className="size-5" />} description="Words from this ad worth knowing." />
          <dl className="grid gap-px bg-line sm:grid-cols-2">
            {a.vocabulary.map((v, i) => (
              <div key={`${v.fi}-${i}`} className="bg-card px-5 py-3">
                <dt className="font-medium text-primary" lang="fi">{v.fi}</dt>
                <dd className="text-sm text-ink-2">{v.en}{v.note && <span className="block text-[13px] text-muted">{v.note}</span>}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      {a.uncertainty.length > 0 && (
        <Notice tone="warn" icon={<TriangleAlert className="size-4" />}>
          <p className="font-semibold">Things we&apos;re unsure about</p>
          <ul className="mt-1 list-disc pl-4">{a.uncertainty.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </Notice>
      )}
      <p className="text-center text-xs text-muted">
        Analysed {new Date(rec.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
        {rec.engine !== "demo" ? "AI analysis" : "Offline demo engine"}
      </p>
    </div>
  );
}
