"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteJobAction, updateJobAction } from "@/app/actions/jobs";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";
import { Button, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { Dialog } from "@/components/dialog";

type Values = { status: JobStatus; title: string; employer: string; location: string; deadline: string; applied_at: string; notes: string };

export function TrackForm({ jobId, initial }: { jobId: string; initial: Values }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((x) => ({ ...x, [k]: val }));

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-2">Status</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {JOB_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("status", s)}
              aria-pressed={v.status === s}
              className={cx(
                "pressable h-10 cursor-pointer rounded-xl border text-sm font-medium",
                v.status === s ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line bg-card text-ink-2 hover:border-line-strong",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role"><Input value={v.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Employer"><Input value={v.employer} onChange={(e) => set("employer", e.target.value)} /></Field>
        <Field label="Location"><Input value={v.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Application deadline"><Input type="date" value={v.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
        <Field label="Date applied"><Input type="date" value={v.applied_at} onChange={(e) => set("applied_at", e.target.value)} /></Field>
      </div>
      <Field label="Notes" hint="Contact person, interview time, follow-ups…">
        <Textarea rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => setConfirm(true)} className="text-missing hover:text-missing">
          <Trash2 className="size-4" aria-hidden /> Delete job
        </Button>
        <Button
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await updateJobAction(jobId, v);
              if (r.ok) {
                toast.success("Saved");
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          Save
        </Button>
      </div>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Delete this job?">
        <p className="text-[15px] text-ink-2">
          This permanently deletes the job ad, screenshots, analysis, tailored CV versions and application for this job. Your original CV is not affected.
          This doesn&apos;t give back a free analysis.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                await deleteJobAction(jobId);
                toast.success("Job deleted");
                router.push("/tracker");
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
