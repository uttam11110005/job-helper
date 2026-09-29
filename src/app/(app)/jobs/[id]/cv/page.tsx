import { notFound, redirect } from "next/navigation";
import { FilePen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getCV, getJob, getLatestTailoring, getTailoring, listTailorings } from "@/lib/repo";
import { EmptyState, LinkButton } from "@/components/ui";
import { CVWorkspace } from "@/components/cv-workspace";
import { normalizeCV } from "@/lib/ai/engine";

export const metadata = { title: "Tailored CV" };

export default async function CVPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v } = await searchParams;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  const analysis = await getAnalysis(id);
  if (!analysis) redirect(`/jobs/${id}/analysis`);
  const t = (v && await getTailoring(id, v)) || await getLatestTailoring(id);
  const source = t ? await getCV(user.id, t.source_cv_id) : null;

  if (!t || !t.tailored || !source) {
    return (
      <EmptyState
        icon={<FilePen className="size-6" />}
        title="No rewritten CV yet"
        action={<LinkButton href={`/jobs/${id}/tailor`}>Match & rewrite</LinkButton>}
      >
        Check your job match, then let Job Helper rewrite your CV for this job.
      </EmptyState>
    );
  }

  const versions = (await listTailorings(id)).map((x) => ({ id: x.id, version: x.version, updated_at: x.updated_at, generated: Boolean(x.tailored) }));
  return (
    <CVWorkspace
      key={`${t.id}-${t.updated_at}`}
      jobId={id}
      tailoringId={t.id}
      version={t.version}
      original={normalizeCV(source.parsed)}
      tailored={t.tailored}
      versions={versions}
      analysis={analysis.data}
      meta={t.meta}
    />
  );
}
