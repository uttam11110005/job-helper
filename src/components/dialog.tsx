"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native <dialog>: focus trap, Esc, and backdrop for free; animated via @starting-style. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`sheet m-auto w-[calc(100%-32px)] ${wide ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-line bg-card p-0 text-ink shadow-float`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="pressable grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-sunken hover:text-ink" aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <div className="max-h-[75dvh] overflow-y-auto px-5 py-5">{children}</div>
    </dialog>
  );
}
