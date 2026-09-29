import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getApplication, getJob, getLatestCV, getLatestTailoring } from "@/lib/repo";
import { EmptyState, LinkButton } from "@/components/ui";
import { ApplicationClient } from "@/components/application-client";
import { FileUser } from "lucide-react";

export const metadata = { title: "Application" };

export default async function ApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  if (!await getAnalysis(id)) redirect(`/jobs/${id}/analysis`);
  const t = await getLatestTailoring(id);
  const cv = await getLatestCV(user.id);
  if (!cv) {
    return (
      <EmptyState icon={<FileUser className="size-6" />} title="Add your CV first" action={<LinkButton href="/profile">Add my CV</LinkButton>}>
        Your application is written only from your real, verified experience.
      </EmptyState>
    );
  }
  const app = await getApplication(id);
  const draft = app?.message_fi ? { message_fi: app.message_fi, message_en: app.message_en, form_answers: app.form_answers } : null;
  const sourceLabel = t?.tailored ? `your approved tailored CV (version ${t.version})` : "your original CV (no tailored version yet)";
  return <ApplicationClient key={app?.updated_at ?? "none"} jobId={id} initial={draft} sourceLabel={sourceLabel} />;
}
