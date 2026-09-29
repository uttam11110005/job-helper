import { notFound, redirect } from "next/navigation";
import { CircleCheck, CircleX, FileUser, KeyRound, LayoutList, Lightbulb, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getJob, getLatestCV, getLatestTailoring } from "@/lib/repo";
import { guidanceIndicator } from "@/lib/fit";
import { Card, CardHeader, EmptyState, LinkButton } from "@/components/ui";
import { RewritePanel } from "@/components/rewrite-panel";
import { RerunButton } from "@/components/rerun-button";

export const metadata = { title: "Match & rewrite" };

export default async function TailorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  const analysis = await getAnalysis(id);
  if (!analysis) redirect(`/jobs/${id}/analysis`);
  const t = await getLatestTailoring(id);
  const cv = await getLatestCV(user.id);

  if (!cv) {
    return (
      <EmptyState
        icon={<FileUser className="size-6" />}
        title="Add your CV to get tailored suggestions"
        action={
          <div className="flex flex-col items-center gap-2">
            <LinkButton href="/profile">Add my CV</LinkButton>
            <RerunButton jobId={id} />
          </div>
        }
      >
        Once your CV is saved, re-run the analysis for this job (free) to compare it with the requirements.
      </EmptyState>
    );
  }

  const a = analysis.data;
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="enter-stagger space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pb-4">
        <Card>
          <CardHeader title="Strengths" icon={<Sparkles className="size-5" />} description="Relevant evidence already in your CV." />
          <ul className="space-y-3 px-5 py-4">
            {a.strengths.length ? a.strengths.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-match" aria-hidden />
                <span><span className="font-medium">{s.title}</span>{s.evidence && <span className="block text-muted">{s.evidence}</span>}</span>
              </li>
            )) : <li className="text-sm text-muted">No direct matches found.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Gaps" icon={<Lightbulb className="size-5" />} description="Requirements your CV doesn't show." />
          <ul className="space-y-3 px-5 py-4">
            {a.gaps.length ? a.gaps.map((g, i) => (
              <li key={i} className="text-sm">
                <p className="flex gap-2.5 font-medium"><CircleX className="mt-0.5 size-4 shrink-0 text-missing" aria-hidden />{g.title}</p>
                <p className="mt-1 pl-6.5 text-muted">{g.detail}</p>
                <p className="mt-1 pl-6.5 text-ink-2">{g.advice}</p>
              </li>
            )) : <li className="text-sm text-muted">No clear gaps found.</li>}
          </ul>
        </Card>
        {a.keywords.length > 0 && (
          <Card>
            <CardHeader title="Job keywords" icon={<KeyRound className="size-5" />} description="Used only where your CV supports them." />
            <ul className="flex flex-wrap gap-1.5 px-5 py-4">
              {a.keywords.map((k, i) => (
                <li
                  key={`${k.term}-${i}`}
                  title={k.supported ? `Supported: ${k.evidence}` : "Not supported by your CV — won't be added"}
                  className={k.supported ? "rounded-full bg-match-bg px-2.5 py-1 text-xs font-medium text-match" : "rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs text-muted line-through decoration-muted/40"}
                >
                  {k.term}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {a.structure_advice.length > 0 && (
          <Card>
            <CardHeader title="Structure" icon={<LayoutList className="size-5" />} />
            <ul className="list-disc space-y-1.5 py-4 pr-5 pl-9 text-sm text-ink-2">
              {a.structure_advice.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </Card>
        )}
      </aside>
      <div className="min-w-0">
        <RewritePanel
          jobId={id}
          pct={guidanceIndicator(a)}
          missing={a.requirements.filter((r) => r.status === "missing" && r.category === "mandatory").map((r) => r.text_en.replace(/^About: /, "") || r.text_original)}
          strategy={a.cv_strategy}
          existing={t?.tailored ? { id: t.id, version: t.version, approved: t.meta.approved } : null}
        />
      </div>
    </div>
  );
}
