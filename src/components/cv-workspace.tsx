"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, Copy, Eye, FileDown, GitCompare, Lock, Pencil, Printer, Save, Scissors, ShieldCheck } from "lucide-react";
import { approveCVAction, condenseCVAction, newTailoringVersionAction, saveTailoredCVAction } from "@/app/actions/jobs";
import type { Analysis, CVData } from "@/lib/types";
import { DEFAULT_DESIGN } from "@/lib/types";
import { Button, Card, Notice, buttonClass, cx } from "@/components/ui";
import { CVForm } from "@/components/cv-form";
import { CVDocument } from "@/components/cv-templates";
import { DesignPicker } from "@/components/design-picker";
import { ATSScoreCard } from "@/components/ats-score";
import { FitToWidth } from "@/components/fit-to-width";
import { DiffText } from "@/components/diff-view";

type Tab = "preview" | "edit" | "changes";
const PAGE_PX = 1123; // one A4 page at 96 dpi

export interface WorkspaceMeta {
  approved: boolean;
  flags: Record<string, string[]>;
  note?: string;
}

function flagLabel(key: string, cv: CVData) {
  if (key === "headline") return "Headline";
  if (key === "summary") return "Summary";
  if (key === "skills") return "Skills";
  if (key.startsWith("highlight:")) return `Expertise area “${cv.highlights?.[Number(key.split(":")[1])]?.title ?? ""}”`;
  if (key.startsWith("exp:")) {
    const [, id, i] = key.split(":");
    const e = cv.experience.find((x) => x.id === id);
    return `${e?.title ?? "Experience"} — point ${Number(i) + 1}`;
  }
  return key;
}

function Steps({ approved }: { approved: boolean }) {
  const steps = ["Check the rewrite", "Choose a template", "Download"];
  const current = approved ? 1 : 0;
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Finish your CV">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cx(
              "grid size-6 place-items-center rounded-full text-xs font-semibold",
              i < current ? "bg-match-bg text-match" : i === current ? "bg-primary text-primary-ink" : "bg-sunken text-muted",
            )}
          >
            {i < current ? <Check className="size-3.5" aria-hidden /> : i + 1}
          </span>
          <span className={i === current ? "font-semibold text-ink" : "text-muted"}>{s}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

export function CVWorkspace({
  jobId,
  tailoringId,
  version,
  original,
  tailored,
  versions,
  analysis,
  meta,
}: {
  jobId: string;
  tailoringId: string;
  version: number;
  original: CVData;
  tailored: CVData;
  versions: { id: string; version: number; updated_at: string; generated: boolean }[];
  analysis: Analysis;
  meta: WorkspaceMeta;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("preview");
  const [cv, setCv] = useState(tailored);
  const [saved, setSaved] = useState(tailored);
  const [approved, setApproved] = useState(meta.approved);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [height, setHeight] = useState(0);
  const [saving, startSave] = useTransition();
  const [forking, startFork] = useTransition();
  const [approving, startApprove] = useTransition();
  const [shortening, startShorten] = useTransition();
  const dirty = useMemo(() => JSON.stringify(cv) !== JSON.stringify(saved), [cv, saved]);
  // Allow ~4% slack so a line or two of overflow doesn't count as a new page.
  const pages = height ? Math.max(1, Math.ceil(height / (PAGE_PX * 1.04))) : 0;
  const flagEntries = Object.entries(meta.flags ?? {});

  const save = () =>
    startSave(async () => {
      const r = await saveTailoredCVAction(jobId, tailoringId, cv);
      if (r.ok) {
        setSaved(cv);
        toast.success(`Version ${version} saved`);
      } else toast.error(r.error);
    });

  const approve = () =>
    startApprove(async () => {
      if (dirty) {
        await saveTailoredCVAction(jobId, tailoringId, cv);
        setSaved(cv);
      }
      const r = await approveCVAction(jobId, tailoringId);
      if (!r.ok) return void toast.error(r.error);
      setApproved(true);
      setTab("preview");
      toast.success("CV approved", { description: "Now choose a template and download it." });
    });

  const shorten = () =>
    startShorten(async () => {
      if (dirty) await saveTailoredCVAction(jobId, tailoringId, cv);
      const r = await condenseCVAction(jobId, tailoringId);
      if (!r.ok) return void toast.error(r.error);
      toast.success("CV shortened", { description: r.changes.join(" · ") || "Already as short as it can be without removing facts." });
      router.refresh();
    });

  const fork = () =>
    startFork(async () => {
      if (dirty) await saveTailoredCVAction(jobId, tailoringId, cv);
      const r = await newTailoringVersionAction(jobId, tailoringId);
      if (r.ok) {
        toast.success("New version created", { description: "The previous version is kept unchanged." });
        router.push(`/jobs/${jobId}/cv?v=${r.id}`);
      }
    });

  const tabs: { key: Tab; label: string; icon: typeof Eye }[] = [
    { key: "preview", label: "Preview", icon: Eye },
    { key: "edit", label: "Edit", icon: Pencil },
    { key: "changes", label: "What changed", icon: GitCompare },
  ];

  return (
    <div className="space-y-5">
      <Steps approved={approved} />

      {!approved && (
        <section className="rounded-2xl border border-suggest-border bg-suggest-bg/60 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-suggest">
            <ShieldCheck className="size-5" aria-hidden /> Check your rewritten CV
          </h2>
          <p className="mt-1 text-[15px] text-ink-2">
            {meta.note || "Job Helper rewrote your CV for this job."} Everything in <span className="font-semibold text-suggest">violet</span> was written by Job Helper — read it, fix anything that isn’t exactly true in <em>Edit</em>, then approve.
          </p>
          {flagEntries.length > 0 && (
            <div className="mt-3 rounded-xl bg-card p-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-partial"><AlertTriangle className="size-4" aria-hidden /> Please double-check these ({flagEntries.length})</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink-2">
                {flagEntries.map(([k, f]) => (
                  <li key={k}><span className="font-medium">{flagLabel(k, cv)}:</span> {f.join("; ")}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={approve} loading={approving}>
              <Check className="size-4" aria-hidden /> Looks right — approve
            </Button>
            {tab !== "edit" && (
              <Button variant="secondary" onClick={() => setTab("edit")}>
                <Pencil className="size-4" aria-hidden /> Edit first
              </Button>
            )}
          </div>
        </section>
      )}

      {pages > 2 && (
        <Notice tone="warn" icon={<AlertTriangle className="size-4" />}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Your CV is about {pages} pages — keep it to 2 at most.</p>
              <p className="mt-0.5">Finnish recruiters skim. Shorten the summary, keep 3–4 points for recent jobs and 1–2 for older ones.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={shorten} loading={shortening}>
              <Scissors className="size-4" aria-hidden /> Shorten to 2 pages
            </Button>
          </div>
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" className="inline-flex rounded-xl bg-sunken p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={cx("pressable flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-medium", tab === t.key ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink")}
                >
                  <t.icon className="size-4" aria-hidden /> {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {pages > 0 && (
                <span className={cx("text-sm tabular-nums", pages > 2 ? "font-semibold text-partial" : "text-muted")}>
                  {pages} page{pages > 1 ? "s" : ""}
                </span>
              )}
              {dirty && (
                <Button size="sm" onClick={save} loading={saving}>
                  <Save className="size-4" aria-hidden /> Save changes
                </Button>
              )}
            </div>
          </div>

          {tab !== "changes" && <SuggestionLegend show={showSuggestions} onToggle={tab === "preview" ? () => setShowSuggestions((s) => !s) : undefined} />}
          {tab === "preview" && (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
              <FitToWidth onHeight={setHeight}>
                <CVDocument cv={cv} compare={showSuggestions ? original : undefined} />
              </FitToWidth>
            </div>
          )}
          {tab === "edit" && (
            <Card className="p-5 sm:p-6">
              <Notice tone="info" className="mb-6">
                Edit freely — this is version {version} for this job only. Your original CV stays unchanged. Keep every fact true: dates, employers and titles should match reality.
              </Notice>
              <CVForm value={cv} onChange={setCv} original={original} />
            </Card>
          )}
          {tab === "changes" && <Changes original={original} tailored={cv} />}
        </div>

        <aside className="space-y-4">
          {approved ? (
            <Card className="p-5">
              <h2 className="mb-3 font-semibold">Choose a template</h2>
              <DesignPicker
                cv={cv}
                design={cv.design ?? DEFAULT_DESIGN}
                onChange={(design) => {
                  setCv({ ...cv, design });
                  setTab("preview");
                }}
              />
            </Card>
          ) : (
            <Card className="flex items-start gap-3 p-5 text-sm text-muted">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>Templates and download unlock after you approve the rewritten CV.</p>
            </Card>
          )}

          <ATSScoreCard cv={cv} original={original} analysis={analysis} />

          {approved && (
            <Card className="p-5">
              <h2 className="font-semibold">Download</h2>
              {dirty && <p className="mt-2 text-[13px] text-partial">Save your changes before downloading.</p>}
              {pages > 2 && <p className="mt-2 text-[13px] text-partial">Tip: shorten to 2 pages first.</p>}
              <div className="mt-3 grid gap-2">
                <a
                  href={!dirty ? `/print/${jobId}/${tailoringId}?print=1` : undefined}
                  target="_blank"
                  rel="noopener"
                  aria-disabled={dirty}
                  className={buttonClass("primary", "md", cx("w-full", dirty && "pointer-events-none opacity-50"))}
                >
                  <Printer className="size-4" aria-hidden /> Save as PDF (chosen template)
                </a>
                <a
                  href={!dirty ? `/api/jobs/${jobId}/cv/${tailoringId}/docx` : undefined}
                  aria-disabled={dirty}
                  className={buttonClass("secondary", "md", cx("w-full", dirty && "pointer-events-none opacity-50"))}
                >
                  <FileDown className="size-4" aria-hidden /> Download DOCX (ATS-safe)
                </a>
              </div>
              <p className="mt-3 text-[13px] text-muted">PDF uses your template. DOCX is always a plain single column — best for online application forms.</p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Versions</h2>
              <Button variant="ghost" size="sm" onClick={fork} loading={forking}>
                <Copy className="size-4" aria-hidden /> New version
              </Button>
            </div>
            <ul className="mt-2 space-y-1">
              {versions.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/jobs/${jobId}/cv?v=${v.id}`}
                    aria-current={v.id === tailoringId ? "true" : undefined}
                    className={cx("flex items-center justify-between rounded-lg px-3 py-2 text-sm", v.id === tailoringId ? "bg-primary-soft text-primary-soft-ink" : "hover:bg-sunken")}
                  >
                    <span className="font-medium">Version {v.version}</span>
                    <span className="text-xs text-muted">{new Date(v.updated_at).toLocaleDateString("en-GB")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {approved && (
            <Link href={`/jobs/${jobId}/application`} className={buttonClass("soft", "md", "w-full")}>
              Next: write the application <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

function SuggestionLegend({ show, onToggle }: { show: boolean; onToggle?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-suggest-border bg-suggest-bg/60 px-4 py-2.5 text-sm">
      <p className="text-ink-2">
        <span className="mr-1.5 inline-block size-2.5 rounded-sm bg-suggest align-middle" aria-hidden />
        <span className="font-semibold text-suggest">Violet</span> = suggested by Job Helper. Everything else is your original CV.
      </p>
      {onToggle && (
        <button type="button" onClick={onToggle} aria-pressed={show} className="pressable cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-suggest hover:bg-card">
          {show ? "Hide highlights" : "Show highlights"}
        </button>
      )}
    </div>
  );
}

function Changes({ original, tailored }: { original: CVData; tailored: CVData }) {
  const rows: { label: string; a: string; b: string }[] = [];
  const cmp = (label: string, a: string, b: string) => a.trim() !== b.trim() && rows.push({ label, a, b });
  cmp("Name", original.name, tailored.name);
  cmp("Headline", original.headline, tailored.headline);
  cmp("Summary", original.summary, tailored.summary);
  const byId = new Map(original.experience.map((e) => [e.id, e]));
  for (const e of tailored.experience) {
    const o = byId.get(e.id);
    if (!o) {
      rows.push({ label: `Added role: ${e.title}`, a: "", b: [e.title, e.employer, `${e.start}–${e.end}`, ...e.bullets].join("\n") });
      continue;
    }
    cmp(`${e.title} — title/employer/dates`, `${o.title} | ${o.employer} | ${o.start}–${o.end}`, `${e.title} | ${e.employer} | ${e.start}–${e.end}`);
    cmp(`${e.title} — bullets`, o.bullets.join("\n"), e.bullets.join("\n"));
  }
  for (const o of original.experience) if (!tailored.experience.some((e) => e.id === o.id)) rows.push({ label: `Removed role: ${o.title}`, a: o.title, b: "" });
  const origOrder = original.experience.map((e) => e.id).join();
  const newOrder = tailored.experience.filter((e) => byId.has(e.id)).map((e) => e.id).join();
  if (origOrder !== newOrder) rows.push({ label: "Experience order", a: original.experience.map((e) => e.title).join(" → "), b: tailored.experience.map((e) => e.title).join(" → ") });
  cmp("Skills", original.skills.join(", "), tailored.skills.join(", "));
  cmp("Languages", original.languages.map((l) => `${l.name} ${l.level}`).join(", "), tailored.languages.map((l) => `${l.name} ${l.level}`).join(", "));
  cmp("Certificates", original.certificates.join(", "), tailored.certificates.join(", "));
  cmp("Education", original.education.map((e) => `${e.degree} ${e.institution} ${e.end}`).join("\n"), tailored.education.map((e) => `${e.degree} ${e.institution} ${e.end}`).join("\n"));

  if (!rows.length) return <Notice tone="info">This version is identical to your original CV.</Notice>;
  return (
    <Card className="divide-y divide-line">
      <p className="px-5 py-3 text-sm text-muted">
        Compared with your original CV. <ins className="rounded bg-suggest-bg px-1 text-suggest no-underline">Added</ins> <del className="rounded bg-del px-1">removed</del>
      </p>
      {rows.map((r) => (
        <div key={r.label} className="px-5 py-4">
          <h3 className="mb-1.5 text-sm font-semibold text-ink-2">{r.label}</h3>
          <DiffText a={r.a} b={r.b} />
        </div>
      ))}
    </Card>
  );
}
