import type { CVData } from "@/lib/types";
import { cx } from "@/components/ui";

/** ATS-readable, single-column CV layout. Real text, no tables or columns. */
/**
 * Pass `compare` (the original CV) to mark app-suggested content in violet.
 * Exports/print never pass it, so the delivered CV stays clean.
 */
export function CVPreview({ cv, className, compare }: { cv: CVData; className?: string; compare?: CVData }) {
  const contact = [cv.location, cv.phone, cv.email].filter(Boolean);
  const mark = (changed: boolean, node: React.ReactNode) =>
    changed ? <mark className="rounded-[3px] bg-[#efe8fd] px-0.5 text-[#5b21b6] [box-decoration-break:clone]">{node}</mark> : node;
  const origBullets = (id: string) => compare?.experience.find((e) => e.id === id)?.bullets;
  return (
    <article className={cx("print-sheet mx-auto w-full max-w-[794px] bg-white px-8 py-10 text-[#0b1b33] sm:px-12", className)} style={{ fontFamily: "var(--font-sans)" }}>
      <header>
        <h1 className="text-[28px] font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{cv.name || "Your Name"}</h1>
        {cv.headline && <p className="mt-0.5 text-[15px] text-[#33415a]">{mark(Boolean(compare) && cv.headline !== compare!.headline, cv.headline)}</p>}
        {contact.length > 0 && <p className="mt-1.5 text-[13px] text-[#5a6880]">{contact.join("  ·  ")}</p>}
      </header>
      {cv.summary && (
        <Block title="Profile">
          <p className="text-[14px] leading-relaxed">{mark(Boolean(compare) && cv.summary.trim() !== compare!.summary.trim(), cv.summary)}</p>
        </Block>
      )}
      {cv.experience.length > 0 && (
        <Block title="Work experience">
          <div className="space-y-4">
            {cv.experience.map((e) => (
              <div key={e.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="text-[15px] font-semibold">
                    {e.title}
                    {e.employer && <span className="font-normal"> — {e.employer}</span>}
                  </h3>
                  <p className="text-[12.5px] text-[#5a6880] tabular-nums">{[e.start, e.end].filter(Boolean).join(" – ")}</p>
                </div>
                {e.location && <p className="text-[12.5px] text-[#5a6880]">{e.location}</p>}
                {e.bullets.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[14px] leading-relaxed marker:text-[#94a3b8]">
                    {e.bullets.map((b, i) => {
                      const ob = origBullets(e.id);
                      return <li key={i}>{mark(Boolean(compare) && Boolean(ob) && !ob!.includes(b), b)}</li>;
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Block>
      )}
      {cv.skills.length > 0 && (
        <Block title="Skills">
          <p className="text-[14px] leading-relaxed">{mark(Boolean(compare) && cv.skills.join("|") !== compare!.skills.join("|"), cv.skills.join("  •  "))}</p>
        </Block>
      )}
      {cv.languages.length > 0 && (
        <Block title="Languages">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[14px]">
            {cv.languages.map((l, i) => (
              <li key={i}><span className="font-medium">{l.name}</span>{l.level && <span className="text-[#5a6880]"> — {l.level}</span>}</li>
            ))}
          </ul>
        </Block>
      )}
      {cv.certificates.length > 0 && (
        <Block title="Certificates & licences">
          <ul className="list-disc space-y-0.5 pl-5 text-[14px]">{cv.certificates.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Block>
      )}
      {cv.education.length > 0 && (
        <Block title="Education">
          <div className="space-y-2.5">
            {cv.education.map((e) => (
              <div key={e.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="text-[15px] font-semibold">{e.degree}{e.institution && <span className="font-normal"> — {e.institution}</span>}</h3>
                  <p className="text-[12.5px] text-[#5a6880] tabular-nums">{[e.start, e.end].filter(Boolean).join(" – ")}</p>
                </div>
                {e.details && <p className="text-[14px]">{e.details}</p>}
              </div>
            ))}
          </div>
        </Block>
      )}
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-b border-[#1f3a5f] pb-1 text-[12px] font-bold tracking-[0.12em] text-[#1f3a5f] uppercase">{title}</h2>
      {children}
    </section>
  );
}
