"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { analyzeJobAction } from "@/app/actions/jobs";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/dialog";

export function RerunButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <RefreshCw className="size-4" aria-hidden /> Re-run with latest CV
      </Button>
      <Dialog open={open} onClose={() => !pending && setOpen(false)} title="Re-run analysis?">
        <p className="text-[15px] text-ink-2">
          We&apos;ll analyse this job again using your latest CV and profile. This is free — it doesn&apos;t use another analysis.
          Your existing tailored CV versions are kept.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await analyzeJobAction(jobId);
                if (r.ok) {
                  toast.success("Analysis updated");
                  setOpen(false);
                  router.refresh();
                } else toast.error(r.error);
              })
            }
          >
            {pending ? "Analysing…" : "Re-run analysis"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
