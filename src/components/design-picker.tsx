"use client";

import { Check, ImageOff, UserRound } from "lucide-react";
import { CV_ACCENTS, type CVData, type CVDesign, type CVTemplate } from "@/lib/types";
import { CVDocument } from "@/components/cv-templates";
import { FitToWidth } from "@/components/fit-to-width";
import { cx } from "@/components/ui";

const TEMPLATES: { key: CVTemplate; name: string; note: string }[] = [
  { key: "classic", name: "Experience", note: "Relevant experience, detailed jobs" },
  { key: "sidebar", name: "Career change", note: "Expertise areas first" },
  { key: "ats", name: "ATS simple", note: "Safest for online systems" },
];

export function DesignPicker({ cv, design, onChange }: { cv: CVData; design: CVDesign; onChange: (d: CVDesign) => void }) {
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="CV template" className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((t) => {
          const active = design.template === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...design, template: t.key })}
              className={cx(
                "pressable group cursor-pointer rounded-xl border p-1.5 text-left",
                active ? "border-primary ring-2 ring-primary/30" : "border-line hover:border-line-strong",
              )}
            >
              <div className="pointer-events-none overflow-hidden rounded-md border border-line bg-white" aria-hidden>
                <FitToWidth className="aspect-[210/297]" crop>
                  <CVDocument cv={cv} design={{ ...design, template: t.key }} />
                </FitToWidth>
              </div>
              <span className="mt-1.5 flex items-center gap-1 px-0.5 text-[12px] leading-tight font-semibold">
                {active && <Check className="size-3 text-primary" aria-hidden />}
                {t.name}
              </span>
              <span className="block px-0.5 text-[11px] leading-tight text-muted">{t.note}</span>
            </button>
          );
        })}
      </div>
      {design.template !== "ats" && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-2">Photo</p>
          <div role="radiogroup" aria-label="Photo" className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
            {([
              [true, "With photo", UserRound],
              [false, "Without photo", ImageOff],
            ] as const).map(([on, label, Icon]) => {
              const active = (design.showPhoto !== false) === on;
              return (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ ...design, showPhoto: on })}
                  className={cx("pressable flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium", active ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink")}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              );
            })}
          </div>
          {design.showPhoto !== false && !cv.photo && (
            <p className="mt-2 text-[12px] text-muted">No photo yet — your initials are shown. Add one under Edit → Personal details.</p>
          )}
        </div>
      )}
      {design.template !== "ats" && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-2">Accent colour</p>
          <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-2">
            {CV_ACCENTS.map((a) => {
              const active = design.accent.toLowerCase() === a.hex;
              return (
                <button
                  key={a.hex}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={a.name}
                  title={a.name}
                  onClick={() => onChange({ ...design, accent: a.hex })}
                  className={cx("pressable grid size-9 cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-card", active && "ring-2 ring-ink")}
                  style={{ background: a.hex }}
                >
                  {active && <Check className="size-4 text-white" aria-hidden />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {design.template !== "ats" && (
        <p className="text-[12px] leading-snug text-muted">
          Designed layouts look great as PDF. Some online application systems read plain layouts more reliably — use “ATS simple” for those. DOCX export always uses the ATS-friendly layout.
        </p>
      )}
    </div>
  );
}
