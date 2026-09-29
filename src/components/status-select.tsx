"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateJobAction } from "@/app/actions/jobs";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";

export function StatusSelect({ jobId, value }: { jobId: string; value: JobStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="Application status"
      value={value}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const r = await updateJobAction(jobId, { status: e.target.value as JobStatus });
          if (r.ok) router.refresh();
          else toast.error(r.error);
        })
      }
      className="h-9 cursor-pointer rounded-lg border border-line bg-card px-2.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
    >
      {JOB_STATUSES.map((s) => <option key={s}>{s}</option>)}
    </select>
  );
}
