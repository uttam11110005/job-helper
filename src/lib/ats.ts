// Tentative ATS (applicant tracking system) score.
//
// Real ATS products (Workday, Taleo, iCIMS…) are proprietary, so no tool can
// reproduce their exact ranking. This mirrors the checks open-source ATS
// checkers use — job keywords, title match, standard sections, contact data,
// parseable layout, dates — and is shown to users as an estimate only.

import { conceptsIn } from "./ai/demo";
import type { Analysis, CVData, CVDesign } from "./types";
import { DEFAULT_DESIGN } from "./types";

export type CheckStatus = "good" | "ok" | "poor";

export interface ATSCheck {
  id: string;
  label: string;
  points: number;
  max: number;
  status: CheckStatus;
  detail: string;
  missing?: string[];
}

export interface ATSResult {
  score: number;
  band: "Strong" | "Fair" | "Needs work";
  checks: ATSCheck[];
}

function text(cv: CVData) {
  return [
    cv.name, cv.headline, cv.summary,
    ...cv.experience.flatMap((e) => [e.title, e.employer, e.location, ...e.bullets]),
    ...cv.education.flatMap((e) => [e.degree, e.institution, e.details]),
    ...cv.skills, ...cv.certificates,
    ...cv.languages.map((l) => `${l.name} ${l.level}`),
    ...(cv.highlights ?? []).flatMap((h) => [h.title, h.text]),
  ].filter(Boolean).join("\n").toLowerCase();
}

const status = (points: number, max: number): CheckStatus => (points >= max * 0.8 ? "good" : points >= max * 0.5 ? "ok" : "poor");

export function scoreATS(cv: CVData, analysis: Analysis, designOverride?: CVDesign): ATSResult {
  const body = text(cv);
  const cvConcepts = new Set(conceptsIn(body).map((c) => c.id));
  const checks: ATSCheck[] = [];

  // 1. Job keywords (40) — the biggest factor in most ATS rankings.
  const terms = [...new Set(analysis.keywords.map((k) => k.term.trim()).filter(Boolean))];
  const found: string[] = [];
  const missing: string[] = [];
  for (const term of terms) {
    const direct = body.includes(term.toLowerCase().replace(/\s*\(.*\)$/, ""));
    const concepts = conceptsIn(term);
    const viaConcept = concepts.length > 0 && concepts.some((c) => cvConcepts.has(c.id));
    (direct || viaConcept ? found : missing).push(term);
  }
  const kwPoints = terms.length ? Math.round((found.length / terms.length) * 40) : 28;
  checks.push({
    id: "keywords",
    label: "Job keywords",
    points: kwPoints,
    max: 40,
    status: status(kwPoints, 40),
    detail: terms.length ? `${found.length} of ${terms.length} keywords from the ad appear in your CV.` : "No clear keywords were extracted from this ad.",
    missing,
  });

  // 2. Job title (10)
  const title = analysis.job.title.toLowerCase();
  const titleWords = title.split(/[^a-zåäö0-9]+/).filter((w) => w.length > 3);
  const headlineAndRoles = [cv.headline, ...cv.experience.map((e) => e.title)].join(" ").toLowerCase();
  const titleConcepts = conceptsIn(title).filter((c) => !c.soft);
  const titleHit =
    titleWords.some((w) => headlineAndRoles.includes(w)) ||
    (titleConcepts.length > 0 && titleConcepts.some((c) => conceptsIn(headlineAndRoles).some((x) => x.id === c.id)));
  const titleInBody = titleWords.some((w) => body.includes(w));
  const titlePoints = titleHit ? 10 : titleInBody ? 5 : 0;
  checks.push({
    id: "title",
    label: "Job title match",
    points: titlePoints,
    max: 10,
    status: status(titlePoints, 10),
    detail: titleHit
      ? "Your headline or a job title matches the role."
      : "The role title isn't reflected in your headline or job titles — a targeted headline helps (only if it's true).",
  });

  // 3. Standard sections (15)
  const sections: [string, boolean][] = [
    ["Summary", cv.summary.trim().length > 0],
    ["Work experience", cv.experience.length > 0],
    ["Education", cv.education.length > 0],
    ["Skills", cv.skills.length > 0],
    ["Languages", cv.languages.length > 0],
  ];
  const secPoints = sections.filter(([, ok]) => ok).length * 3;
  const missingSec = sections.filter(([, ok]) => !ok).map(([n]) => n);
  checks.push({
    id: "sections",
    label: "Standard sections",
    points: secPoints,
    max: 15,
    status: status(secPoints, 15),
    detail: missingSec.length ? `Missing: ${missingSec.join(", ")}.` : "All standard sections are present.",
  });

  // 4. Contact details (10)
  const contactPoints = (cv.email ? 4 : 0) + (cv.phone ? 4 : 0) + (cv.location ? 2 : 0);
  checks.push({
    id: "contact",
    label: "Contact details",
    points: contactPoints,
    max: 10,
    status: status(contactPoints, 10),
    detail: contactPoints === 10 ? "Email, phone and location found." : `Add ${[!cv.email && "email", !cv.phone && "phone", !cv.location && "location"].filter(Boolean).join(", ")}.`,
  });

  // 5. Layout readability (15)
  const design = designOverride ?? cv.design ?? DEFAULT_DESIGN;
  const base = design.template === "ats" ? 15 : design.template === "classic" ? 11 : 9;
  const photoPenalty = design.template !== "ats" && design.showPhoto !== false ? 2 : 0;
  const layoutPoints = base - photoPenalty;
  checks.push({
    id: "layout",
    label: "Layout readability",
    points: layoutPoints,
    max: 15,
    status: status(layoutPoints, 15),
    detail:
      design.template === "ats"
        ? "Single column with standard headings — the easiest layout for ATS to read."
        : `Two-column${photoPenalty ? " layout with a photo" : " layout"}: great for people, but some ATS read columns in the wrong order. For online forms, upload the DOCX (always single-column) or switch to “ATS simple”.`,
  });

  // 6. Dates (5)
  const dated = cv.experience.filter((e) => e.start && e.end).length;
  const datePoints = cv.experience.length ? Math.round((dated / cv.experience.length) * 5) : 0;
  checks.push({
    id: "dates",
    label: "Dates on every job",
    points: datePoints,
    max: 5,
    status: status(datePoints, 5),
    detail: cv.experience.length === dated ? "Every job has start and end dates." : `${cv.experience.length - dated} job(s) missing dates.`,
  });

  // 7. Content (5)
  const withBullets = cv.experience.filter((e) => e.bullets.length > 0).length;
  const bulletPts = cv.experience.length ? Math.round((withBullets / cv.experience.length) * 3) : 0;
  const summaryPts = cv.summary.length >= 150 && cv.summary.length <= 900 ? 2 : cv.summary ? 1 : 0;
  const contentPoints = bulletPts + summaryPts;
  checks.push({
    id: "content",
    label: "Descriptions",
    points: contentPoints,
    max: 5,
    status: status(contentPoints, 5),
    detail: `${withBullets} of ${cv.experience.length} jobs describe what you did; summary is ${cv.summary.length} characters (aim for 150–900).`,
  });

  const score = Math.max(0, Math.min(100, checks.reduce((s, c) => s + c.points, 0)));
  return { score, band: score >= 80 ? "Strong" : score >= 60 ? "Fair" : "Needs work", checks };
}
