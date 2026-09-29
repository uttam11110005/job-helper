"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "@/app/actions/account";
import { Button, Field, Input, Notice } from "@/components/ui";
import { Dialog } from "@/components/dialog";

export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete account & data</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <p className="text-[15px] text-ink-2">
          This permanently deletes your account, profile, every CV version, job ad, screenshot, analysis, tailored CV and application. It cannot be undone.
        </p>
        <Notice tone="warn" className="mt-4">If you have an active Pro subscription it is cancelled immediately with no further charges.</Notice>
        <div className="mt-4">
          <Field label={`Type ${email} to confirm`} htmlFor="confirm-email" error={error ?? undefined}>
            <Input id="confirm-email" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="danger"
            disabled={value.trim().toLowerCase() !== email}
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await deleteAccountAction(value);
                if (r && !r.ok) setError(r.error);
              })
            }
          >
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </>
  );
}
