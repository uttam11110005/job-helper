import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  BriefcaseBusiness,
  FileText,
  Image as ImageIcon,
  Languages,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FitBadge, LinkButton } from "@/components/ui";
import { PricingCards } from "@/components/marketing/pricing-cards";

export default async function Landing({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  return (
    <>
      {deleted && (
        <div className="bg-match-bg px-4 py-3 text-center text-sm text-match" role="status">
          Your account and all related data have been permanently deleted.
        </div>
      )}

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
        <div className="enter">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-sm text-ink-2">
            <Sparkles className="size-4 text-primary" aria-hidden /> For immigrants & international job seekers in Finland
          </p>
          <h1 className="text-[40px] font-semibold leading-[1.05] sm:text-[54px]">
            Understand the Finnish job ad.
            <br />
            <span className="text-primary">Apply with a CV that fits.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2">
            Paste a job ad or drop in screenshots. We explain it in plain English, check your fit requirement by requirement,
            tailor your CV truthfully, and draft your Finnish application and interview prep.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/signup" size="lg">
              Start free — 3 analyses <ArrowRight className="size-4" aria-hidden />
            </LinkButton>
            <LinkButton href="#how" size="lg" variant="secondary">
              See how it works
            </LinkButton>
          </div>
          <p className="mt-4 text-sm text-muted">No card needed for the free analyses. Pro is €5.99/month after that.</p>
        </div>

        <ExampleCard />
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-3xl font-semibold sm:text-4xl">From “what does this mean?” to “ready to send”.</h2>
          <p className="mt-3 max-w-2xl text-lg text-muted">One job, one complete workflow. Every step counts as a single analysis.</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-bg p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-display text-sm font-semibold text-muted tabular-nums">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Truthful by design */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <ShieldCheck className="size-9 text-primary" aria-hidden />
          <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Truthful by design.</h2>
          <p className="mt-4 text-lg text-ink-2">
            Recruiters in Finland value honesty. We help you <em>present</em> the experience you really have — we never invent it.
          </p>
        </div>
        <ul className="grid gap-3">
          {PROMISES.map((p) => (
            <li key={p} className="flex gap-3 rounded-xl border border-line bg-card px-4 py-3.5 text-[15px]">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-match" aria-hidden /> {p}
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line bg-card">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="text-center text-3xl font-semibold sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-lg text-muted">Try the full workflow three times for free. Continue with Pro only if it helps.</p>
          <div className="mt-10">
            <PricingCards />
          </div>
        </div>
      </section>
    </>
  );
}

const STEPS = [
  { icon: ImageIcon, title: "Add the job ad", body: "Paste the text or upload one or more screenshots. You review the extracted text before anything is analysed." },
  { icon: BookOpenText, title: "Understand it", body: "Plain-English meaning, duties, mandatory vs. preferred requirements, language levels and key Finnish words." },
  { icon: FileText, title: "Tailor your CV", body: "See Match / Partial / Missing per requirement, accept or reject each suggestion, then export an ATS-friendly CV." },
  { icon: MessagesSquare, title: "Apply & prepare", body: "A Finnish application with English translation, interview questions, useful phrases, and a tracker." },
];

const PROMISES = [
  "Never adds jobs, dates, employers, degrees, certificates or skills you don't have.",
  "Job-ad keywords are only used when your CV actually supports them.",
  "Every suggestion shows the CV evidence behind it — accept, edit or reject each one.",
  "Your original CV is never overwritten; each job gets its own saved version.",
  "Fit results are guidance, not a prediction of whether you'll be hired.",
];

function ExampleCard() {
  const rows = [
    { fi: "Kokemus siivoustyöstä", en: "Cleaning experience", status: "match" as const },
    { fi: "Hyvä suomen kielen taito (B1)", en: "Good Finnish (B1)", status: "partial" as const },
    { fi: "Hygieniapassi", en: "Hygiene passport", status: "missing" as const },
    { fi: "Reipas ja huolellinen", en: "Energetic and careful", status: "unknown" as const },
  ];
  return (
    <div className="enter relative" style={{ animationDelay: "80ms" }} aria-label="Example analysis of a Laitoshuoltaja job ad">
      <div className="rounded-3xl border border-line bg-card p-5 shadow-float sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Example analysis</p>
            <h3 className="mt-1 text-xl font-semibold">Laitoshuoltaja</h3>
            <p className="text-sm text-muted">Institutional cleaner · Tampere · Permanent</p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <BriefcaseBusiness className="size-5" aria-hidden />
          </span>
        </div>
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
          {rows.map((r) => (
            <li key={r.fi} className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{r.fi}</p>
                <p className="truncate text-[13px] text-muted">{r.en}</p>
              </div>
              <FitBadge status={r.status} />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Languages className="size-4 text-muted" aria-hidden />
          {["siivous — cleaning", "vuorotyö — shift work", "perehdytys — induction"].map((v) => (
            <span key={v} className="rounded-full bg-sunken px-2.5 py-1 text-xs text-ink-2">{v}</span>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-16 -left-4 hidden rounded-2xl border border-line bg-card px-4 py-3 shadow-soft sm:block">
        <p className="text-xs text-muted">Suggested CV edit</p>
        <p className="mt-0.5 text-sm">
          Cleaned hotel rooms and common areas <span className="rounded bg-suggest-bg px-1 text-suggest">(siivous)</span>
        </p>
        <p className="mt-1 text-xs text-muted">Adds the ad&apos;s Finnish term — nothing invented.</p>
      </div>
    </div>
  );
}
