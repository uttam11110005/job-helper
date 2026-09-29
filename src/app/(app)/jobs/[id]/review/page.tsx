import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { engine } from "@/lib/ai/engine";
import { getAnalysis, getJob, getJobImages } from "@/lib/repo";
import { JobTextReview } from "@/components/job-text-review";

export const metadata = { title: "Review extracted text" };

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  const images = (await getJobImages(id)).map((im) => ({ id: im.id, url: `/api/jobs/${id}/images/${im.id}` }));
  return (
    <JobTextReview
      jobId={id}
      initialText={job.raw_text}
      images={images}
      clientOcr={engine() === "demo"}
      warning={job.notes.startsWith("OCR_") ? job.notes : null}
      analyzed={Boolean(await getAnalysis(id))}
    />
  );
}
