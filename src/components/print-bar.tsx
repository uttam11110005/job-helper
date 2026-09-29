"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintBar({ autoPrint }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [autoPrint]);
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[794px] items-center justify-between gap-3 px-4">
      <p className="text-sm text-muted">In the print dialog, choose <strong className="text-ink">Save as PDF</strong> and keep <strong className="text-ink">Background graphics</strong> on.</p>
      <Button size="sm" onClick={() => window.print()}><Printer className="size-4" aria-hidden /> Print / Save PDF</Button>
    </div>
  );
}
