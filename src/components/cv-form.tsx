"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Plus, Sparkles, Trash2, Undo2, X } from "lucide-react";
import type { CVData, Education, Experience, LanguageSkill } from "@/lib/types";
import { Field, Input, Textarea, cx } from "@/components/ui";

/** Violet frame marking content the app suggested (differs from the original CV). */
export function Suggested({ active, onRevert, children, note }: { active: boolean; onRevert?: () => void; children: ReactNode; note?: ReactNode }) {
  if (!active) return <>{children}</>;
  return (
    <div className="rounded-xl border border-suggest-border bg-suggest-bg/60 p-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-suggest">
          <Sparkles className="size-3.5" aria-hidden /> Suggested by Job Helper
        </span>
        {onRevert && (
          <button type="button" onClick={onRevert} className="pressable inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-2 hover:bg-card">
            <Undo2 className="size-3.5" aria-hidden /> Use my original
          </button>
        )}
      </div>
      {children}
      {note && <div className="mt-2 px-0.5 text-[13px]">{note}</div>}
    </div>
  );
}

/** Crops to a centred square and downsizes to keep the stored CV small (~40 KB). */
async function toSquareJpeg(file: File, size = 480): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // Bias the crop slightly upward so faces stay in frame on portrait photos.
  const sy = bitmap.height > bitmap.width ? (bitmap.height - side) * 0.25 : (bitmap.height - side) / 2;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PhotoField({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const [error, setError] = useState<string | null>(null);
  const id = "cv-photo-input";
  return (
    <div className="flex items-center gap-4">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-sunken">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="CV photo" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-muted" aria-hidden />
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-2">
          <label htmlFor={id} className="pressable inline-flex h-9 cursor-pointer items-center rounded-lg border border-line bg-card px-3 text-sm font-medium hover:border-line-strong">
            {value ? "Change photo" : "Add photo"}
          </label>
          {value && (
            <button type="button" onClick={() => onChange(undefined)} className="pressable h-9 cursor-pointer rounded-lg px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-missing">
              Remove
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">Optional. Common in Finland — a friendly, well-lit portrait works best.</p>
        {error && <p className="text-[13px] text-missing">{error}</p>}
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            if (f.size > 12 * 1024 * 1024) return setError("Please choose an image under 12 MB.");
            try {
              setError(null);
              onChange(await toSquareJpeg(f));
            } catch {
              setError("That image couldn't be read. Try a JPG or PNG.");
            }
          }}
        />
      </div>
    </div>
  );
}

export function HighlightsEditor({ value, onChange }: { value: { title: string; text: string }[]; onChange: (v: { title: string; text: string }[]) => void }) {
  const set = (i: number, patch: Partial<{ title: string; text: string }>) => onChange(value.map((h, j) => (j === i ? { ...h, ...patch } : h)));
  return (
    <div className="space-y-3">
      {value.map((h, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-line bg-bg p-4">
          <div className="flex gap-2">
            <Input aria-label="Area title" value={h.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="e.g. Customer service" />
            <IconBtn label="Remove area" danger onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="size-4" /></IconBtn>
          </div>
          <Textarea aria-label="Area description" rows={3} value={h.text} onChange={(e) => set(i, { text: e.target.value })} placeholder="2–4 sentences about your real experience in this area." />
        </div>
      ))}
      <AddBtn onClick={() => onChange([...value, { title: "", text: "" }])}>Add strength area</AddBtn>
    </div>
  );
}

let counter = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${counter++}`;

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function IconBtn({ label, onClick, children, danger }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx("pressable grid size-9 cursor-pointer place-items-center rounded-lg text-muted hover:bg-sunken", danger ? "hover:text-missing" : "hover:text-ink")}
    >
      {children}
    </button>
  );
}

function AddBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="pressable inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-primary hover:bg-primary-soft">
      <Plus className="size-4" aria-hidden /> {children}
    </button>
  );
}

export function TagsEditor({ value, onChange, placeholder, label }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; label: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft.split(",").map((s) => s.trim()).filter(Boolean).filter((s) => !value.includes(s));
    if (items.length) onChange([...value, ...items]);
    setDraft("");
  };
  return (
    <div className="rounded-xl border border-line bg-card p-2 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
      <ul className="flex flex-wrap gap-1.5" aria-label={label}>
        {value.map((t, i) => (
          <li key={`${t}-${i}`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-sunken pr-1 pl-2.5 text-sm">
            {t}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove ${t}`} className="grid size-6 cursor-pointer place-items-center rounded-md text-muted hover:bg-line hover:text-ink">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
        <li className="min-w-[10rem] flex-1">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add();
              } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={add}
            placeholder={placeholder}
            aria-label={`Add ${label.toLowerCase()}`}
            className="h-8 w-full bg-transparent px-1.5 text-[16px] outline-none placeholder:text-muted/70"
          />
        </li>
      </ul>
    </div>
  );
}

export function LanguagesEditor({ value, onChange }: { value: LanguageSkill[]; onChange: (v: LanguageSkill[]) => void }) {
  const set = (i: number, patch: Partial<LanguageSkill>) => onChange(value.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {value.map((l, i) => (
        <div key={i} className="flex gap-2">
          <Input aria-label="Language" value={l.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="e.g. Finnish" />
          <Input aria-label="Level" value={l.level} onChange={(e) => set(i, { level: e.target.value })} placeholder="A1–C2 or Native" className="max-w-[10rem]" list="cefr-levels" />
          <IconBtn label="Remove language" danger onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Trash2 className="size-4" />
          </IconBtn>
        </div>
      ))}
      <datalist id="cefr-levels">
        {["A1", "A2", "B1", "B2", "C1", "C2", "Native"].map((l) => <option key={l} value={l} />)}
      </datalist>
      <AddBtn onClick={() => onChange([...value, { name: "", level: "" }])}>Add language</AddBtn>
    </div>
  );
}

export function ExperienceEditor({ value, onChange, original }: { value: Experience[]; onChange: (v: Experience[]) => void; original?: Experience[] }) {
  const set = (i: number, patch: Partial<Experience>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const move = (i: number, d: -1 | 1) => {
    const n = [...value];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    onChange(n);
  };
  return (
    <div className="space-y-3">
      {value.map((e, i) => (
        <div key={e.id} className="rounded-xl border border-line bg-bg p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-ink-2">{e.title || "New role"}</p>
            <div className="flex">
              {i > 0 && <IconBtn label="Move up" onClick={() => move(i, -1)}><ChevronUp className="size-4" /></IconBtn>}
              {i < value.length - 1 && <IconBtn label="Move down" onClick={() => move(i, 1)}><ChevronDown className="size-4" /></IconBtn>}
              <IconBtn label="Remove role" danger onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="size-4" /></IconBtn>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job title"><Input value={e.title} onChange={(x) => set(i, { title: x.target.value })} /></Field>
            <Field label="Employer"><Input value={e.employer} onChange={(x) => set(i, { employer: x.target.value })} /></Field>
            <Field label="Start"><Input value={e.start} onChange={(x) => set(i, { start: x.target.value })} placeholder="e.g. 03/2021" /></Field>
            <Field label="End"><Input value={e.end} onChange={(x) => set(i, { end: x.target.value })} placeholder="e.g. Present" /></Field>
            <div className="sm:col-span-2">
              <Field label="Location"><Input value={e.location} onChange={(x) => set(i, { location: x.target.value })} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="What you did (one point per line)">
                {(() => {
                  const orig = original?.find((o) => o.id === e.id);
                  const changed = orig ? e.bullets.filter((b) => b.trim() && !orig.bullets.includes(b)) : [];
                  return (
                    <Suggested
                      active={changed.length > 0}
                      onRevert={orig ? () => set(i, { bullets: orig.bullets }) : undefined}
                      note={
                        <ul className="space-y-1">
                          {changed.map((b, k) => (
                            <li key={k} className="text-suggest">• {b}</li>
                          ))}
                        </ul>
                      }
                    >
                      <Textarea
                        rows={Math.max(3, e.bullets.length + 1)}
                        value={e.bullets.join("\n")}
                        onChange={(x) => set(i, { bullets: x.target.value.split("\n") })}
                        onBlur={() => set(i, { bullets: e.bullets.map((b) => b.trim()).filter(Boolean) })}
                      />
                    </Suggested>
                  );
                })()}
              </Field>
            </div>
          </div>
        </div>
      ))}
      <AddBtn onClick={() => onChange([...value, { id: newId("e"), title: "", employer: "", location: "", start: "", end: "", bullets: [] }])}>Add role</AddBtn>
    </div>
  );
}

export function EducationEditor({ value, onChange }: { value: Education[]; onChange: (v: Education[]) => void }) {
  const set = (i: number, patch: Partial<Education>) => onChange(value.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  return (
    <div className="space-y-3">
      {value.map((e, i) => (
        <div key={e.id} className="rounded-xl border border-line bg-bg p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-ink-2">{e.degree || "New education"}</p>
            <IconBtn label="Remove education" danger onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 className="size-4" /></IconBtn>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Degree / qualification"><Input value={e.degree} onChange={(x) => set(i, { degree: x.target.value })} /></Field>
            <Field label="Institution"><Input value={e.institution} onChange={(x) => set(i, { institution: x.target.value })} /></Field>
            <Field label="Start"><Input value={e.start} onChange={(x) => set(i, { start: x.target.value })} /></Field>
            <Field label="End"><Input value={e.end} onChange={(x) => set(i, { end: x.target.value })} /></Field>
            <div className="sm:col-span-2">
              <Field label="Details"><Input value={e.details} onChange={(x) => set(i, { details: x.target.value })} /></Field>
            </div>
          </div>
        </div>
      ))}
      <AddBtn onClick={() => onChange([...value, { id: newId("ed"), degree: "", institution: "", start: "", end: "", details: "" }])}>Add education</AddBtn>
    </div>
  );
}

/** Full structured CV editor. */
/**
 * Full structured CV editor. Pass `original` to highlight — in the violet
 * "suggestion" colour — every field that differs from the applicant's own CV.
 */
export function CVForm({ value, onChange, original }: { value: CVData; onChange: (v: CVData) => void; original?: CVData }) {
  const set = <K extends keyof CVData>(k: K, v: CVData[K]) => onChange({ ...value, [k]: v });
  const differs = (k: "headline" | "summary") => Boolean(original) && value[k].trim() !== original![k].trim();
  const skillsDiffer = Boolean(original) && value.skills.join("|") !== original!.skills.join("|");
  return (
    <div className="space-y-8">
      <Section title="Personal details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name"><Input value={value.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Headline" hint={original ? "A short line under your name, aimed at this job." : undefined}>
            <Suggested active={differs("headline")} onRevert={() => set("headline", original!.headline)}>
              <Input value={value.headline} onChange={(e) => set("headline", e.target.value)} placeholder="e.g. Cleaner and customer service worker" />
            </Suggested>
          </Field>
          <Field label="Email"><Input type="email" value={value.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={value.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Location"><Input value={value.location} onChange={(e) => set("location", e.target.value)} /></Field>
        </div>
        <PhotoField value={value.photo} onChange={(v) => set("photo", v)} />
      </Section>
      <Section title="Summary">
        <Suggested active={differs("summary")} onRevert={() => set("summary", original!.summary)}>
          <Textarea rows={5} value={value.summary} onChange={(e) => set("summary", e.target.value)} aria-label="Summary" />
        </Suggested>
      </Section>
      <Section title="Key strengths (optional)">
        <p className="-mt-1 text-sm text-muted">Short themed paragraphs such as “Customer service” or “Sales”, shown prominently in the designed layouts.</p>
        <HighlightsEditor value={value.highlights ?? []} onChange={(v) => set("highlights", v)} />
      </Section>
      <Section title="Work experience">
        <ExperienceEditor value={value.experience} onChange={(v) => set("experience", v)} original={original?.experience} />
      </Section>
      <Section title="Skills">
        <Suggested active={skillsDiffer} onRevert={() => set("skills", original!.skills)} note={<span className="text-suggest">Order changed so the skills this job asks for come first.</span>}>
          <TagsEditor label="Skills" value={value.skills} onChange={(v) => set("skills", v)} placeholder="Type a skill and press Enter" />
        </Suggested>
      </Section>
      <Section title="Languages">
        <LanguagesEditor value={value.languages} onChange={(v) => set("languages", v)} />
      </Section>
      <Section title="Certificates & licences">
        <TagsEditor label="Certificates" value={value.certificates} onChange={(v) => set("certificates", v)} placeholder="e.g. Työturvallisuuskortti" />
      </Section>
      <Section title="Education">
        <EducationEditor value={value.education} onChange={(v) => set("education", v)} />
      </Section>
      <Section title="Volunteering & interests (optional)">
        <TagsEditor label="Interests" value={value.interests ?? []} onChange={(v) => set("interests", v)} placeholder="e.g. Summer camp counsellor" />
      </Section>
    </div>
  );
}
