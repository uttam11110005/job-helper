"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "@/app/actions/billing";
import { Button } from "@/components/ui";
import { Dialog } from "@/components/dialog";

export function CancelSubscription({ periodEnd }: { periodEnd: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>Cancel subscription</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cancel Pro?">
        <p className="text-[15px] text-ink-2">
          You won&apos;t be charged again. You keep Pro until <strong className="text-ink">{periodEnd}</strong>, then your account moves to the free plan.
          Your jobs, CVs and applications stay saved.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)}>Keep Pro</Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                await cancelSubscriptionAction();
                setOpen(false);
                toast.success("Subscription cancelled", { description: `Pro stays active until ${periodEnd}.` });
                router.refresh();
              })
            }
          >
            Cancel subscription
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function ResumeSubscription() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      loading={pending}
      onClick={() =>
        start(async () => {
          await resumeSubscriptionAction();
          toast.success("Subscription resumed");
          router.refresh();
        })
      }
    >
      Resume subscription
    </Button>
  );
}
