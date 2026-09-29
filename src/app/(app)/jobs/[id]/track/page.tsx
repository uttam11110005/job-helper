import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Send } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getApplication, getJob, getTailoring, listTailorings } from "@/lib/repo";
import { Card, CardHeader } from "@/components/ui";
import { TrackForm } from "@/components/track-form";

export const metadata = { title: "Tracking" };

export default async function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  const app = await getApplication(id);
  const usedCV = app?.tailoring_id ? await getTailoring(id, app.tailoring_id) : null;
  const versions = (await listTailorings(id)).filter((t) => t.tailored);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-5 sm:p-6">
        <TrackForm
          jobId={id}
          initial={{
            status: job.status,
            title: job.title,
            employer: job.employer,
            location: job.location,
            deadline: job.deadline ?? "",
            applied_at: job.applied_at ?? "",
            notes: job.notes.startsWith("OCR_") ? "" : job.notes,
          }}
        />
      </Card>
      <aside className="space-y-4">
        <Card>
          <CardHeader title="Materials for this job" description="The exact versions associated with this application." />
          <ul className="divide-y divide-line text-sm">
            <li className="flex items-start gap-3 px-5 py-4">
              <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">Tailored CV</p>
                {versions.length ? (
                  <ul className="mt-1 space-y-0.5">
                    {versions.map((t) => (
                      <li key={t.id}>
                        <Link href={`/jobs/${id}/cv?v=${t.id}`} className="text-primary hover:underline">Version {t.version}</Link>
                        {usedCV?.id === t.id && <span className="ml-1.5 text-xs text-muted">(used for application)</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">Not created yet</p>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3 px-5 py-4">
              <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">Application</p>
                {app?.message_fi ? (
                  <Link href={`/jobs/${id}/application`} className="text-primary hover:underline">
                    Saved {new Date(app.updated_at).toLocaleDateString("en-GB")}
                  </Link>
                ) : (
                  <p className="text-muted">Not written yet</p>
                )}
              </div>
            </li>
          </ul>
        </Card>
        <p className="px-1 text-xs text-muted">Added {new Date(job.created_at).toLocaleDateString("en-GB")} · via {job.source_type === "images" ? "screenshots" : "pasted text"}</p>
      </aside>
    </div>
  );
}
