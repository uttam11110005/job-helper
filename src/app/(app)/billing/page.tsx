import { CircleCheck, Crown, Receipt } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { FREE_LIMIT, formatEuro, getUsage, listPayments } from "@/lib/billing";
import { Card, CardHeader, LinkButton, Notice, PageHeader } from "@/components/ui";
import { Dots } from "@/components/usage-meter";
import { CancelSubscription, ResumeSubscription } from "@/components/subscription-actions";

export const metadata = { title: "Billing" };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default async function Billing({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const { success } = await searchParams;
  const user = await requireUser();
  const usage = await getUsage(user.id);
  const sub = usage.subscription;
  const payments = await listPayments(user.id);
  const lastPayment = payments[0];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Billing" description="Your plan, payments and subscription." />

      {success && sub && !sub.cancel_at_period_end && lastPayment && (
        <Notice tone="success" icon={<CircleCheck className="size-5" />} className="enter mb-6">
          <p className="text-[15px] font-semibold">Welcome to Pro — payment received.</p>
          <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <div><dt className="inline">Plan: </dt><dd className="inline font-semibold">Pro (monthly)</dd></div>
            <div><dt className="inline">Amount paid: </dt><dd className="inline font-semibold">{formatEuro(lastPayment.amount_cents)}</dd></div>
            <div><dt className="inline">Payment date: </dt><dd className="inline font-semibold">{fmt(lastPayment.paid_at)}</dd></div>
            <div><dt className="inline">Next renewal: </dt><dd className="inline font-semibold">{fmt(sub.renewal_date)}</dd></div>
          </dl>
        </Notice>
      )}

      <Card>
        <CardHeader title="Current plan" icon={<Crown className="size-5" />} />
        <div className="p-5 sm:p-6">
          {usage.isPro && sub ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="font-display text-2xl font-semibold">Pro</p>
                <p className="text-lg"><span className="font-semibold tabular-nums">{formatEuro(sub.amount_cents)}</span> <span className="text-muted">/ month · recurring</span></p>
              </div>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-muted">Status</dt><dd className="mt-0.5 font-semibold">{sub.cancel_at_period_end ? "Cancelled — active until period end" : "Active"}</dd></div>
                <div><dt className="text-muted">{sub.cancel_at_period_end ? "Pro ends on" : "Next renewal"}</dt><dd className="mt-0.5 font-semibold">{fmt(sub.renewal_date)}</dd></div>
                <div><dt className="text-muted">Payment method</dt><dd className="mt-0.5 font-semibold">Card •••• {sub.card_last4 ?? "----"}</dd></div>
              </dl>
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                {sub.cancel_at_period_end ? (
                  <>
                    <ResumeSubscription />
                    <p className="text-sm text-muted">You won&apos;t be charged again unless you resume.</p>
                  </>
                ) : (
                  <>
                    <CancelSubscription periodEnd={fmt(sub.renewal_date)} />
                    <p className="text-sm text-muted">Renews automatically until cancelled. Cancel anytime — no fees.</p>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-2xl font-semibold">Free</p>
              <div className="mt-3 flex items-center gap-3"><Dots used={usage.used} large /><span className="text-sm text-ink-2 tabular-nums">{usage.remaining} of {FREE_LIMIT} free analyses remaining</span></div>
              {sub?.status === "canceled" && <p className="mt-3 text-sm text-muted">Your Pro subscription ended on {fmt(sub.renewal_date)}.</p>}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                <LinkButton href="/checkout">Upgrade to Pro · €5.99/month</LinkButton>
                <p className="text-sm text-muted">Recurring monthly subscription · Cancel anytime</p>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Payment history" icon={<Receipt className="size-5" />} />
        {payments.length ? (
          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm sm:px-6">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.description}</p>
                  <p className="text-muted">{fmt(p.paid_at)}</p>
                </div>
                <span className="font-semibold tabular-nums">{formatEuro(p.amount_cents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-5 text-sm text-muted">No payments yet.</p>
        )}
      </Card>
    </div>
  );
}
