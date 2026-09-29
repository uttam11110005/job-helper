import { notFound } from "next/navigation";
import { Building2, CalendarClock, MapPin } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getAnalysis, getApplication, getJob, getLatestTailoring } from "@/lib/repo";
import { JobSteps, type Step } from "@/components/job-steps";
import { StatusBadge } from "@/components/job-status";

export default async function JobLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const job = await getJob(user.id, id);
  if (!job) notFound();
  const analysis = await getAnalysis(id);
  const tailoring = await getLatestTailoring(id);
  const app = await getApplication(id);
  const has = Boolean(analysis);

  const steps: Step[] = [
    ...(job.source_type === "images" ? [{ slug: "review", label: "Screenshot text", icon: "ScanText", enabled: true, done: has }] : []),
    { slug: "analysis", label: "Job analysis", icon: "BookOpenText", enabled: true, done: has },
    { slug: "tailor", label: "Match & rewrite", icon: "FilePen", enabled: has, done: Boolean(tailoring?.tailored) },
    { slug: "cv", label: "Check & finish CV", icon: "FileText", enabled: has, done: Boolean(tailoring?.tailored && tailoring.meta.approved) },
    { slug: "application", label: "Application", icon: "Send", enabled: has, done: Boolean(app?.message_fi) },
    { slug: "interview", label: "Interview prep", icon: "MessagesSquare", enabled: has, done: Boolean(app?.interview) },
    { slug: "track", label: "Tracking", icon: "ClipboardList", enabled: true, done: job.status !== "Saved" },
  ];

  const deadline = analysis?.data.job.deadline;
  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold sm:text-[30px]">{job.title || (has ? "Untitled job" : "New job")}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {job.employer && <span className="inline-flex items-center gap-1.5"><Building2 className="size-4" aria-hidden />{job.employer}</span>}
            {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{job.location}</span>}
            {deadline && <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-4" aria-hidden />Apply by {deadline}</span>}
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <JobSteps jobId={id} steps={steps} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
