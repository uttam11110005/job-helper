import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Crown, FileUser, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { FREE_LIMIT, getUsage } from "@/lib/billing";
import { getLatestCV, listJobs } from "@/lib/repo";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { Dots } from "@/components/usage-meter";
import { StatusBadge } from "@/components/job-status";
import { JOB_STATUSES } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const usage = await getUsage(user.id);
  const cv = await getLatestCV(user.id);
  const jobs = await listJobs(user.id);
  const counts = Object.fromEntries(JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length]));

  return (
    <>
      <PageHeader
        title={`Hei, ${user.name.split(" ")[0]}`}
        description="Pick up where you left off, or analyse a new job ad."
        actions={
          <LinkButton href="/jobs/new">
            <Plus className="size-4" aria-hidden /> Analyse a job
          </LinkButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Usage */}
        <Card className="p-5 sm:p-6">
          {usage.isPro ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-primary"><Crown className="size-4" aria-hidden /> Pro plan</div>
              <p className="mt-3 font-display text-3xl font-semibold">Unlimited</p>
              <p className="mt-1 text-sm text-muted">{usage.total} job{usage.total === 1 ? "" : "s"} analysed so far.</p>
              <Link href="/billing" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Manage subscription</Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted">Free analyses</p>
              <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
                {usage.remaining} of {FREE_LIMIT} <span className="text-lg font-medium text-muted">remaining</span>
              </p>
              <div className="mt-3"><Dots used={usage.used} large /></div>
              <p className="mt-3 text-sm text-muted">One job = one analysis, including its tailored CV, application and interview prep.</p>
              {!usage.remaining && (
                <LinkButton href="/checkout" className="mt-4 w-full">Continue with Pro · €5.99/month</LinkButton>
              )}
            </>
          )}
        </Card>

        {/* CV */}
        <Card className="p-5 sm:p-6">
          <p className="text-sm font-medium text-muted">Your CV</p>
          {cv ? (
            <>
              <p className="mt-3 truncate text-lg font-semibold">{cv.parsed.name || "Unnamed CV"}</p>
              <p className="mt-0.5 truncate text-sm text-muted">{cv.parsed.headline || `${cv.parsed.experience.length} roles · ${cv.parsed.skills.length} skills`}</p>
              <p className="mt-3 text-sm text-muted">Version {cv.version} · {cv.source_file ?? "pasted text"}</p>
              <Link href="/profile" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">View or update</Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-[15px]">Add your CV so we can check your fit and tailor it for each job.</p>
              <LinkButton href="/onboarding" variant="soft" className="mt-4 w-full"><FileUser className="size-4" aria-hidden /> Add my CV</LinkButton>
            </>
          )}
        </Card>

        {/* Pipeline */}
        <Card className="p-5 sm:p-6">
          <p className="text-sm font-medium text-muted">Applications</p>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            {(["Saved", "Applied", "Interview"] as const).map((s) => (
              <div key={s}>
                <dt className="text-xs text-muted">{s}</dt>
                <dd className="font-display text-2xl font-semibold tabular-nums">{counts[s]}</dd>
              </div>
            ))}
          </dl>
          <Link href="/tracker" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">Open tracker</Link>
        </Card>
      </div>

      <h2 className="mt-10 mb-4 text-xl font-semibold">Recent jobs</h2>
      {jobs.length === 0 ? (
        <EmptyState
          icon={<BriefcaseBusiness className="size-6" />}
          title="No jobs yet"
          action={<LinkButton href="/jobs/new"><Plus className="size-4" aria-hidden /> Add your first job ad</LinkButton>}
        >
          Paste a Finnish job ad or upload screenshots — we&apos;ll explain it and check your fit.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {jobs.slice(0, 6).map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="hover-lift flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{j.title || "Untitled job"}</p>
                  <p className="truncate text-sm text-muted">
                    {[j.employer, j.location].filter(Boolean).join(" · ") || (j.has_analysis ? "—" : "Not analysed yet")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={j.status} />
                  <ArrowRight className="size-4 text-muted" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
