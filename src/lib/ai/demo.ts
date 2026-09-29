// Offline demo engine: deterministic, rule-based versions of every AI task.
// Quality is far below the LLM path, but it is fully grounded by construction
// (it can only quote or reorder what is already in the ad/CV).

import { CONCEPTS, FI_CITIES, LANGUAGES, VOCAB, type Concept } from "./lexicon";
import type {
  Analysis,
  ApplicationDraft,
  CVData,
  Education,
  Experience,
  FitStatus,
  InterviewCategory,
  InterviewPrep,
  LanguageRequirement,
  Profile,
  Recommendation,
  Requirement,
} from "../types";
import { emptyCV } from "../types";

// ───────────────────────── text helpers ─────────────────────────

const BULLET = /^\s*([-•*▪●◦·–]|\d+[.)])\s+/;
const YEAR = /\b(19|20)\d{2}\b/;
const CEFR = /\b([ABC][12])\b/i;

function lines(text: string) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function stripBullet(l: string) {
  return l.replace(BULLET, "").trim();
}

function words(text: string) {
  return text.toLowerCase().split(/[^a-zåäö0-9+#.-]+/i).filter(Boolean);
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function enMatches(haystack: string, term: string) {
  const t = term.toLowerCase();
  const re = t.length <= 4 ? new RegExp(`\\b${escapeRe(t)}\\b`, "i") : new RegExp(`\\b${escapeRe(t)}`, "i");
  return re.test(haystack);
}

export function fiMatches(haystack: string, stem: string) {
  const lower = haystack.toLowerCase();
  if (stem.includes(" ") || stem.includes("-")) return lower.includes(stem);
  // Hyphenated compounds ("B-ajokortti", "sairaala-") are checked part by part too.
  return words(lower).some((w) => w.startsWith(stem) || w.split("-").some((p) => p.startsWith(stem)));
}

export function conceptsIn(text: string): Concept[] {
  return CONCEPTS.filter((c) => c.fi.some((s) => fiMatches(text, s)) || c.en.some((t) => enMatches(text, t)));
}

function sentence(s: string) {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return t;
  return /[.!?]$/.test(t) ? t : t + ".";
}

// ───────────────────────── CV parsing ─────────────────────────

type Section = "summary" | "experience" | "education" | "skills" | "languages" | "certificates" | "other";

const SECTION_HEADINGS: [Section, RegExp][] = [
  ["summary", /^(summary|profile|about me|professional summary|objective|profiili|tiivistelmä|esittely)\b/i],
  ["experience", /^(work experience|experience|employment|employment history|work history|professional experience|työkokemus|työhistoria|kokemus)\b/i],
  ["education", /^(education|studies|academic|koulutus|opinnot)\b/i],
  ["skills", /^(skills|key skills|technical skills|competencies|taidot|osaaminen|vahvuudet)\b/i],
  ["languages", /^(languages?|language skills|kielitaito|kielet)\b/i],
  ["certificates", /^(certificates?|certifications?|licen[cs]es?|courses|kortit|sertifikaatit|pätevyydet)\b/i],
];

function headingOf(line: string): Section | null {
  const clean = line.replace(/[:#*_]/g, "").trim();
  if (clean.length > 40) return null;
  for (const [sec, re] of SECTION_HEADINGS) if (re.test(clean)) return sec;
  return null;
}

const DATE_RANGE =
  /((?:[A-Za-zäö]{3,9}\.?\s+)?(?:\d{1,2}[./])?(?:19|20)\d{2})\s*(?:[-–—]|to|until|→)\s*((?:[A-Za-zäö]{3,9}\.?\s+)?(?:\d{1,2}[./])?(?:19|20)\d{2}|present|current|now|nykyhetki|nyt|jatkuu)/i;

function splitHeader(text: string): { title: string; employer: string; location: string } {
  const cleaned = text.replace(DATE_RANGE, "").replace(/[()|,–—-]\s*$/, "").replace(/\(\s*\)/g, "").trim();
  const parts = cleaned
    .split(/\s+(?:at|@|–|—|-|\|)\s+|,\s+|\s+\|\s+/)
    .map((p) => p.replace(/^[\s:;,.–—|-]+|[\s:;,–—|-]+$/g, "").trim())
    .filter(Boolean);
  // A part is a location only if it is just a place name ("Tampere", "Tampere, Finland");
  // "Scandic Hotel Tampere" is an employer that happens to contain a city.
  const isPlace = (p: string) => /^(finland|suomi)$/i.test(p) || FI_CITIES.some((c) => p.toLowerCase() === c.toLowerCase());
  const rest = parts.filter((p, i) => i === 0 || !isPlace(p));
  const location = [...rest.slice(2), ...parts.slice(1).filter(isPlace)].join(", ");
  return { title: rest[0] ?? cleaned, employer: rest[1] ?? "", location };
}

function parseLanguage(raw: string) {
  const l = stripBullet(raw);
  const level =
    l.match(CEFR)?.[1]?.toUpperCase() ??
    (/(native|mother tongue|äidinkieli)/i.test(l)
      ? "Native"
      : /fluent|sujuva/i.test(l)
        ? "Fluent"
        : /good|hyvä/i.test(l)
          ? "Good"
          : /basic|beginner|perus|alkeet/i.test(l)
            ? "Basic"
            : "");
  const name = l.split(/[:(–—-]|\s{2,}/)[0].trim();
  return { name: name || l, level };
}

export function demoParseCV(text: string): CVData {
  const cv = emptyCV();
  const ls = lines(text);
  cv.email = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  cv.phone = text.match(/(\+?\d[\d\s-]{7,}\d)/)?.[0]?.trim() ?? "";
  cv.location = FI_CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(ls.slice(0, 6).join(" "))) ?? "";

  let section: Section = "other";
  const summary: string[] = [];
  let current: Experience | null = null;
  let pendingTitle = "";
  let eduCurrent: Education | null = null;
  let headerDone = false;

  ls.forEach((line, idx) => {
    const h = headingOf(line);
    if (h) {
      section = h;
      headerDone = true;
      return;
    }
    if (!headerDone) {
      if (idx === 0) cv.name = line;
      else if (idx === 1 && !line.includes("@") && !/\d{5,}/.test(line)) cv.headline = line;
      else if (!line.includes("@") && !/\+?\d[\d\s-]{7,}/.test(line) && line.length > 60) summary.push(line);
      return;
    }
    switch (section) {
      case "summary":
        summary.push(line);
        break;
      case "experience": {
        const isBullet = BULLET.test(line);
        if (!isBullet && DATE_RANGE.test(line)) {
          const m = line.match(DATE_RANGE)!;
          const header = splitHeader(pendingTitle ? `${pendingTitle}, ${line}` : line);
          current = {
            id: `e${cv.experience.length + 1}`,
            title: header.title,
            employer: header.employer,
            location: header.location,
            start: m[1],
            end: /present|current|now|nyky|nyt|jatkuu/i.test(m[2]) ? "Present" : m[2],
            bullets: [],
          };
          cv.experience.push(current);
          pendingTitle = "";
        } else if (!isBullet && (!current || current.bullets.length > 0) && line.length < 70 && !/[.!]$/.test(line)) {
          // Probable title line for the next entry (dates on the following line).
          if (pendingTitle && !current) {
            current = { id: `e${cv.experience.length + 1}`, ...splitHeader(pendingTitle), start: "", end: "", bullets: [] };
            cv.experience.push(current);
          }
          pendingTitle = line;
        } else if (current) {
          if (pendingTitle) {
            current.bullets.push(stripBullet(pendingTitle));
            pendingTitle = "";
          }
          current.bullets.push(stripBullet(line));
        } else {
          pendingTitle = line;
        }
        break;
      }
      case "education": {
        if (!BULLET.test(line) && (YEAR.test(line) || !eduCurrent)) {
          const m = line.match(DATE_RANGE);
          const single = !m ? line.match(YEAR)?.[0] ?? "" : "";
          const header = splitHeader(line.replace(single, ""));
          eduCurrent = {
            id: `ed${cv.education.length + 1}`,
            degree: header.title,
            institution: header.employer,
            start: m?.[1] ?? "",
            end: m?.[2] ?? single,
            details: "",
          };
          cv.education.push(eduCurrent);
        } else if (eduCurrent) {
          eduCurrent.details = [eduCurrent.details, stripBullet(line)].filter(Boolean).join(" ");
        }
        break;
      }
      case "skills":
        cv.skills.push(
          ...stripBullet(line)
            .split(/[,;•|]/)
            .map((x) => x.trim())
            .filter((x) => x && x.length < 60),
        );
        break;
      case "languages":
        stripBullet(line)
          .split(/[,;]/)
          .map((x) => x.trim())
          .filter(Boolean)
          .forEach((x) => cv.languages.push(parseLanguage(x)));
        break;
      case "certificates":
        cv.certificates.push(stripBullet(line));
        break;
      default:
        break;
    }
  });

  if (pendingTitle && (section as Section) === "experience" && !cv.experience.some((e) => e.bullets.includes(pendingTitle))) {
    cv.experience.push({ id: `e${cv.experience.length + 1}`, ...splitHeader(pendingTitle), start: "", end: "", bullets: [] });
  }
  cv.summary = summary.join(" ");
  cv.skills = [...new Set(cv.skills)];
  return cv;
}

// ───────────────────────── job analysis ─────────────────────────

/** "Haemme laitoshuoltajaa joukkoomme – Firma Oy, Tampere" → "Laitoshuoltaja". */
function cleanTitle(line: string) {
  let t = line
    .replace(/^(haemme|etsimme|we are looking for|we're hiring|hiring)\s*:?\s*/i, "")
    .replace(/^(an?|the)\s+/i, "")
    .split(/\s+[–—|-]\s+|,\s+|\s+\(/)[0]
    .replace(/\s+(joukkoomme|tiimiimme|meille|to join.*|for our team)$/i, "")
    .replace(/[.!:]$/, "")
    .trim();
  // Finnish partitive after "Haemme": laitoshuoltajaa → laitoshuoltaja, myyjää → myyjä, kokkia → kokki.
  const hadVerb = /^(haemme|etsimme)/i.test(line.trim());
  if (hadVerb) {
    t = t
      .split(" ")
      .map((w, i, arr) => (i === arr.length - 1 ? w.replace(/(aa|ää)$/i, (m) => m[0]).replace(/(i)(a|ä)$/i, "$1") : w))
      .join(" ");
  }
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 90);
}

type AdSection = "intro" | "duties" | "mandatory" | "preferred" | "offer" | "apply";

const AD_HEADINGS: [AdSection, RegExp][] = [
  ["duties", /(tehtäv|työnkuva|vastuualue|työtehtäv|responsibilit|your role|duties|what you.ll do|job description)/i],
  ["preferred", /(eduksi|toivomme|arvostamme|plussaa|nice to have|advantage|preferred|bonus)/i],
  ["mandatory", /(edellytämme|vaadimme|odotamme|edellytyk|vaatimukse|sinulla on|haemme henkilöä|requirements|we expect|you have|qualifications|must have)/i],
  ["offer", /(tarjoamme|we offer|benefits|edut|meillä saat)/i],
  ["apply", /(hae|hakemus|haku|apply|application|lisätiedot|yhteystiedot|contact)/i],
];

function adHeading(line: string): AdSection | null {
  const clean = line.replace(/[:#*_]/g, "").trim();
  if (clean.length > 70 || BULLET.test(line)) return null;
  if (!/:$/.test(line.trim()) && clean.split(/\s+/).length > 6) return null;
  for (const [sec, re] of AD_HEADINGS) if (re.test(clean)) return sec;
  return null;
}

const REQ_CUE =
  /(kokemus|osaa|taito|tutkin|kortti|passi|ajokort|kielitai|suome|ruotsi|englan|edellyt|vaadi|eduksi|valmius|kyky|experience|skill|degree|licen|certif|fluent|knowledge|ability|required)/i;

function cvCorpus(cv: CVData, profile: Profile) {
  const exp = [...cv.experience, ...profile.experience];
  const parts: { text: string; where: string }[] = [
    ...exp.map((e) => ({ text: `${e.title} ${e.employer}`, where: `${e.title}${e.employer ? ` at ${e.employer}` : ""}` })),
    ...exp.flatMap((e) => e.bullets.map((b) => ({ text: b, where: b }))),
    ...[...cv.skills, ...profile.skills].map((s) => ({ text: s, where: `Skill: ${s}` })),
    ...[...cv.certificates, ...profile.certificates].map((s) => ({ text: s, where: `Certificate: ${s}` })),
    ...[...cv.education, ...profile.education].map((e) => ({
      text: `${e.degree} ${e.institution} ${e.details}`,
      where: `${e.degree}${e.institution ? `, ${e.institution}` : ""}`,
    })),
    { text: cv.summary, where: "Summary" },
    { text: `${cv.headline} ${profile.headline}`, where: "Headline" },
  ];
  return parts.filter((p) => p.text.trim());
}

function findEvidence(c: Concept, corpus: { text: string; where: string }[]) {
  return corpus.find((p) => c.fi.some((s) => fiMatches(p.text, s)) || c.en.some((t) => enMatches(p.text, t)));
}

const LEVEL_RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, NATIVE: 7 };

function levelRank(level: string): number {
  const up = level.toUpperCase();
  const cefr = up.match(/[ABC][12]/)?.[0];
  if (cefr) return LEVEL_RANK[cefr];
  if (/NATIVE|ÄIDINK|MOTHER/.test(up)) return 7;
  if (/FLUENT|SUJUV|EXCELLENT|ERINOMAI/.test(up)) return 5;
  if (/GOOD|HYVÄ/.test(up)) return 4;
  if (/SATISF|TYYDYTT|INTERMED/.test(up)) return 3;
  if (/BASIC|PERUS|ALKEE|BEGIN/.test(up)) return 2;
  return 0;
}

function requiredLevelFrom(line: string): string {
  const cefr = line.match(CEFR)?.[1];
  if (cefr) return cefr.toUpperCase();
  if (/^working language|^työkieli/i.test(line)) return "Working proficiency (≈B1 or better)";
  if (/äidinkiel|native/i.test(line)) return "Native-level (C2)";
  if (/erinomai|excellent/i.test(line)) return "Excellent (C1+)";
  if (/sujuv|fluent/i.test(line)) return "Fluent (≈B2–C1)";
  if (/hyvä|good/i.test(line)) return "Good (≈B1–B2)";
  if (/tyydyttäv|kohtalai|satisf/i.test(line)) return "Satisfactory (≈A2–B1)";
  if (/perus|basic|alkeet/i.test(line)) return "Basic (≈A2)";
  return "Not specified";
}

export function demoAnalyze(jobText: string, cv: CVData, profile: Profile): Analysis {
  const ls = lines(jobText);
  const corpus = cvCorpus(cv, profile);
  const applicantLangs = [...cv.languages, ...profile.languages];

  // Title / employer / location
  const titleLine =
    ls.find((l) => /^(haemme|etsimme|we are looking for|we're hiring|hiring)/i.test(l)) ?? ls[0] ?? "";
  const title = cleanTitle(titleLine);
  // Job-portal ads (e.g. Job Market Finland / Työmarkkinatori) use "Label ↵ value" fields.
  const field = (label: RegExp) => {
    const i = ls.findIndex((l) => label.test(l));
    return i >= 0 ? (ls[i + 1] ?? "") : "";
  };
  const employer =
    field(/^(company name|yrityksen nimi|työnantaja|employer)$/i) ||
    (jobText.match(/([A-ZÅÄÖ][\wÅÄÖåäö&.-]*(?:\s+[A-ZÅÄÖ][\wÅÄÖåäö&.-]*){0,3}\s+(?:Oyj|Oy|Ab|Ltd|Inc|ry|kuntayhtymä))\b/)?.[1] ??
      "");
  const location = FI_CITIES.find((c) => new RegExp(`\\b${c}`, "i").test(jobText)) ?? "";
  const employment = [
    /vakituin|toistaiseksi|permanent/i.test(jobText) && "Permanent",
    /määräaikai|fixed[- ]term|temporary/i.test(jobText) && "Fixed-term",
    /osa-aikai|part[- ]time/i.test(jobText) && "Part-time",
    /kokoaikai|full[- ]time/i.test(jobText) && "Full-time",
    /vuokraty|henkilöstöpalvel/i.test(jobText) && "Agency work",
  ]
    .filter(Boolean)
    .join(", ");
  const deadline = jobText.match(/(?:viimeistään|mennessä|deadline|haku päättyy|by)\s*:?\s*(\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)/i)?.[1] ?? "";

  // Section walk
  let sec: AdSection = "intro";
  const duties: string[] = [];
  const reqLines: { text: string; category: Requirement["category"] }[] = [];
  const langLines: string[] = [];
  const langSection = new Map<string, AdSection>();
  {
    const i = ls.findIndex((l) => /^(working languages?|työkiel(i|et)|kielitaitovaatimukset)$/i.test(l));
    for (let k = i + 1; i >= 0 && k < ls.length; k++) {
      const spec = LANGUAGES.find((s) => new RegExp(`^(${s.name}|${s.fi.join("|")})$`, "i").test(ls[k]));
      if (!spec) break;
      const synthetic = `Working language: ${spec.name}`;
      langLines.push(synthetic);
      langSection.set(synthetic, "mandatory");
    }
  }
  const sentencesOf = (t: string) => (t.length > 220 ? (t.match(/[^.!?]+[.!?]+/g) ?? [t]).map((x) => x.trim()) : [t]);
  for (const line of ls) {
    const h = adHeading(line) ?? (/^(we offer|tarjoamme|meillä saat|apply|hae |haku päättyy|lisätietoja)/i.test(line) ? ("offer" as AdSection) : null);
    if (h) {
      sec = h;
      // Heading lines like "Edellytämme: B-ajokortti" carry content too.
      const after = line.split(":").slice(1).join(":").trim();
      if (after && (h === "mandatory" || h === "preferred")) reqLines.push({ text: after, category: h });
      continue;
    }
    const text = stripBullet(line);
    const isLang = LANGUAGES.some((l) => l.fi.some((s) => fiMatches(text, s)) || l.en.some((t) => enMatches(text, t))) && /(kiel|taito|osaa|puhu|language|skill|fluent|sujuv|hyvä|[ABC][12])/i.test(text);
    if (isLang) {
      langLines.push(text);
      langSection.set(text, sec);
    }
    if (sec === "duties") duties.push(...sentencesOf(text));
    else if (sec === "mandatory" || sec === "preferred") reqLines.push({ text, category: sec });
    else if (sec !== "offer" && sec !== "apply" && REQ_CUE.test(text) && text.length < 220) {
      const cat: Requirement["category"] = /eduksi|toivomme|arvostamme|advantage|plus/i.test(text)
        ? "preferred"
        : /edellyt|vaadi|required|must/i.test(text)
          ? "mandatory"
          : "unspecified";
      reqLines.push({ text, category: cat });
    }
  }

  // No explicit requirement list (common in portal ads written as one paragraph):
  // infer requirements from the skills the duties clearly need.
  const implied = new Set<string>();
  if (!reqLines.some((r) => conceptsIn(r.text).some((c) => !c.soft))) {
    const used = new Set<string>();
    // Sentences addressed to the applicant ("Your main task is…") describe the work best.
    const task = (d: string) => (/\b(you|your|sinä|sinun|tehtäv)/i.test(d) ? 0 : 1);
    for (const d of [...duties].sort((a, b) => task(a) - task(b))) {
      const cs = conceptsIn(d).filter((c) => !c.soft && !used.has(c.id));
      if (!cs.length) continue;
      cs.forEach((c) => used.add(c.id));
      const text = d.length > 160 ? `${d.slice(0, 157)}…` : d;
      reqLines.push({ text, category: "unspecified" });
      implied.add(text);
    }
  }

  // Requirements + fit
  const requirements: Requirement[] = [];
  const seen = new Set<string>();
  reqLines.forEach(({ text, category }) => {
    if (seen.has(text) || text.length < 4) return;
    seen.add(text);
    const concepts = conceptsIn(text);
    const langOnly = langLines.includes(text) && concepts.length === 0;
    if (langOnly) return; // handled in the language panel
    const hard = concepts.filter((c) => !c.soft);
    let status: FitStatus = "unknown";
    let evidence = "";
    let explanation = "";
    if (hard.length === 0) {
      explanation = concepts.length
        ? "This is a personal trait or working condition — a CV cannot prove it; show it in your application and interview."
        : "The demo engine could not classify this requirement. Review it yourself (AI mode gives a full assessment).";
    } else {
      const degree = hard.find((c) => c.kind === "education");
      const domain = hard.filter((c) => c.kind !== "education");
      let found = hard.map((c) => ({ c, ev: findEvidence(c, corpus) }));
      if (degree && domain.length) {
        // A field-specific qualification ("puhtausalan perustutkinto") needs an
        // education entry in that field — work experience in the field isn't a degree.
        const eduCorpus = corpus.filter((p) => [...cv.education, ...profile.education].some((e) => p.text.includes(e.degree)));
        const inField = domain.every((c) => findEvidence(c, eduCorpus));
        const anyDegree = eduCorpus[0];
        const expEv = domain.map((c) => findEvidence(c, corpus)).find(Boolean);
        found = [{ c: degree, ev: inField ? eduCorpus.find((p) => domain.some((c) => findEvidence(c, [p]))) : undefined }];
        if (!inField && (anyDegree || expEv)) {
          requirements.push({
            id: `r${requirements.length + 1}`,
            text_original: text,
            text_en: `About: ${concepts.map((c) => c.label).join("; ")}`,
            category,
            kind: "education",
            status: "partial",
            evidence: expEv?.where ?? anyDegree!.where,
            explanation: expEv
              ? "You have related work experience, but no qualification in this field is listed in your CV."
              : "You have a qualification, but not in this field.",
          });
          return;
        }
      }
      const hits = found.filter((f) => f.ev);
      if (hits.length === found.length) {
        status = "match";
        evidence = hits[0].ev!.where;
        explanation = `Your CV shows ${hits.map((h) => h.c.label.toLowerCase()).join(", ")}.`;
      } else if (hits.length > 0) {
        status = "partial";
        evidence = hits[0].ev!.where;
        explanation = `Related evidence for ${hits.map((h) => h.c.label.toLowerCase()).join(", ")}, but nothing for ${found
          .filter((f) => !f.ev)
          .map((f) => f.c.label.toLowerCase())
          .join(", ")}.`;
      } else {
        status = "missing";
        explanation = `No evidence of ${found.map((f) => f.c.label.toLowerCase()).join(", ")} in your CV or profile.`;
      }
      // "Experience of X" where the CV only lists X as a skill → partial.
      if (status === "match" && /kokemus|experience/i.test(text) && hits.every((h) => h.ev!.where.startsWith("Skill:"))) {
        status = "partial";
        explanation = "You list this as a skill, but the ad asks for work experience — no matching job entry was found.";
      }
    }
    if (implied.has(text)) explanation = `Implied by the duties (the ad lists no explicit requirements). ${explanation}`;
    const kind: Requirement["kind"] = hard[0]?.kind ?? (concepts[0]?.kind as Requirement["kind"]) ?? "other";
    requirements.push({
      id: `r${requirements.length + 1}`,
      text_original: text,
      text_en: concepts.length ? `About: ${concepts.map((c) => c.label).join("; ")}` : "(Offline demo: translation not available — see Vocabulary)",
      category,
      kind,
      status,
      evidence,
      explanation,
    });
  });

  // Languages
  const languages: LanguageRequirement[] = [];
  for (const spec of LANGUAGES) {
    const line = langLines.find((l) => spec.fi.some((s) => fiMatches(l, s)) || spec.en.some((t) => enMatches(l, t)));
    if (!line) continue;
    const required = requiredLevelFrom(line);
    const mine = applicantLangs.find((l) => l.name.toLowerCase().startsWith(spec.name.toLowerCase().slice(0, 4)) || spec.fi.some((s) => l.name.toLowerCase().startsWith(s.slice(0, 4))));
    const reqRank = levelRank(required);
    const myRank = mine ? levelRank(mine.level) : 0;
    let status: FitStatus = "unknown";
    if (!mine) status = "missing";
    else if (!reqRank || !myRank) status = "unknown";
    else if (myRank >= reqRank) status = "match";
    else if (myRank === reqRank - 1) status = "partial";
    else status = "missing";
    languages.push({
      language: spec.name,
      required_level: required,
      mandatory: langSection.get(line) !== "preferred" && !/eduksi|toivomme|arvostamme|advantage|plus|nice to have/i.test(line),
      applicant_level: mine ? mine.level || "Level not stated" : "Not stated",
      status,
      note: line,
    });
  }

  // Vocabulary
  const lower = jobText.toLowerCase();
  const tokens = new Set(words(lower));
  const vocabulary = Object.entries(VOCAB)
    .filter(([fi]) => (fi.includes(" ") ? lower.includes(fi) : fi.length >= 5 ? [...tokens].some((t) => t.startsWith(fi)) : tokens.has(fi)))
    .map(([fi, [en, note]]) => {
      const surface = fi.includes(" ") ? fi : [...tokens].find((t) => t.startsWith(fi)) ?? fi;
      return { fi: surface, en, note };
    })
    .filter((v, i, arr) => arr.findIndex((x) => x.fi === v.fi) === i)
    .slice(0, 20);

  // Strengths, gaps, keywords
  const adConcepts = conceptsIn(jobText);
  const strengths = requirements
    .filter((r) => r.status === "match")
    .map((r) => ({ title: r.text_en.replace(/^About: /, ""), evidence: r.evidence }));
  languages.filter((l) => l.status === "match").forEach((l) => strengths.push({ title: `${l.language} language`, evidence: `Your level: ${l.applicant_level}` }));

  const gaps = [
    ...requirements
      .filter((r) => r.status === "missing")
      .map((r) => {
        const c = conceptsIn(r.text_original).find((x) => !x.soft);
        return {
          title: c?.label ?? r.text_original,
          detail: `${r.category === "preferred" ? "Preferred" : "Required"}: "${r.text_original}"`,
          advice: c?.advice ?? "If you have related experience not in your CV, add it truthfully. Otherwise, address this honestly in your application.",
        };
      }),
    ...languages
      .filter((l) => l.status === "missing" || l.status === "partial")
      .map((l) => ({
        title: `${l.language} level`,
        detail: `Ad asks for ${l.required_level}; you stated ${l.applicant_level}.`,
        advice: l.language === "Finnish" ? "Mention your current Finnish studies (course, level, YKI test date) if you have them." : "State your actual level clearly in the CV languages section.",
      })),
  ];

  const keywords = adConcepts
    .filter((c) => !c.soft)
    .map((c) => {
      const ev = findEvidence(c, corpus);
      return { term: c.label, supported: Boolean(ev), evidence: ev?.where ?? "" };
    });

  // Recommendations (grounded: compose only from the CV's own words; reorder or annotate)
  const recommendations: Recommendation[] = [];
  // Concepts the ad asks for AND the CV evidences. Generic "degree" is excluded:
  // having *a* degree is not evidence of a field-specific one.
  const supported = adConcepts.filter((c) => !c.soft && c.id !== "degree" && findEvidence(c, corpus));
  const expHits = (e: Experience) =>
    supported.filter((c) => [e.title, ...e.bullets].some((s) => c.fi.some((f) => fiMatches(s, f)) || c.en.some((x) => enMatches(s, x)))).length;
  const relevantExp = cv.experience.filter((e) => expHits(e) > 0).sort((a, b) => expHits(b) - expHits(a));

  if (cv.experience.length || cv.summary) {
    const expPart = relevantExp.length
      ? `Experience as ${relevantExp.slice(0, 2).map((e) => `${e.title}${e.employer ? ` (${e.employer})` : ""}`).join(" and ")}.`
      : "";
    const langPart = applicantLangs.length ? `Languages: ${applicantLangs.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", ")}.` : "";
    const suggested = [expPart, cv.summary.trim(), langPart].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    if (suggested && suggested !== cv.summary.trim() && (expPart || langPart)) {
      recommendations.push({
        id: "rec1",
        section: "summary",
        experience_id: "",
        bullet_index: -1,
        original: cv.summary,
        suggested,
        reason: "Lead with your most relevant roles and your languages — the first lines recruiters read. Built only from your CV.",
        evidence: relevantExp.map((e) => e.title).join(", ") || "Your languages section",
      });
    }
  }

  // Headline: most relevant real title + the CV's own skills that this job asks for.
  {
    const lead = relevantExp[0] ?? cv.experience[0];
    const skillMatch = (s: string) => supported.some((c) => c.fi.some((f) => fiMatches(s, f)) || c.en.some((x) => enMatches(s, x)));
    const focus = cv.skills.filter(skillMatch).slice(0, 3);
    const parts = [lead?.title, focus.join(", ")].filter(Boolean);
    const headline = parts.join(" | ");
    if (headline && headline.toLowerCase() !== cv.headline.trim().toLowerCase()) {
      recommendations.push({
        id: `rec${recommendations.length + 1}`,
        section: "headline",
        experience_id: "",
        bullet_index: -1,
        original: cv.headline,
        suggested: headline,
        reason: `A headline aimed at this ${title || "role"}: your most relevant real job title${focus.length ? " plus the skills from your CV that the ad asks for" : ""}.`,
        evidence: [lead ? `${lead.title}${lead.employer ? ` at ${lead.employer}` : ""}` : "", focus.length ? `Skills: ${focus.join(", ")}` : ""].filter(Boolean).join(" · "),
      });
    }
  }

  if (cv.skills.length > 1 && supported.length) {
    const score = (s: string) => (supported.some((c) => c.fi.some((f) => fiMatches(s, f)) || c.en.some((x) => enMatches(s, x))) ? 1 : 0);
    const ordered = [...cv.skills].sort((a, b) => score(b) - score(a));
    if (ordered.join("|") !== cv.skills.join("|")) {
      recommendations.push({
        id: `rec${recommendations.length + 1}`,
        section: "skills",
        experience_id: "",
        bullet_index: -1,
        original: cv.skills.join(", "),
        suggested: ordered.join(", "),
        reason: "Put the skills this job asks for first — recruiters scan the top of the list.",
        evidence: "Reordering only; no skills added.",
      });
    }
  }

  // Annotate one matching bullet per role with the ad's own Finnish term (truthful, ATS-friendly).
  const adWords = words(lower);
  for (const exp of relevantExp) {
    if (recommendations.filter((r) => r.section === "bullet").length >= 3) break;
    for (const c of supported) {
      const i = exp.bullets.findIndex((b) => c.en.some((x) => enMatches(b, x)) || c.fi.some((s) => fiMatches(b, s)));
      if (i < 0) continue;
      // Prefer the shortest ad word for the concept's main stem (closest to base form).
      const candidates = adWords.filter((w) => w.startsWith(c.fi[0])).sort((a, b) => a.length - b.length);
      const adWord = candidates[0];
      const b = exp.bullets[i];
      if (!adWord || b.toLowerCase().includes(adWord)) continue;
      recommendations.push({
        id: `rec${recommendations.length + 1}`,
        section: "bullet",
        experience_id: exp.id,
        bullet_index: i,
        original: b,
        suggested: `${b.replace(/[.]$/, "")} (${adWord})`,
        reason: `The ad uses the Finnish word "${adWord}". Adding it next to your real experience helps Finnish recruiters and applicant-tracking systems connect the two.`,
        evidence: b,
      });
      break;
    }
  }

  // Expertise areas (career-change CV): group the CV's own bullets by theme,
  // job-relevant themes first. Text is assembled only from existing bullets and roles.
  {
    const themes = [...supported, ...CONCEPTS.filter((c) => !c.soft && !supported.includes(c))];
    const used = new Set<string>();
    let added = 0;
    for (const c of themes) {
      if (added >= 3) break;
      const hits = cv.experience.flatMap((e) =>
        e.bullets
          .filter((b) => !used.has(b) && (c.en.some((x) => enMatches(b, x)) || c.fi.some((s) => fiMatches(b, s))))
          .map((b) => ({ e, b })),
      );
      if (!hits.length) continue;
      hits.forEach((h) => used.add(h.b));
      const roles = [...new Set(hits.map((h) => `${h.e.title}${h.e.employer ? ` at ${h.e.employer}` : ""}`))];
      const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
      const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
      // One sentence per role so it stays clear which job each fact comes from.
      const byRole = new Map<Experience, string[]>();
      hits.forEach((h) => byRole.set(h.e, [...(byRole.get(h.e) ?? []), h.b]));
      const text = [...byRole.entries()]
        .slice(0, 3)
        .map(([e, bs]) => `As ${e.title}${e.employer ? ` at ${e.employer}` : ""}, I ${list(bs.slice(0, 2).map((b) => lower1(b.replace(/[.]$/, ""))))}.`)
        .join(" ");
      const titleText = c.label.replace(/\s*\(.*\)$/, "").split(" / ")[0];
      recommendations.push({
        id: `rec${recommendations.length + 1}`,
        section: "highlight",
        title: titleText,
        experience_id: "",
        bullet_index: -1,
        original: "",
        suggested: text,
        reason: supported.includes(c)
          ? `Groups your experience in ${titleText.toLowerCase()} — something this job asks for — into one strong paragraph.`
          : `Shows transferable experience in ${titleText.toLowerCase()} as its own area.`,
        evidence: roles.join("; "),
      });
      added++;
    }
  }

  // CV type: experience-led when a real job already matches the role; otherwise lead with expertise areas.
  const hardMatches = requirements.filter((r) => r.status === "match" && r.kind !== "other" && r.evidence && !r.evidence.startsWith("Skill:")).length;
  const cv_strategy: Analysis["cv_strategy"] =
    relevantExp.length > 0 && hardMatches > 0
      ? { recommended: "experience", reason: `Your work as ${relevantExp[0].title} is directly relevant to this ${title || "role"}, so an experience-focused CV shows it best.` }
      : { recommended: "skills", reason: "Your past jobs are not a direct match for this role, so a skills-focused CV that leads with your transferable expertise will work better — a common choice when changing career." };

  const structure_advice = [
    relevantExp.length ? `Put the most detail under ${relevantExp[0].title}${relevantExp[0].employer ? ` at ${relevantExp[0].employer}` : ""} — it is your most relevant role for this job.` : "None of your roles clearly matches this job; lead with transferable skills in your summary.",
    languages.length ? "Keep a clear Languages section near the top — the ad explicitly mentions language skills." : "Keep the Languages section; Finnish employers always check it.",
    cv.certificates.length ? "List cards and certificates (kortit) in their own section so they are easy to spot." : "If you hold any Finnish work cards (e.g. työturvallisuuskortti, hygieniapassi), add a Certificates section.",
  ];

  const uncertainty = [
    "Offline demo engine: requirement translations and fit checks are keyword-based. Add an OpenAI API key for full AI analysis.",
    ...(title ? [] : ["Job title could not be detected."]),
    ...(implied.size ? ["The ad lists no explicit requirements, so they were inferred from the duties."] : []),
    ...(requirements.length === 0 ? ["No explicit requirements were detected in the ad."] : []),
  ];

  const summary = [
    title ? `This ad is for a ${title} position${employer ? ` at ${employer}` : ""}${location ? ` in ${location}` : ""}.` : "This is a job advertisement.",
    duties.length ? `Main duties: ${duties.slice(0, 3).map((d) => d.replace(/[.]$/, "")).join("; ")}.` : "",
    adConcepts.length ? `The work involves ${adConcepts.filter((c) => !c.soft).slice(0, 4).map((c) => c.label.toLowerCase()).join(", ") || "general duties"}.` : "",
    employment ? `Contract: ${employment}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    job: { title, employer, location, employment_type: employment, deadline },
    summary,
    responsibilities: duties.slice(0, 12),
    requirements,
    languages,
    vocabulary,
    strengths,
    gaps,
    keywords,
    structure_advice,
    recommendations,
    uncertainty,
    cv_strategy,
  };
}

// ───────────────────────── application & interview ─────────────────────────

const LANG_FI: Record<string, string> = { Finnish: "suomi", English: "englanti", Swedish: "ruotsi", Russian: "venäjä", Estonian: "viro", Bengali: "bengali", Arabic: "arabia", Hindi: "hindi", Spanish: "espanja", French: "ranska", German: "saksa" };

const LEVEL_FI: Record<string, string> = { Native: "äidinkieli", Fluent: "sujuva", Good: "hyvä", Basic: "perustaso" };

function period(e: Experience, fi: boolean) {
  const end = /present/i.test(e.end) ? (fi ? "nykyhetki" : "present") : e.end;
  return [e.start, end].filter(Boolean).join("–");
}

export function demoApplication(analysis: Analysis, cv: CVData): ApplicationDraft {
  const role = analysis.job.title || "[tehtävä]";
  const employer = analysis.job.employer;
  const exp = cv.experience.slice(0, 3);
  const langsFi = cv.languages.map((l) => `${LANG_FI[l.name] ?? l.name}${l.level ? ` (${LEVEL_FI[l.level] ?? l.level})` : ""}`).join(", ");
  const langsEn = cv.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", ");
  // Only requirements with direct CV evidence are claimed — quoted in the ad's own Finnish.
  const matched = analysis.requirements.filter((r) => r.status === "match" && r.kind !== "other").slice(0, 3);
  const name = cv.name || "[nimesi]";
  const certs = cv.certificates.slice(0, 3);

  const fi = [
    "Hei,",
    "",
    `haen avoinna olevaa tehtävää ${role}${employer ? ` (${employer})` : ""}. Tehtävä kiinnostaa minua, koska se vastaa työkokemustani.`,
    "",
    exp.length ? `Työkokemukseni:
${exp.map((e) => `• ${e.title}${e.employer ? `, ${e.employer}` : ""}${period(e, true) ? ` (${period(e, true)})` : ""}`).join("\n")}` : "[Kerro tähän lyhyesti tärkein kokemuksesi.]",
    "",
    matched.length ? `Ilmoituksen vaatimuksista minulla on: ${matched.map((r) => r.text_original.replace(/[.]$/, "").toLowerCase()).join("; ")}.` : "",
    certs.length ? `Minulla on seuraavat kortit ja todistukset: ${certs.join(", ")}.` : "",
    langsFi ? `Kielitaitoni: ${langsFi}.` : "",
    "",
    "Kerron mielelläni lisää itsestäni haastattelussa. Kiitos, että luitte hakemukseni.",
    "",
    "Ystävällisin terveisin",
    name,
    [cv.phone, cv.email].filter(Boolean).join(" · "),
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  const en = [
    "Hello,",
    "",
    `I am applying for the open ${role} position${employer ? ` (${employer})` : ""}. The role interests me because it matches my work experience.`,
    "",
    exp.length ? `My work experience:\n${exp.map((e) => `• ${e.title}${e.employer ? `, ${e.employer}` : ""}${period(e, false) ? ` (${period(e, false)})` : ""}`).join("\n")}` : "[Briefly describe your most important experience here.]",
    "",
    matched.length ? `Of the ad's requirements, I have: ${matched.map((r) => `${r.text_original.replace(/[.]$/, "").toLowerCase()} (${r.text_en.replace(/^About: /, "").toLowerCase()})`).join("; ")}.` : "",
    certs.length ? `I have the following cards and certificates: ${certs.join(", ")}.` : "",
    langsEn ? `My language skills: ${langsEn}.` : "",
    "",
    "I would be happy to tell you more about myself in an interview. Thank you for reading my application.",
    "",
    "Kind regards",
    name,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  return {
    message_fi: fi,
    message_en: en,
    form_answers: [
      {
        question: "Miksi haet tätä paikkaa? (Why are you applying?)",
        answer_fi: `Tehtävä vastaa kokemustani${exp[0] ? ` tehtävästä ${exp[0].title}` : ""}, ja haluan käyttää osaamistani tässä työssä.`,
        answer_en: `The role matches my experience${exp[0] ? ` as ${exp[0].title}` : ""}, and I want to use my skills in this job.`,
      },
      {
        question: "Kerro itsestäsi lyhyesti. (Tell us briefly about yourself.)",
        answer_fi: [exp[0] ? `Olen työskennellyt tehtävässä ${exp[0].title}${exp[0].employer ? ` (${exp[0].employer})` : ""}.` : "", langsFi ? `Kielitaitoni: ${langsFi}.` : ""].filter(Boolean).join(" ") || "[Kerro itsestäsi]",
        answer_en: [exp[0] ? `I have worked as ${exp[0].title}${exp[0].employer ? ` (${exp[0].employer})` : ""}.` : "", langsEn ? `Languages: ${langsEn}.` : ""].filter(Boolean).join(" ") || "[About you]",
      },
      {
        question: "Milloin voit aloittaa? (When can you start?)",
        answer_fi: "Voin aloittaa [aloituspäivä].",
        answer_en: "I can start on [start date].",
      },
    ],
  };
}

export function demoInterview(analysis: Analysis, cv: CVData): InterviewPrep {
  const concepts = CONCEPTS.filter((c) => c.question && analysis.requirements.some((r) => conceptsIn(r.text_original).includes(c)));
  const exp = cv.experience[0];
  const role = analysis.job.title || "";
  const finnish = cv.languages.find((l) => /finn|suomi/i.test(l.name));
  const langsFi = cv.languages.map((l) => `${LANG_FI[l.name] ?? l.name}${l.level ? ` (${LEVEL_FI[l.level] ?? l.level})` : ""}`).join(", ");
  const langsEn = cv.languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join(", ");

  const qs: InterviewPrep["questions"] = [
    {
      question_fi: "Kerro itsestäsi ja työkokemuksestasi.",
      question_en: "Tell us about yourself and your work experience.",
      category: "experience",
      why: "Almost every Finnish interview starts with this.",
      answer_hint: exp ? `Keep it to 1–2 minutes: current situation → ${exp.title}${exp.employer ? ` at ${exp.employer}` : ""} → why this job.` : "Summarise your background in 1–2 minutes and link it to this job.",
      sample_answer_fi: exp
        ? `Nimeni on ${cv.name || "[nimi]"}. Olen työskennellyt tehtävässä ${exp.title}${exp.employer ? ` (${exp.employer})` : ""}. ${langsFi ? `Puhun näitä kieliä: ${langsFi}.` : ""}`.trim()
        : `Nimeni on ${cv.name || "[nimi]"}. [Kerro kokemuksestasi.]`,
      sample_answer_en: exp
        ? `My name is ${cv.name || "[name]"}. I have worked as ${exp.title}${exp.employer ? ` (${exp.employer})` : ""}. ${langsEn ? `I speak: ${langsEn}.` : ""}`.trim()
        : `My name is ${cv.name || "[name]"}. [Describe your experience.]`,
      evidence: exp ? `${exp.title}${exp.employer ? `, ${exp.employer}` : ""}` : "",
    },
    {
      question_fi: `Miksi haet juuri tätä ${role ? `${role.toLowerCase()} -` : ""}paikkaa?`,
      question_en: `Why are you applying for this ${role} job?`.replace(/\s+/g, " "),
      category: "motivation",
      why: "Checks motivation and whether you understood the role.",
      answer_hint: `Mention 1–2 duties from the ad that match what you have done: ${analysis.responsibilities.slice(0, 2).join("; ") || "see the Analysis tab"}.`,
      sample_answer_fi: `Tehtävä sopii kokemukseeni${exp ? ` tehtävästä ${exp.title}` : ""}. Haluan käyttää osaamistani ja kehittyä tässä työssä.`,
      sample_answer_en: `The job fits my experience${exp ? ` as ${exp.title}` : ""}. I want to use my skills and develop in this job.`,
      evidence: analysis.strengths[0]?.evidence ?? "",
    },
    ...concepts.map((c) => {
      const ev = cv.experience.flatMap((e) => e.bullets).find((b) => c.en.some((t) => enMatches(b, t)) || c.fi.some((s) => fiMatches(b, s)));
      return {
        question_fi: c.question!.fi,
        question_en: c.question!.en,
        category: (ev ? "experience" : "gap") as InterviewCategory,
        why: `The ad asks for ${c.label.toLowerCase()}.`,
        answer_hint: ev ? `Use a concrete example: "${ev}". Describe the situation, what you did, and the result.` : `You have no direct evidence for this. Be honest, then describe related experience. ${c.advice ?? ""}`.trim(),
        sample_answer_fi: ev ? `Kyllä. Edellisessä työssäni tein tätä: [kerro esimerkki omin sanoin].` : "Minulla ei ole vielä suoraa kokemusta tästä, mutta [kerro liittyvä kokemus] ja olen valmis oppimaan.",
        sample_answer_en: ev ? `Yes. In my previous job I did this: ${ev}.` : "I don't have direct experience with this yet, but [describe related experience] and I am ready to learn.",
        evidence: ev ?? "",
      };
    }),
    // Language questions — driven by the ad's language requirements.
    ...analysis.languages.map((l) => {
      const isFi = l.language === "Finnish";
      return {
        question_fi: isFi ? "Millainen on suomen kielen taitosi? Voitko kertoa sen suomeksi?" : `Miten hyvin puhut ${LANG_FI[l.language] ?? l.language}a? Voitko käyttää sitä työssä?`,
        question_en: isFi ? "What is your Finnish level? Can you tell us in Finnish?" : `How well do you speak ${l.language}? Can you use it at work?`,
        category: "language" as InterviewCategory,
        why: `The ad asks for ${l.language}${l.required_level !== "Not specified" ? ` at ${l.required_level}` : ""} (${l.mandatory ? "required" : "an advantage"}). They may switch language to test you.`,
        answer_hint:
          l.status === "match"
            ? `Your stated level (${l.applicant_level}) meets the requirement. Answer confidently and give an example of using ${l.language} at work.`
            : `Be honest: you stated ${l.applicant_level}; they ask for ${l.required_level}. Say how you are improving (course, YKI test, daily practice) and that you can ask clarifying questions.`,
        sample_answer_fi: isFi
          ? `Puhun suomea tasolla ${finnish?.level || "[taso]"}. Opiskelen suomea koko ajan ja ymmärrän työohjeet. Jos en ymmärrä, kysyn uudelleen.`
          : `Puhun ${LANG_FI[l.language] ?? l.language}a tasolla ${l.applicant_level}.`,
        sample_answer_en: isFi
          ? `I speak Finnish at level ${finnish?.level || "[level]"}. I keep studying Finnish and I understand work instructions. If I don't understand, I ask again.`
          : `I speak ${l.language} at level ${l.applicant_level}.`,
        evidence: l.applicant_level !== "Not stated" ? `${l.language}: ${l.applicant_level}` : "",
      };
    }),
    {
      question_fi: "Miten toimit, jos et ymmärrä ohjetta?",
      question_en: "What do you do if you don't understand an instruction?",
      category: "language",
      why: "Common for applicants whose Finnish is still developing — they want to hear that you ask.",
      answer_hint: "Say you ask again, repeat the instruction back in your own words, and write it down if needed.",
      sample_answer_fi: "Kysyn uudelleen ja toistan ohjeen omin sanoin. Tarvittaessa kirjoitan sen muistiin.",
      sample_answer_en: "I ask again and repeat the instruction in my own words. If needed, I write it down.",
      evidence: "",
    },
    {
      question_fi: "Milloin voisit aloittaa?",
      question_en: "When could you start?",
      category: "practical",
      why: "Practical availability check.",
      answer_hint: "Give a concrete date or notice period.",
      sample_answer_fi: "Voin aloittaa [päivämäärä].",
      sample_answer_en: "I can start on [date].",
      evidence: "",
    },
    {
      question_fi: "Onko sinulla kysyttävää meiltä?",
      question_en: "Do you have any questions for us?",
      category: "practical",
      why: "Always asked at the end; having a question shows interest.",
      answer_hint: "Ask about induction (perehdytys), shifts, or what a typical day looks like.",
      sample_answer_fi: "Kyllä. Millainen perehdytys työhön on? Millainen on tavallinen työpäivä?",
      sample_answer_en: "Yes. What is the induction like? What does a typical working day look like?",
      evidence: "",
    },
  ];

  const below = analysis.languages.filter((l) => l.status !== "match");
  const language_check = {
    summary: analysis.languages.length
      ? analysis.languages
          .map((l) => `${l.language}: the ad asks for ${l.required_level} (${l.mandatory ? "required" : "an advantage"}); you stated ${l.applicant_level}${l.status === "match" ? " — meets it" : l.status === "partial" ? " — slightly below" : l.status === "missing" ? " — below or not stated" : ""}.`)
          .join(" ")
      : "The ad doesn't state a language requirement. Expect some small talk in Finnish anyway.",
    tips: [
      "Prepare a 1-minute self-introduction in Finnish and practise it out loud.",
      "It's fine to say “Voisitteko toistaa?” (Could you repeat?) — it shows you care about understanding.",
      ...(below.length ? [`Be honest about your ${below.map((l) => l.language).join(" and ")} level and mention how you are improving it (course, YKI test date).`] : []),
      "Learn the Finnish words for the main duties in this ad (see the Vocabulary on the Analysis tab).",
    ],
  };

  return {
    questions: qs,
    language_check,
    phrases: [
      { fi: "Hyvää päivää, kiitos kutsusta haastatteluun.", en: "Good day, thank you for inviting me to the interview." },
      { fi: "Voisitteko toistaa kysymyksen?", en: "Could you repeat the question?" },
      { fi: "Voisitteko puhua vähän hitaammin?", en: "Could you speak a little more slowly?" },
      { fi: "Minulla on kokemusta …", en: "I have experience in …" },
      { fi: "Olen työskennellyt … vuotta.", en: "I have worked for … years." },
      { fi: "Opiskelen suomea tällä hetkellä.", en: "I am currently studying Finnish." },
      { fi: "Ymmärrän suomea paremmin kuin puhun.", en: "I understand Finnish better than I speak it." },
      { fi: "Voinko vastata englanniksi?", en: "May I answer in English?" },
      { fi: "Voin tehdä vuorotyötä.", en: "I can do shift work." },
      { fi: "Voin aloittaa heti.", en: "I can start immediately." },
      { fi: "Millainen perehdytys työhön on?", en: "What is the job induction like?" },
      { fi: "Kiitos, oli mukava tavata.", en: "Thank you, it was nice to meet you." },
    ],
  };
}
