"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Import } from "lucide-react";
import { saveProfileAction } from "@/app/actions/cv";
import type { CVData, Profile } from "@/lib/types";
import { Button, Field, Input } from "@/components/ui";
import { EducationEditor, ExperienceEditor, LanguagesEditor, TagsEditor } from "@/components/cv-form";

export function ProfileForm({ initial, cv }: { initial: Profile; cv: CVData | null }) {
  const [p, setP] = useState(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const importFromCV = () => {
    if (!cv) return;
    setP((x) => ({
      ...x,
      headline: x.headline || cv.headline,
      location: x.location || cv.location,
      experience: x.experience.length ? x.experience : cv.experience,
      education: x.education.length ? x.education : cv.education,
      skills: [...new Set([...x.skills, ...cv.skills])],
      certificates: [...new Set([...x.certificates, ...cv.certificates])],
      languages: x.languages.length ? x.languages : cv.languages,
    }));
    toast("Imported from your CV", { description: "Review and save." });
  };

  return (
    <div className="space-y-8">
      {cv && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunken px-4 py-3">
          <p className="text-sm text-ink-2">Fill empty fields from your saved CV.</p>
          <Button variant="secondary" size="sm" onClick={importFromCV}><Import className="size-4" aria-hidden /> Import from CV</Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline"><Input value={p.headline} onChange={(e) => set("headline", e.target.value)} placeholder="e.g. Logistics worker with forklift experience" /></Field>
        <Field label="Location in Finland"><Input value={p.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Vantaa" /></Field>
        <Field label="Work authorisation" hint="Used only to help you answer application questions honestly.">
          <Input value={p.workAuthorization} onChange={(e) => set("workAuthorization", e.target.value)} placeholder="e.g. Residence permit with right to work" />
        </Field>
        <Field label="Target roles"><Input value={p.targetRoles} onChange={(e) => set("targetRoles", e.target.value)} placeholder="e.g. cleaner, warehouse worker" /></Field>
      </div>
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Extra experience not in your CV</h3>
        <p className="-mt-1 text-sm text-muted">Informal work, volunteering or experience abroad — it can count as evidence.</p>
        <ExperienceEditor value={p.experience} onChange={(v) => set("experience", v)} />
      </section>
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Skills</h3>
        <TagsEditor label="Skills" value={p.skills} onChange={(v) => set("skills", v)} placeholder="Type a skill and press Enter" />
      </section>
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Languages</h3>
        <LanguagesEditor value={p.languages} onChange={(v) => set("languages", v)} />
      </section>
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Certificates & Finnish work cards</h3>
        <TagsEditor label="Certificates" value={p.certificates} onChange={(v) => set("certificates", v)} placeholder="e.g. Hygieniapassi, Trukkikortti" />
      </section>
      <section className="space-y-3">
        <h3 className="text-[15px] font-semibold">Education</h3>
        <EducationEditor value={p.education} onChange={(v) => set("education", v)} />
      </section>
      <div className="flex justify-end">
        <Button
          loading={pending}
          onClick={() =>
            start(async () => {
              await saveProfileAction(p);
              toast.success("Profile saved");
            })
          }
        >
          Save profile
        </Button>
      </div>
    </div>
  );
}
