import { Check } from "lucide-react";
import { LinkButton, cx } from "@/components/ui";

const FREE = ["3 complete job analyses", "Text or screenshot job input", "Fit check + CV gap analysis", "Tailored CV, application & interview prep for each"];
const PRO = ["Unlimited job analyses", "Tailored CV versions + DOCX/PDF export", "Finnish applications & interview prep", "Application tracker & history"];

export function PricingCards({ ctaHref = "/signup" }: { ctaHref?: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Plan name="Free" price="€0" cadence="to start" items={FREE} cta="Start free" href={ctaHref} variant="secondary" />
      <Plan
        name="Pro"
        price="€5.99"
        cadence="/ month"
        items={PRO}
        cta="Get Pro"
        href={ctaHref === "/signup" ? "/signup" : "/checkout"}
        highlight
        footnote="Recurring monthly subscription. Renews automatically until cancelled. Cancel anytime from Billing — access continues to the end of the paid month. No other fees."
      />
    </div>
  );
}

function Plan({ name, price, cadence, items, cta, href, highlight, footnote, variant = "primary" }: {
  name: string; price: string; cadence: string; items: string[]; cta: string; href: string; highlight?: boolean; footnote?: string; variant?: "primary" | "secondary";
}) {
  return (
    <div className={cx("flex flex-col rounded-2xl border bg-card p-6 sm:p-7", highlight ? "border-primary ring-1 ring-primary" : "border-line")}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        {highlight && <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-ink">After your 3 free analyses</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-semibold tabular-nums">{price}</span>
        <span className="text-muted">{cadence}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5 text-[15px]">
            <Check className="mt-0.5 size-4 shrink-0 text-match" aria-hidden /> {i}
          </li>
        ))}
      </ul>
      <LinkButton href={href} variant={highlight ? "primary" : variant} className="mt-7 w-full">{cta}</LinkButton>
      {footnote && <p className="mt-4 text-[13px] leading-relaxed text-muted">{footnote}</p>}
    </div>
  );
}
