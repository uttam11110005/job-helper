import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getJob, getTailoring } from "@/lib/repo";
import { CVDocument } from "@/components/cv-templates";
import { PrintBar } from "@/components/print-bar";

export const metadata = { title: "CV — print" };

export default async function PrintCV({ params, searchParams }: { params: Promise<{ jobId: string; tailoringId: string }>; searchParams: Promise<{ print?: string }> }) {
  const { jobId, tailoringId } = await params;
  const { print } = await searchParams;
  const user = await requireUser();
  const job = await getJob(user.id, jobId);
  const t = job ? await getTailoring(jobId, tailoringId) : null;
  if (!t?.tailored) notFound();
  return (
    <div className="min-h-dvh bg-sunken py-6 print:bg-white print:py-0">
      <PrintBar autoPrint={print === "1"} />
      <CVDocument cv={t.tailored} className="shadow-float" />
    </div>
  );
}
