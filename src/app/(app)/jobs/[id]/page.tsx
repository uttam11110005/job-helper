import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getJob } from "@/lib/repo";

export default async function JobIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  if (await getAnalysis(id)) redirect(`/jobs/${id}/analysis`);
  redirect(job.source_type === "images" ? `/jobs/${id}/review` : `/jobs/${id}/analysis`);
}
