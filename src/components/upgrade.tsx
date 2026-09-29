"use client";

import { Crown } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { LinkButton } from "@/components/ui";

export const UPGRADE_MESSAGE = "You've used all 3 free job analyses. Continue with Job Helper Pro for €5.99/month.";

export function UpgradePanel() {
  return (
    <div className="text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Crown className="size-6" aria-hidden />
      </div>
      <p className="mt-4 text-[17px] font-medium text-ink">{UPGRADE_MESSAGE}</p>
      <p className="mt-3 text-sm font-semibold text-ink-2">€5.99/month · Recurring subscription · Cancel anytime</p>
      <LinkButton href="/checkout" className="mt-6 w-full">Continue with Pro</LinkButton>
      <p className="mt-3 text-[13px] text-muted">Your saved jobs, CVs and applications stay available on the free plan.</p>
    </div>
  );
}

export function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Free analyses used">
      <UpgradePanel />
    </Dialog>
  );
}
