"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Lock } from "lucide-react";
import { checkoutAction } from "@/app/actions/billing";
import { Button, Field, Input, Notice } from "@/components/ui";

const fmtCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
const fmtExp = (v: string) => v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

export function CheckoutForm({ nextRenewal }: { nextRenewal: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/30");
  const [cvc, setCvc] = useState("123");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const digits = card.replace(/\D/g, "");
  const valid = name.trim().length > 1 && digits.length === 16 && /^\d{2}\/\d{2}$/.test(exp) && /^\d{3,4}$/.test(cvc) && agree;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        // Only the last four digits ever leave the browser.
        start(async () => {
          const r = await checkoutAction({ last4: digits.slice(-4), acceptedTerms: agree });
          if (r.ok) router.push("/billing?success=1");
          else setError(r.error);
        });
      }}
    >
      <Notice tone="warn">
        <strong>Simulated payment (test mode).</strong> No real card is charged. The test card is pre-filled — only the last 4 digits are stored for your receipt.
      </Notice>
      <Field label="Name on card" htmlFor="cc-name">
        <Input id="cc-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Card number" htmlFor="cc-number">
        <div className="relative">
          <Input id="cc-number" inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(fmtCard(e.target.value))} className="pl-10 tabular-nums" />
          <CreditCard className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Expiry (MM/YY)" htmlFor="cc-exp"><Input id="cc-exp" inputMode="numeric" autoComplete="off" value={exp} onChange={(e) => setExp(fmtExp(e.target.value))} /></Field>
        <Field label="CVC" htmlFor="cc-cvc"><Input id="cc-cvc" inputMode="numeric" autoComplete="off" value={cvc} onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
      </div>
      <label className="flex cursor-pointer gap-3 rounded-xl border border-line bg-bg p-3.5 text-sm text-ink-2">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
        <span>
          I understand this is a <strong className="text-ink">recurring subscription of €5.99 per month</strong>. It renews automatically on the same day each month
          (next on <strong className="text-ink">{nextRenewal}</strong>) until I cancel. I can cancel anytime in Billing.
        </span>
      </label>
      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" size="lg" className="w-full" disabled={!valid} loading={pending}>
        <Lock className="size-4" aria-hidden /> Subscribe — €5.99/month
      </Button>
    </form>
  );
}
