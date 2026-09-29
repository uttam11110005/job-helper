import { PricingCards } from "@/components/marketing/pricing-cards";

export const metadata = { title: "Pricing" };

const FAQ = [
  ["What counts as one analysis?", "One submitted job = one analysis, whether you paste text or upload several screenshots. Tailoring your CV, the application and interview prep for that same job are included — they don't use extra analyses."],
  ["Is Pro a subscription?", "Yes. Pro is a recurring monthly subscription of €5.99. It renews automatically every month until you cancel."],
  ["How do I cancel?", "Go to Billing and press “Cancel subscription”. No emails or calls needed. You keep Pro until the end of the month you already paid for, and you are not charged again."],
  ["Are there other fees?", "No. €5.99/month is the full price, VAT included. No setup or hidden fees."],
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-center text-4xl font-semibold sm:text-5xl">Pricing</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted">Your first 3 complete job analyses are free. After that, Pro is €5.99/month.</p>
      <div className="mt-12"><PricingCards /></div>
      <div className="mt-16 divide-y divide-line rounded-2xl border border-line bg-card">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-4 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {q}
              <span className="text-muted transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-45 text-xl leading-none" aria-hidden>+</span>
            </summary>
            <p className="mt-2 text-[15px] text-muted">{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
