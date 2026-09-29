import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getApplication, getJob } from "@/lib/repo";
import { InterviewClient } from "@/components/interview-client";

export const metadata = { title: "Interview prep" };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!await getJob(user.id, id)) notFound();
  const analysis = await getAnalysis(id);
  if (!analysis) redirect(`/jobs/${id}/analysis`);
  const app = await getApplication(id);
  return <InterviewClient jobId={id} prep={app?.interview ?? null} languages={analysis.data.languages} />;
}
