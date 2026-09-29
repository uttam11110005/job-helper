import type { CSSProperties, ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import type { CVData, CVDesign, LanguageSkill } from "@/lib/types";
import { DEFAULT_DESIGN } from "@/lib/types";
import { CVPreview } from "@/components/cv-preview";
import { cx } from "@/components/ui";

// CV paper is always white, whatever the app theme, so colours here are literal.
// The accent comes from the chosen design via the --cv-accent custom property.

type Props = { cv: CVData; compare?: CVData; className?: string };
type TemplateProps = Props & { accent: string; withPhoto: boolean };

/** Renders a CV in its chosen design. `compare` marks app suggestions in violet (screen only). */
export function CVDocument({ cv, compare, className, design }: Props & { design?: CVDesign }) {
  const d = design ?? cv.design ?? DEFAULT_DESIGN;
  if (d.template === "ats") return <CVPreview cv={cv} compare={compare} className={className} />;
  const Template = d.template === "sidebar" ? SidebarTemplate : ClassicTemplate;
  return <Template cv={cv} compare={compare} className={className} accent={d.accent} withPhoto={d.showPhoto !== false} />;
}

// ───────── shared helpers ─────────

function useMarks(cv: CVData, compare?: CVData) {
  const mark = (changed: boolean, node: ReactNode) =>
    compare && changed ? <mark className="rounded-[3px] bg-[#efe8fd] px-0.5 text-[#5b21b6] [box-decoration-break:clone]">{node}</mark> : node;
  return {
    headline: () => mark(cv.headline.trim() !== (compare?.headline ?? "").trim(), cv.headline),
    summary: () => mark(cv.summary.trim() !== (compare?.summary ?? "").trim(), cv.summary),
    bullet: (expId: string, b: string) => {
      const orig = compare?.experience.find((e) => e.id === expId)?.bullets;
      return mark(Boolean(orig) && !orig!.includes(b), b);
    },
    skillsChanged: Boolean(compare) && cv.skills.join("|") !== compare!.skills.join("|"),
    highlight: (title: string, text: string) => {
      const orig = compare?.highlights?.find((h) => h.title.toLowerCase() === title.toLowerCase())?.text;
      return mark(orig === undefined || orig.trim() !== text.trim(), text);
    },
  };
}

const LEVEL: [RegExp, number][] = [
  [/native|äidink|mother|c2/i, 5],
  [/c1|excellent|erinomai|fluent|sujuv/i, 5],
  [/b2|good|hyvä/i, 4],
  [/b1|moderate|intermediate|satisf|tyydytt|kohtalai/i, 3],
  [/a2|basic|perus/i, 2],
  [/a1|beginner|alkeet/i, 1],
];
const levelDots = (l: LanguageSkill) => LEVEL.find(([re]) => re.test(l.level))?.[1] ?? 0;

function LevelDots({ value, accent, on = "#fff" }: { value: number; accent: string; on?: string }) {
  if (!value) return null;
  return (
    <span className="flex gap-1" aria-label={`${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="size-2 rounded-full" style={{ background: i < value ? accent : on, boxShadow: i < value ? undefined : `inset 0 0 0 1px ${accent}55` }} />
      ))}
    </span>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "CV";
}

const dates = (a: string, b: string) => [a, b].filter(Boolean).join(" – ");

function Sheet({ className, accent, children }: { className?: string; accent: string; children: ReactNode }) {
  return (
    <article
      className={cx("print-sheet mx-auto w-full max-w-[794px] bg-white text-[#1e2533]", className)}
      style={{ fontFamily: "var(--font-sans)", "--cv-accent": accent, minHeight: 1123 } as CSSProperties}
    >
      {children}
    </article>
  );
}

// ───────── shared blocks ─────────

type Marks = ReturnType<typeof useMarks>;

function ContactList({ cv, color, align = "left" }: { cv: CVData; color: string; align?: "left" | "right" }) {
  const items = [
    cv.phone && { icon: Phone, text: cv.phone },
    cv.email && { icon: Mail, text: cv.email },
    cv.location && { icon: MapPin, text: cv.location },
  ].filter(Boolean) as { icon: typeof Phone; text: string }[];
  return (
    <ul className={cx("space-y-1.5 text-[13px] text-[#3b4556]", align === "right" && "text-right")}>
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className={cx("flex items-center gap-2 break-all", align === "right" && "flex-row-reverse")}>
          <Icon className="size-3.5 shrink-0" style={{ color }} aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}

function LanguagesList({ cv, accent, on }: { cv: CVData; accent: string; on?: string }) {
  return (
    <ul className="space-y-2">
      {cv.languages.map((l, i) => (
        <li key={i}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold">{l.name}</span>
            <span className="text-[12px] text-[#5b6475]">{l.level}</span>
          </div>
          <div className="mt-1"><LevelDots value={levelDots(l)} accent={accent} on={on} /></div>
        </li>
      ))}
    </ul>
  );
}

/** Detailed, chronological job entries — the heart of an experience-focused CV. */
function DetailedExperience({ cv, m }: { cv: CVData; m: Marks }) {
  return (
    <div className="space-y-4">
      {cv.experience.map((e) => (
        <div key={e.id} className="break-inside-avoid">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-[14.5px] font-bold">{e.title}</h3>
            {dates(e.start, e.end) && <span className="shrink-0 text-[12.5px] text-[#5b6475] tabular-nums">{dates(e.start, e.end)}</span>}
          </div>
          <p className="text-[13.5px] font-semibold text-[#3b4556]">{[e.employer, e.location].filter(Boolean).join(", ")}</p>
          {e.bullets.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] leading-relaxed marker:text-[var(--cv-accent)]">
              {e.bullets.map((b, i) => <li key={i}>{m.bullet(e.id, b)}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/** Compact, aligned timeline — used by the career-change CV where expertise areas carry the detail. */
function CompactExperience({ cv, m, showBullets, accent }: { cv: CVData; m: Marks; showBullets: boolean; accent: string }) {
  return (
    <ol className="space-y-3">
      {cv.experience.map((e) => (
        <li key={e.id} className="grid break-inside-avoid grid-cols-[118px_1fr] gap-4 text-[13.5px]">
          <span className="pt-px text-[12.5px] text-[#5b6475] tabular-nums">{dates(e.start, e.end)}</span>
          <div className="min-w-0 border-l-2 pl-4" style={{ borderColor: `${accent}55` }}>
            <p className="font-bold">{e.title}</p>
            {[e.employer, e.location].filter(Boolean).length > 0 && <p className="text-[#3b4556]">{[e.employer, e.location].filter(Boolean).join(", ")}</p>}
            {showBullets && e.bullets.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-relaxed text-[#2e3647] marker:text-[var(--cv-accent)]">
                {e.bullets.map((b, i) => <li key={i}>{m.bullet(e.id, b)}</li>)}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Highlights({ cv, m, accent }: { cv: CVData; m: Marks; accent: string }) {
  return (
    <div className="space-y-5">
      {cv.highlights!.map((h, i) => (
        <section key={i} className="break-inside-avoid">
          <h2 className="mb-1.5 flex items-center gap-2.5 text-[15.5px] font-bold">
            <span className="h-4 w-1 rounded-full" style={{ background: accent }} aria-hidden />
            {h.title}
          </h2>
          <p className="text-[13.5px] leading-relaxed text-[#2e3647]">{m.highlight(h.title, h.text)}</p>
        </section>
      ))}
    </div>
  );
}

function SkillChips({ cv, m, style }: { cv: CVData; m: Marks; style: CSSProperties }) {
  return (
    <ul className={cx("flex flex-wrap gap-1.5", m.skillsChanged && "rounded-md bg-[#efe8fd] p-1.5")}>
      {cv.skills.map((s, i) => (
        <li key={i} className="rounded-full border px-2.5 py-0.5 text-[12.5px]" style={style}>{s}</li>
      ))}
    </ul>
  );
}

// ───────── 1. Experience-focused (Mark Burns style) ─────────

function ClassicTemplate({ cv, compare, className, accent, withPhoto }: TemplateProps) {
  const m = useMarks(cv, compare);
  const nameParts = (cv.name || "Your Name").trim().split(/\s+/);
  const first = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0];
  const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const hasHighlights = (cv.highlights?.length ?? 0) > 0;

  // Both columns share one heading style so their first lines align.
  const Head = ({ children, tone }: { children: ReactNode; tone: "left" | "right" }) => (
    <h2
      className="mb-3 border-b-[1.5px] pb-1 text-[13px] font-bold tracking-[0.12em] uppercase"
      style={{ color: tone === "left" ? accent : "#1e2533", borderColor: tone === "left" ? `${accent}40` : accent }}
    >
      {children}
    </h2>
  );

  return (
    <Sheet className={cx(withPhoto ? "px-11 py-12" : "px-12 pt-0 pb-12", className)} accent={accent}>
      {withPhoto ? (
        <header className="grid grid-cols-[200px_1fr] items-center gap-10">
          <div className="grid size-[190px] place-items-center rounded-full p-[5px]" style={{ background: accent }}>
            {cv.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cv.photo} alt="" className="size-full rounded-full border-[3px] border-white object-cover" />
            ) : (
              <div className="grid size-full place-items-center rounded-full border-[3px] border-white bg-[#f6f1ea] text-[52px] font-semibold" style={{ color: accent, fontFamily: "var(--font-display)" }}>
                {initials(cv.name)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-[50px] leading-[1.02] font-medium tracking-[0.04em] text-[#1e2533] uppercase" style={{ fontFamily: "var(--font-display)" }}>
              {first}
              {last && <><br />{last}</>}
            </h1>
            {cv.headline && <p className="mt-3 text-[14px] font-semibold tracking-[0.14em] uppercase" style={{ color: accent }}>{m.headline()}</p>}
          </div>
        </header>
      ) : (
        <>
          <div className="-mx-12 mb-10 h-2" style={{ background: accent }} aria-hidden />
          <header className="grid grid-cols-[1fr_auto] items-end gap-8 border-b-2 pb-6" style={{ borderColor: accent }}>
            <div className="min-w-0">
              <h1 className="text-[44px] leading-[1.05] font-medium tracking-[0.03em] text-[#1e2533] uppercase" style={{ fontFamily: "var(--font-display)" }}>
                {cv.name || "Your Name"}
              </h1>
              {cv.headline && <p className="mt-2 text-[14px] font-semibold tracking-[0.14em] uppercase" style={{ color: accent }}>{m.headline()}</p>}
            </div>
            <ContactList cv={cv} color={accent} align="right" />
          </header>
        </>
      )}

      <div className={cx("grid grid-cols-[200px_1fr] gap-10", withPhoto ? "mt-10" : "mt-8")}>
        <aside className="space-y-7 text-[13px] leading-relaxed">
          {cv.summary && (
            <section>
              <Head tone="left">Profile</Head>
              <p className="text-[#3b4556]">{m.summary()}</p>
            </section>
          )}
          {withPhoto && (
            <section>
              <Head tone="left">Contact</Head>
              <ContactList cv={cv} color={accent} />
            </section>
          )}
          {cv.languages.length > 0 && (
            <section>
              <Head tone="left">Languages</Head>
              <LanguagesList cv={cv} accent={accent} />
            </section>
          )}
          {cv.certificates.length > 0 && (
            <section>
              <Head tone="left">Certificates</Head>
              <ul className="space-y-1 text-[#3b4556]">{cv.certificates.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </section>
          )}
          {(cv.interests?.length ?? 0) > 0 && (
            <section>
              <Head tone="left">Volunteering & interests</Head>
              <ul className="list-disc space-y-1 pl-4 text-[#3b4556] marker:text-[var(--cv-accent)]">{cv.interests!.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </section>
          )}
        </aside>

        <div className="min-w-0 space-y-7">
          {cv.experience.length > 0 && (
            <section>
              <Head tone="right">Work experience</Head>
              <DetailedExperience cv={cv} m={m} />
            </section>
          )}
          {cv.education.length > 0 && (
            <section>
              <Head tone="right">Education</Head>
              <div className="space-y-3">
                {cv.education.map((e) => (
                  <div key={e.id} className="break-inside-avoid text-[13.5px]">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="font-bold">{e.degree}</h3>
                      {dates(e.start, e.end) && <span className="shrink-0 text-[12.5px] text-[#5b6475] tabular-nums">{dates(e.start, e.end)}</span>}
                    </div>
                    <p className="text-[#3b4556]">{e.institution}</p>
                    {e.details && <p className="mt-0.5 text-[13px] text-[#3b4556]">{e.details}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {cv.skills.length > 0 && (
            <section>
              <Head tone="right">Key skills</Head>
              <SkillChips cv={cv} m={m} style={{ borderColor: `${accent}66`, background: `${accent}10` }} />
            </section>
          )}
          {hasHighlights && (
            <section>
              <Head tone="right">Key strengths</Head>
              <Highlights cv={cv} m={m} accent={accent} />
            </section>
          )}
        </div>
      </div>
    </Sheet>
  );
}

// ───────── 2. Career change (Eleonora style) ─────────

function SidebarTemplate({ cv, compare, className, accent, withPhoto }: TemplateProps) {
  const m = useMarks(cv, compare);
  const side = `color-mix(in srgb, ${accent} 24%, white)`;
  const band = `color-mix(in srgb, ${accent} 46%, white)`;
  const dark = `color-mix(in srgb, ${accent} 70%, black)`;
  const hasHighlights = (cv.highlights?.length ?? 0) > 0;

  const SideHead = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-2 text-[12.5px] font-bold tracking-[0.1em] uppercase" style={{ color: dark }}>{children}</h2>
  );
  const MainHead = ({ children }: { children: ReactNode }) => (
    <h2 className="mb-3.5 flex items-center gap-3 text-[13px] font-bold tracking-[0.12em] uppercase">
      {children}
      <span className="h-px flex-1" style={{ background: `${accent}66` }} aria-hidden />
    </h2>
  );

  const sidebarBody = (
    <>
      {cv.summary && (
        <section>
          <SideHead>Profile</SideHead>
          <p>{m.summary()}</p>
        </section>
      )}
      {cv.education.length > 0 && (
        <section>
          <SideHead>Education</SideHead>
          <ul className="space-y-2">
            {cv.education.map((e) => (
              <li key={e.id}>
                <span className="block font-bold">{e.degree}</span>
                <span className="text-[#3b4556]">{[e.institution, e.end].filter(Boolean).join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {cv.languages.length > 0 && (
        <section>
          <SideHead>Language skills</SideHead>
          <LanguagesList cv={cv} accent={dark} on="rgba(255,255,255,0.75)" />
        </section>
      )}
      {cv.certificates.length > 0 && (
        <section>
          <SideHead>Cards and qualifications</SideHead>
          <ul className="space-y-1">{cv.certificates.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}
      {(cv.interests?.length ?? 0) > 0 && (
        <section>
          <SideHead>Interests</SideHead>
          <ul className="space-y-1">{cv.interests!.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </section>
      )}
      <section>
        <SideHead>Recommenders</SideHead>
        <p>Contact information available on request.</p>
      </section>
    </>
  );

  const main = (
    <>
      {hasHighlights && <Highlights cv={cv} m={m} accent={accent} />}
      {cv.experience.length > 0 && (
        <section>
          <MainHead>Work experience</MainHead>
          <CompactExperience cv={cv} m={m} showBullets={!hasHighlights} accent={accent} />
        </section>
      )}
      {cv.skills.length > 0 && (
        <section>
          <MainHead>Skills</MainHead>
          <SkillChips cv={cv} m={m} style={{ borderColor: "transparent", background: side }} />
        </section>
      )}
    </>
  );

  if (!withPhoto) {
    // No photo: one continuous coloured column; name tops the sidebar and both
    // columns share the same top padding so their first lines align.
    return (
      <Sheet className={cx("grid grid-cols-[35%_65%]", className)} accent={accent}>
        <aside className="space-y-6 px-8 pt-12 pb-10 text-[13px] leading-relaxed text-[#1e2533]" style={{ background: side }}>
          <div className="border-b-2 pb-5" style={{ borderColor: `${accent}80` }}>
            <h1 className="text-[32px] leading-[1.1] font-semibold text-[#1e2533]" style={{ fontFamily: "var(--font-display)" }}>{cv.name || "Your Name"}</h1>
            {cv.headline && <p className="mt-2 text-[15px] leading-snug font-medium" style={{ color: dark }}>{m.headline()}</p>}
          </div>
          <ContactList cv={cv} color={dark} />
          {sidebarBody}
        </aside>
        <div className="min-w-0 space-y-7 px-10 pt-12 pb-10">{main}</div>
      </Sheet>
    );
  }

  return (
    <Sheet className={cx("grid grid-cols-[35%_65%] grid-rows-[250px_1fr]", className)} accent={accent}>
      <div className="grid place-items-center overflow-hidden" style={{ background: band }}>
        {cv.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cv.photo} alt="" className="size-full object-cover object-top" />
        ) : (
          <span className="text-[64px] font-semibold text-white/90" style={{ fontFamily: "var(--font-display)" }}>{initials(cv.name)}</span>
        )}
      </div>
      <header className="flex flex-col justify-center px-10" style={{ background: band }}>
        <h1 className="text-[40px] leading-tight font-medium text-[#1e2533]" style={{ fontFamily: "var(--font-display)" }}>{cv.name || "Your Name"}</h1>
      </header>
      <aside className="space-y-6 px-8 py-8 text-[13px] leading-relaxed text-[#1e2533]" style={{ background: side }}>
        {cv.headline && <p className="text-[19px] leading-snug font-medium" style={{ fontFamily: "var(--font-display)" }}>{m.headline()}</p>}
        <ContactList cv={cv} color={dark} />
        {sidebarBody}
      </aside>
      <div className="min-w-0 space-y-7 px-10 py-8">{main}</div>
    </Sheet>
  );
}
