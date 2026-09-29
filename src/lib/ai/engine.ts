import "server-only";
import { hasAI } from "./openai";
import { llmAnalyze, llmApplication, llmInterview, llmOcr, llmParseCV, llmRewriteCV, type RewriteResult } from "./llm";
import { conceptsIn, demoAnalyze, demoApplication, demoInterview, demoParseCV } from "./demo";
import type {
  Analysis,
  ApplicationDraft,
  CVData,
  CVFormat,
  InterviewPrep,
  OcrResult,
  Profile,
  RecommendationState,
} from "../types";
import { emptyCV } from "../types";

export type Engine = "ai" | "demo";

export function engine(): Engine {
  return hasAI() ? "ai" : "demo";
}

export async function ocrImages(dataUrls: string[]): Promise<OcrResult | null> {
  // In demo mode OCR runs in the browser (Tesseract.js); caller handles null.
  if (engine() === "demo") return null;
  const r = await llmOcr(dataUrls);
  if (r.text.trim().length < 40) return { ...r, readable: false, issues: r.issues || "Very little text was found." };
  return r;
}

export async function parseCV(text: string): Promise<CVData> {
  const raw = engine() === "ai" ? await llmParseCV(text) : demoParseCV(text);
  return normalizeCV(raw);
}

export async function analyzeJob(jobText: string, cv: CVData, profile: Profile): Promise<Analysis> {
  const clean = normalizeCV(cv);
  const raw = engine() === "ai" ? await llmAnalyze(jobText, clean, profile) : demoAnalyze(jobText, clean, profile);
  return raw;
}

export async function generateApplication(jobText: string, analysis: Analysis, cv: CVData): Promise<ApplicationDraft> {
  return engine() === "ai" ? llmApplication(jobText, analysis, cv) : demoApplication(analysis, cv);
}

export async function generateInterview(jobText: string, analysis: Analysis, cv: CVData): Promise<InterviewPrep> {
  return engine() === "ai" ? llmInterview(jobText, analysis, cv) : demoInterview(analysis, cv);
}

// ───────────────────────── validation / grounding guard ─────────────────────────

/** Strips stray leading/trailing separators left by PDF/DOCX extraction (": Head of Marketing"). */
const tidy = (s: string | undefined) => (s ?? "").replace(/^[\s:;,.|–—-]+|[\s:;,|–—-]+$/g, "").trim();

const MARKER = /^[\s\-–—•●○◦▪■□·*:;>➢►▸✓✔]+/;

/**
 * Turns raw extracted lines into clean bullet points:
 *  - strips stray markers ("- ", "● ", ": ")
 *  - rejoins lines that PDF extraction wrapped mid-sentence ("…market position" + "for App and web.")
 *  - drops sub-heading labels such as "Achievements:"
 */
export function cleanBullets(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const b = (raw ?? "").replace(MARKER, "").replace(/\s+/g, " ").trim();
    if (!b) continue;
    if (/^[\p{L}][\p{L} &/]{1,34}:$/u.test(b)) continue; // "Achievements:", "Key results:"
    const prev = out[out.length - 1];
    if (prev !== undefined && /^[a-zåäö(&]/.test(b)) {
      out[out.length - 1] = `${prev} ${b}`; // continuation of a wrapped line
      continue;
    }
    out.push(b);
  }
  return out;
}

export function normalizeCV(cv: Partial<CVData>): CVData {
  const base = emptyCV();
  const out: CVData = { ...base, ...cv } as CVData;
  out.experience = (out.experience ?? []).map((e, i) => ({
    id: e.id || `e${i + 1}`,
    title: tidy(e.title),
    employer: tidy(e.employer),
    location: tidy(e.location),
    start: e.start ?? "",
    end: e.end ?? "",
    bullets: cleanBullets(e.bullets ?? []),
  }));
  // Ids must be unique for recommendations to target the right role.
  const seen = new Set<string>();
  out.experience.forEach((e, i) => {
    if (seen.has(e.id)) e.id = `e${i + 1}_${i}`;
    seen.add(e.id);
  });
  out.education = (out.education ?? []).map((e, i) => ({
    id: e.id || `ed${i + 1}`,
    degree: tidy(e.degree),
    institution: tidy(e.institution),
    start: e.start ?? "",
    end: e.end ?? "",
    details: e.details ?? "",
  }));
  out.skills = [...new Set((out.skills ?? []).map((s) => tidy(s)).filter(Boolean))];
  out.certificates = (out.certificates ?? []).map((s) => tidy(s)).filter(Boolean);
  if (out.interests) out.interests = out.interests.map((s) => tidy(s)).filter(Boolean);
  out.headline = tidy(out.headline);
  out.languages = (out.languages ?? []).filter((l) => l?.name);
  return out;
}

export function cvText(cv: CVData, profile?: Profile) {
  const parts = [
    cv.name,
    cv.headline,
    cv.summary,
    ...cv.experience.flatMap((e) => [e.title, e.employer, e.location, e.start, e.end, ...e.bullets]),
    ...cv.education.flatMap((e) => [e.degree, e.institution, e.start, e.end, e.details]),
    ...cv.skills,
    ...cv.certificates,
    ...cv.languages.map((l) => `${l.name} ${l.level}`),
  ];
  if (profile) {
    parts.push(
      profile.headline,
      ...profile.experience.flatMap((e) => [e.title, e.employer, ...e.bullets]),
      ...profile.education.flatMap((e) => [e.degree, e.institution, e.details]),
      ...profile.skills,
      ...profile.certificates,
      ...profile.languages.map((l) => `${l.name} ${l.level}`),
    );
  }
  return parts.filter(Boolean).join("\n");
}

const NUMBER = /\d+(?:[.,]\d+)?\s*%?/g;

/** Flags anything in a suggestion that the applicant's CV/profile does not support. */
export function groundingFlags(suggested: string, original: string, source: string): string[] {
  const flags: string[] = [];
  const corpus = `${source}\n${original}`;
  const nums = (suggested.match(NUMBER) ?? []).map((n) => n.trim()).filter((n) => !corpus.includes(n.replace(/\s*%$/, "")));
  if (nums.length) flags.push(`Contains ${nums.length > 1 ? "numbers" : "a number"} not found in your CV: ${[...new Set(nums)].join(", ")}`);
  const sourceConcepts = new Set(conceptsIn(corpus).map((c) => c.id));
  const unsupported = conceptsIn(suggested).filter((c) => !c.soft && !sourceConcepts.has(c.id));
  if (unsupported.length) flags.push(`Mentions ${unsupported.map((c) => c.label).join(", ")} — not evidenced in your CV`);
  return flags;
}

export function buildRecommendationStates(analysis: Analysis, rawCV: CVData, profile: Profile): RecommendationState[] {
  const cv = normalizeCV(rawCV);
  const source = cvText(cv, profile);
  const skillsLower = new Set(cv.skills.map((s) => s.toLowerCase()));
  const out: RecommendationState[] = [];
  for (const r of analysis.recommendations) {
    const rec = { ...r };
    if (rec.section === "bullet") {
      const exp = cv.experience.find((e) => e.id === rec.experience_id);
      if (!exp || rec.bullet_index < 0 || rec.bullet_index >= exp.bullets.length) continue; // invalid target
      rec.original = exp.bullets[rec.bullet_index];
    } else if (rec.section === "highlight") {
      rec.title = (rec.title ?? "").trim() || "Expertise";
      rec.original = cv.highlights?.find((h) => h.title.toLowerCase() === rec.title!.toLowerCase())?.text ?? "";
      rec.experience_id = "";
      rec.bullet_index = -1;
    } else if (rec.section === "headline") {
      rec.original = cv.headline;
      rec.experience_id = "";
      rec.bullet_index = -1;
    } else if (rec.section === "summary") {
      rec.original = cv.summary;
      rec.experience_id = "";
      rec.bullet_index = -1;
    } else if (rec.section === "skills") {
      // Only existing skills may appear — reordering, never adding.
      const proposed = rec.suggested.split(",").map((s) => s.trim()).filter((s) => skillsLower.has(s.toLowerCase()));
      const missing = cv.skills.filter((s) => !proposed.some((p) => p.toLowerCase() === s.toLowerCase()));
      rec.suggested = [...proposed, ...missing].join(", ");
      rec.original = cv.skills.join(", ");
      if (rec.suggested === rec.original) continue;
    }
    if (!rec.suggested.trim() || rec.suggested.trim() === rec.original.trim()) continue;
    out.push({
      ...rec,
      id: rec.id || `rec${out.length + 1}`,
      decision: "pending",
      edited: null,
      flags: rec.section === "skills" ? [] : groundingFlags(rec.suggested, rec.original, source),
    });
  }
  const order = { headline: 0, summary: 1, highlight: 2, skills: 3, bullet: 4 } as const;
  out.sort((a, b) => order[a.section] - order[b.section]);
  // Unique ids
  const ids = new Set<string>();
  out.forEach((r, i) => {
    if (ids.has(r.id)) r.id = `${r.id}_${i}`;
    ids.add(r.id);
  });
  return out;
}

/** Applies accepted (optionally edited) recommendations to a copy of the original CV. */
export function applyRecommendations(original: CVData, recs: RecommendationState[]): CVData {
  const cv: CVData = normalizeCV(structuredClone(original));
  for (const r of recs) {
    if (r.decision !== "accepted") continue;
    const text = (r.edited ?? r.suggested).trim();
    if (r.section === "highlight") {
      const title = (r.title ?? "Expertise").trim();
      const rest = (cv.highlights ?? []).filter((h) => h.title.toLowerCase() !== title.toLowerCase());
      cv.highlights = [...rest, { title, text }];
    } else if (r.section === "headline") cv.headline = text;
    else if (r.section === "summary") cv.summary = text;
    else if (r.section === "skills") cv.skills = text.split(",").map((s) => s.trim()).filter(Boolean);
    else if (r.section === "bullet") {
      const exp = cv.experience.find((e) => e.id === r.experience_id);
      if (!exp) continue;
      // Match by text first — indices can shift if the CV was cleaned since the suggestion was made.
      const i = exp.bullets.indexOf(r.original);
      const at = i >= 0 ? i : exp.bullets[r.bullet_index] === r.original ? r.bullet_index : -1;
      if (at >= 0) exp.bullets[at] = text;
    }
  }
  return cv;
}

// ───────────────────────── full rewrite for one job ─────────────────────────

export interface RewriteOutput {
  cv: CVData;
  flags: Record<string, string[]>;
  note: string;
}

/** Skills relevant to the job: ad concepts or words the ad uses. */
function relevantSkills(skills: string[], jobText: string, analysis: Analysis) {
  const job = jobText.toLowerCase();
  const jobConcepts = new Set([...conceptsIn(jobText), ...analysis.requirements.flatMap((r) => conceptsIn(r.text_original))].map((c) => c.id));
  return skills.filter((s) => job.includes(s.toLowerCase()) || conceptsIn(s).some((c) => jobConcepts.has(c.id)));
}

function demoRewrite(jobText: string, analysis: Analysis, cv: CVData, profile: Profile, format: CVFormat): RewriteResult {
  const recs = buildRecommendationStates(analysis, cv, profile).map((r) => ({ ...r, decision: "accepted" as const }));
  const applied = applyRecommendations(cv, recs.filter((r) => r.section !== "skills" && r.section !== "highlight"));
  const relevant = relevantSkills(cv.skills, jobText, analysis);
  // Only job-relevant skills; pad with the CV's other skills only if fewer than 3 are relevant.
  const skills = relevant.length >= 3 ? relevant : [...relevant, ...cv.skills.filter((s) => !relevant.includes(s))].slice(0, 3);
  const highlights = format === "skills" ? recs.filter((r) => r.section === "highlight").map((r) => ({ title: r.title ?? "Expertise", text: r.suggested })) : [];
  const experience = applied.experience.map((e, i) => ({
    id: e.id,
    bullets: format === "skills" ? e.bullets.slice(0, 2) : e.bullets.slice(0, i < 2 ? 5 : 3),
  }));
  return {
    headline: applied.headline,
    summary: applied.summary,
    experience,
    skills,
    highlights,
    note: `Demo rewrite: headline and summary targeted at this job, ${skills.length} relevant skills kept${highlights.length ? `, ${highlights.length} expertise areas added` : ""}, and bullets trimmed to stay within 2 pages. Add a free Gemini key for a full AI rewrite.`,
  };
}

/** Facts come from the original; only wording/selection comes from the rewrite. Everything is validated. */
function mergeRewrite(original: CVData, rw: RewriteResult, format: CVFormat, profile: Profile, jobTitle = ""): RewriteOutput {
  const source = cvText(original, profile);
  const sourceLower = source.toLowerCase();
  const flags: Record<string, string[]> = {};
  const flag = (key: string, suggested: string, orig: string) => {
    const f = groundingFlags(suggested, orig, source);
    if (f.length) flags[key] = f;
  };

  const cv: CVData = structuredClone(original);
  if (rw.headline.trim()) {
    cv.headline = rw.headline.trim();
    flag("headline", cv.headline, original.headline);
    // Presenting yourself with the target job's title is a claim — only allowed if you held that role.
    const target = jobTitle.trim().toLowerCase();
    const held = original.experience.some((e) => e.title.toLowerCase().includes(target) || target.includes(e.title.toLowerCase()));
    if (target.length > 3 && cv.headline.toLowerCase().includes(target) && !held) {
      flags.headline = [...(flags.headline ?? []), `Uses the job title “${jobTitle}”, which isn't one of your past roles — describe what you have actually done instead`];
    }
  }
  if (rw.summary.trim()) {
    cv.summary = rw.summary.trim();
    flag("summary", cv.summary, original.summary);
  }

  const byId = new Map(rw.experience.map((e) => [e.id, e.bullets]));
  cv.experience = original.experience.map((e) => {
    const bullets = cleanBullets(byId.get(e.id) ?? []);
    if (!bullets.length) return e; // role omitted by the AI → keep the original
    bullets.forEach((b, i) => !e.bullets.includes(b) && flag(`exp:${e.id}:${i}`, b, e.bullets.join(" ")));
    return { ...e, bullets };
  });

  // Skills: must exist in the CV — either as a listed skill or in its text.
  const known = new Set(original.skills.map((s) => s.toLowerCase()));
  const dropped: string[] = [];
  const skills = [...new Set(rw.skills.map((s) => s.trim()).filter(Boolean))].filter((s) => {
    // "Cleaning (siivous)": judge the skill itself; a bracketed translation is allowed.
    const base = s.replace(/\s*\([^)]*\)\s*/g, " ").trim().toLowerCase();
    const ok = Boolean(base) && (known.has(base) || sourceLower.includes(base));
    if (!ok) dropped.push(s);
    return ok;
  });
  cv.skills = skills.length ? skills.slice(0, 14) : original.skills;
  if (dropped.length) flags.skills = [`Removed ${dropped.length > 1 ? "skills" : "a skill"} not found in your CV: ${dropped.join(", ")}`];

  cv.highlights =
    format === "skills"
      ? rw.highlights.filter((h) => h.title.trim() && h.text.trim()).slice(0, 4).map((h) => ({ title: h.title.trim(), text: h.text.trim() }))
      : original.highlights ?? [];
  cv.highlights.forEach((h, i) => flag(`highlight:${i}`, h.text, ""));

  const template = format === "skills" ? "sidebar" : "classic";
  cv.design = {
    template,
    accent: original.design && original.design.template !== "ats" ? original.design.accent : template === "sidebar" ? "#b8458f" : "#d97706",
    showPhoto: original.design?.showPhoto ?? Boolean(original.photo),
  };
  return { cv: normalizeCV(cv), flags, note: rw.note };
}

export async function rewriteCV(jobText: string, analysis: Analysis, rawCV: CVData, profile: Profile, format: CVFormat): Promise<RewriteOutput> {
  const cv = normalizeCV(rawCV);
  const rw = engine() === "ai" ? await llmRewriteCV(jobText, analysis, cv, profile, format) : demoRewrite(jobText, analysis, cv, profile, format);
  return mergeRewrite(cv, rw, format, profile, analysis.job.title);
}

/** Deterministic trim to fit ~2 A4 pages. Only removes; never rewrites facts. */
export function condenseCV(input: CVData): { cv: CVData; changes: string[] } {
  const cv: CVData = structuredClone(input);
  const changes: string[] = [];
  const sentences = cv.summary.match(/[^.!?]+[.!?]+/g) ?? [cv.summary];
  if (sentences.length > 3) {
    cv.summary = sentences.slice(0, 3).join("").trim();
    changes.push("Summary shortened to 3 sentences");
  }
  const compact = (cv.highlights?.length ?? 0) > 0 && cv.design?.template === "sidebar";
  let removed = 0;
  cv.experience = cv.experience.map((e, i) => {
    const max = compact ? 1 : i < 2 ? 4 : i < 5 ? 2 : 0;
    if (e.bullets.length > max) removed += e.bullets.length - max;
    return { ...e, bullets: e.bullets.slice(0, max) };
  });
  if (removed) changes.push(`${removed} less important bullet points removed (older roles keep fewer)`);
  if ((cv.highlights?.length ?? 0) > 3) {
    cv.highlights = cv.highlights!.slice(0, 3);
    changes.push("Kept the 3 most relevant expertise areas");
  }
  if (cv.skills.length > 12) {
    cv.skills = cv.skills.slice(0, 12);
    changes.push("Skills limited to the 12 most relevant");
  }
  if ((cv.interests?.length ?? 0) > 4) {
    cv.interests = cv.interests!.slice(0, 4);
    changes.push("Interests limited to 4");
  }
  return { cv, changes };
}
