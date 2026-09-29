import Link from "next/link";
import { BriefcaseBusiness, CalendarClock, FileText, Plus, Send } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listJobs } from "@/lib/repo";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";
import { EmptyState, LinkButton, PageHeader, cx } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";

export const metadata = { title: "Tracker" };

export default async function Tracker({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await requireUser();
  const jobs = await listJobs(user.id);
  const filter = JOB_STATUSES.includes(status as JobStatus) ? (status as JobStatus) : null;
  const shown = filter ? jobs.filter((j) => j.status === filter) : jobs;

  return (
    <>
      <PageHeader
        title="Application tracker"
        description="Every job you've analysed, with the CV version and application you used."
        actions={<LinkButton href="/jobs/new"><Plus className="size-4" aria-hidden /> Add job</LinkButton>}
      />
      <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
        {[null, ...JOB_STATUSES].map((s) => {
          const count = s ? jobs.filter((j) => j.status === s).length : jobs.length;
          const active = filter === s;
          return (
            <Link
              key={s ?? "all"}
              href={s ? `/tracker?status=${s}` : "/tracker"}
              aria-current={active ? "page" : undefined}
              className={cx(
                "pressable inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium",
                active ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line bg-card text-ink-2 hover:border-line-strong",
              )}
            >
              {s ?? "All"} <span className="text-xs tabular-nums opacity-70">{count}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <EmptyState icon={<BriefcaseBusiness className="size-6" />} title={filter ? `No jobs marked “${filter}”` : "Nothing tracked yet"} action={!filter && <LinkButton href="/jobs/new">Add a job ad</LinkButton>}>
          {filter ? "Change a job's status to see it here." : "Jobs appear here as soon as you add them."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {shown.map((j) => (
            <li key={j.id} className="hover-lift flex flex-col gap-3 rounded-2xl border border-line bg-card px-5 py-4 sm:flex-row sm:items-center">
              <Link href={`/jobs/${j.id}`} className="min-w-0 flex-1 rounded-lg">
                <p className="truncate font-semibold">{j.title || "Untitled job"}</p>
                <p className="truncate text-sm text-muted">{[j.employer, j.location].filter(Boolean).join(" · ") || "—"}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><FileText className="size-3.5" aria-hidden />{j.tailored_versions ? `${j.tailored_versions} CV version${j.tailored_versions > 1 ? "s" : ""}` : "No tailored CV"}</span>
                  <span className="inline-flex items-center gap-1"><Send className="size-3.5" aria-hidden />{j.has_application ? "Application ready" : "No application"}</span>
                  {j.deadline && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3.5" aria-hidden />Deadline {new Date(j.deadline).toLocaleDateString("en-GB")}</span>}
                  {j.applied_at && <span>Applied {new Date(j.applied_at).toLocaleDateString("en-GB")}</span>}
                </div>
              </Link>
              <StatusSelect jobId={j.id} value={j.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
