import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/billing";
import { Card } from "@/components/ui";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata = { title: "Upgrade to Pro" };

const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function Checkout() {
  const user = await requireUser();
  const usage = await getUsage(user.id);
  if (usage.isPro && !usage.subscription?.cancel_at_period_end) redirect("/billing");
  const today = new Date();
  const next = new Date(today);
  next.setMonth(next.getMonth() + 1);

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="text-[28px] font-semibold sm:text-[32px]">Job Helper Pro</h1>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="font-display text-5xl font-semibold tabular-nums">€5.99</span>
          <span className="text-lg text-muted">per month</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-ink-2">Recurring monthly subscription · Renews automatically · Cancel anytime</p>
        <ul className="mt-6 space-y-2.5 text-[15px]">
          {["Unlimited job analyses (text or screenshots)", "Tailored CV versions with DOCX & PDF export", "Finnish applications with English explanation", "Interview prep, tracker and full history"].map((f) => (
            <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-match" aria-hidden />{f}</li>
          ))}
        </ul>
        <Card className="mt-6 p-5 text-sm">
          <h2 className="mb-3 font-semibold">What you&apos;ll pay</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-muted">Today ({fmt(today)})</dt><dd className="font-semibold tabular-nums">€5.99</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Then every month from {fmt(next)}</dt><dd className="font-semibold tabular-nums">€5.99</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Other fees</dt><dd className="font-semibold">None</dd></div>
          </dl>
          <p className="mt-4 border-t border-line pt-3 text-muted">
            <strong className="text-ink-2">How to cancel:</strong> Billing → “Cancel subscription”. You keep Pro until the end of the month you&apos;ve paid for and won&apos;t be charged again. Price includes VAT.
          </p>
        </Card>
      </div>
      <Card className="p-5 sm:p-7">
        <h2 className="mb-5 text-lg font-semibold">Payment details</h2>
        <CheckoutForm nextRenewal={fmt(next)} />
      </Card>
    </div>
  );
}
