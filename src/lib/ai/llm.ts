import "server-only";
import { s, structured, type ContentPart } from "./openai";
import type {
  Analysis,
  ApplicationDraft,
  CVData,
  InterviewPrep,
  OcrResult,
  Profile,
} from "../types";

const GROUNDING = `
GROUNDING RULES (non-negotiable):
- Job facts come ONLY from the submitted job advertisement.
- Applicant facts come ONLY from the applicant's CV and profile JSON.
- Never invent jobs, dates, employers, education, certifications, skills, metrics or achievements.
- Never add a job-ad keyword to the applicant's materials unless the CV/profile actually supports it.
- If information is missing or ambiguous, say so explicitly instead of guessing.
- You do NOT predict hiring outcomes.`;

const experienceSchema = s.obj({
  id: s.str(),
  title: s.str(),
  employer: s.str(),
  location: s.str(),
  start: s.str("e.g. 2021-03 or 'March 2021', empty if unknown"),
  end: s.str("'Present' if current, empty if unknown"),
  bullets: s.arr(s.str()),
});

const cvSchema = s.obj({
  name: s.str(),
  email: s.str(),
  phone: s.str(),
  location: s.str(),
  headline: s.str(),
  summary: s.str(),
  experience: s.arr(experienceSchema),
  education: s.arr(
    s.obj({ id: s.str(), degree: s.str(), institution: s.str(), start: s.str(), end: s.str(), details: s.str() }),
  ),
  skills: s.arr(s.str()),
  certificates: s.arr(s.str()),
  languages: s.arr(s.obj({ name: s.str(), level: s.str("CEFR A1–C2, 'Native', or as written") })),
  highlights: s.arr(s.obj({ title: s.str(), text: s.str() })),
  interests: s.arr(s.str("volunteering, hobbies, interests as written")),
});

const fit = s.enm(["match", "partial", "missing", "unknown"]);

const analysisSchema = s.obj({
  job: s.obj({
    title: s.str(),
    employer: s.str(),
    location: s.str(),
    employment_type: s.str(),
    deadline: s.str("application deadline as written, empty if none"),
  }),
  summary: s.str("plain-English explanation of what this job actually is, 3–5 sentences"),
  responsibilities: s.arr(s.str("in English")),
  requirements: s.arr(
    s.obj({
      id: s.str("r1, r2, ..."),
      text_original: s.str("the requirement as written in the ad"),
      text_en: s.str("English translation"),
      category: s.enm(["mandatory", "preferred", "unspecified"]),
      kind: s.enm(["experience", "skill", "education", "language", "certificate", "other"]),
      status: fit,
      evidence: s.str("verbatim or near-verbatim quote from CV/profile, empty if none"),
      explanation: s.str("why this status, one sentence"),
    }),
  ),
  languages: s.arr(
    s.obj({
      language: s.str(),
      required_level: s.str("CEFR if stated, else as written"),
      mandatory: s.bool(),
      applicant_level: s.str("from CV/profile, 'Not stated' if absent"),
      status: fit,
      note: s.str(),
    }),
  ),
  vocabulary: s.arr(s.obj({ fi: s.str(), en: s.str(), note: s.str() })),
  strengths: s.arr(s.obj({ title: s.str(), evidence: s.str() })),
  gaps: s.arr(s.obj({ title: s.str(), detail: s.str(), advice: s.str("honest, actionable advice") })),
  keywords: s.arr(s.obj({ term: s.str(), supported: s.bool(), evidence: s.str() })),
  structure_advice: s.arr(s.str()),
  recommendations: s.arr(
    s.obj({
      id: s.str("rec1, rec2, ..."),
      section: s.enm(["headline", "summary", "highlight", "bullet", "skills"]),
      title: s.str("for highlight: the expertise area name, e.g. 'Customer service'; else empty"),
      experience_id: s.str("for bullet: the experience id from the CV JSON, else empty"),
      bullet_index: s.int(),
      original: s.str(),
      suggested: s.str(),
      reason: s.str(),
      evidence: s.str("the CV fact that justifies this wording"),
    }),
  ),
  uncertainty: s.arr(s.str()),
  cv_strategy: s.obj({
    recommended: s.enm(["experience", "skills"]),
    reason: s.str("one or two sentences, addressed to the applicant"),
  }),
});

const applicationSchema = s.obj({
  message_fi: s.str(),
  message_en: s.str(),
  form_answers: s.arr(s.obj({ question: s.str(), answer_fi: s.str(), answer_en: s.str() })),
});

const interviewSchema = s.obj({
  questions: s.arr(
    s.obj({
      question_fi: s.str(),
      question_en: s.str(),
      category: s.enm(["experience", "motivation", "practical", "language", "gap"]),
      why: s.str(),
      answer_hint: s.str("grounded in the applicant's real experience"),
      sample_answer_fi: s.str("short spoken answer in simple Finnish at the applicant's level; only real CV facts; use [placeholders] for unknowns"),
      sample_answer_en: s.str("English version of the sample answer"),
      evidence: s.str(),
    }),
  ),
  phrases: s.arr(s.obj({ fi: s.str(), en: s.str() })),
  language_check: s.obj({
    summary: s.str("compare the ad's language requirements with the applicant's stated levels, honestly"),
    tips: s.arr(s.str()),
  }),
});

export async function llmOcr(images: string[]): Promise<OcrResult> {
  const parts: ContentPart[] = [
    {
      type: "text",
      text: `These ${images.length} image(s) are screenshots of ONE job advertisement, in order. Transcribe all job-ad text exactly as written (keep Finnish/Swedish as-is, keep bullet structure with "- "). Skip UI chrome, cookie banners and unrelated ads. If the text is too blurry/cropped to read reliably, set readable=false and explain in issues.`,
    },
    ...images.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } })),
  ];
  return structured<OcrResult>({
    name: "job_ad_ocr",
    schema: s.obj({ readable: s.bool(), text: s.str(), issues: s.str() }),
    system: "You are a precise OCR engine for Finnish job advertisements. Output only text that is visible.",
    user: parts,
    temperature: 0,
  });
}

export async function llmParseCV(text: string): Promise<CVData> {
  return structured<CVData>({
    name: "cv_parse",
    schema: cvSchema,
    system: `You convert a CV into structured JSON. Copy facts faithfully; do not improve, embellish or translate wording. Themed paragraphs such as "Customer service", "Sales", "Training and coaching" go into highlights (title + text, verbatim). Volunteering and interests go into interests. Give experience ids "e1","e2"... and education ids "ed1","ed2"... in the order they appear. Use empty strings/arrays for anything absent.`,
    user: text.slice(0, 40_000),
    temperature: 0,
  });
}

export async function llmAnalyze(jobText: string, cv: CVData, profile: Profile): Promise<Analysis> {
  return structured<Analysis>({
    name: "job_analysis",
    schema: analysisSchema,
    system: `You are a careful Finnish labour-market advisor helping immigrants understand Finnish job ads and present their REAL experience truthfully.
${GROUNDING}

TASK
1. Explain the job in plain English; list responsibilities.
2. Extract every requirement; mark mandatory vs preferred when the ad distinguishes it (e.g. "edellytämme/vaadimme" = mandatory, "eduksi katsotaan/toivomme/arvostamme" = preferred).
3. Fit status per requirement: match = direct CV evidence; partial = related evidence but incomplete; missing = explicit requirement with no support; unknown = cannot assess (e.g. soft traits, info not in CV).
4. Language requirements with CEFR where stated; compare to applicant's stated level.
5. 10–20 important Finnish words/phrases from THIS ad with English meaning.
6. CV strengths (with evidence), gaps (with honest advice, e.g. how to obtain a card/course), job-relevant keywords with supported=true ONLY when the CV supports them.
7. Recommendations to tailor the CV:
   - "headline": exactly one short job-targeted headline (max ~10 words, e.g. "Marketing Manager | Growth & Performance Marketing") built ONLY from the applicant's real job titles and existing skills. Put it into "original" the current CV headline (may be empty).
   - "summary": one rewritten summary using only CV facts, emphasising what this job needs.
   - "bullet": rephrase an existing bullet (copy it exactly into "original", reference experience_id + 0-based bullet_index) to surface relevant truthful terminology. Never add numbers, tools, duties or results not already present.
   - "skills": at most one — a comma-separated reordering of the applicant's EXISTING skills with the most relevant first.
   - "highlight": 2–4 expertise areas (title + a 2–3 sentence first-person paragraph, e.g. "I have worked in customer service at …") that SUMMARISE the applicant's real experience across jobs, grouped by theme and ordered by relevance to this job. Only facts from the CV; cite the roles in evidence. Leave "original" empty.
   Always include the headline recommendation first. Keep 3–8 high-value recommendations. Readability over keyword stuffing.
8. structure_advice: which sections/experience to emphasise.
9. uncertainty: anything unclear in the ad or CV.
10. cv_strategy: "experience" when the applicant's past jobs are directly relevant to this role (a chronological, experience-led CV works best); "skills" when they are changing career or their relevant experience is scattered/transferable (a CV that leads with expertise areas and lists jobs compactly works best).`,
    user: `JOB ADVERTISEMENT:\n"""\n${jobText.slice(0, 20_000)}\n"""\n\nAPPLICANT CV (JSON):\n${JSON.stringify(cv)}\n\nAPPLICANT PROFILE (JSON):\n${JSON.stringify(profile)}`,
  });
}

export async function llmApplication(jobText: string, analysis: Analysis, cv: CVData): Promise<ApplicationDraft> {
  return structured<ApplicationDraft>({
    name: "application",
    schema: applicationSchema,
    system: `You write targeted Finnish job applications (hakemus) for immigrants.
${GROUNDING}
Write natural, polite, concise Finnish (plain yleiskieli, B1–B2 readable, ~180–250 words) addressed appropriately ("Hei," or "Hyvä rekrytoija,"). Structure: why this role → 2–3 relevant proofs from the CV → languages/availability ONLY if stated → friendly close with the applicant's name.
message_en is a faithful English translation so the applicant understands every sentence.
form_answers: 3–4 concise answers to typical Finnish application-form questions (e.g. "Miksi haet tätä paikkaa?", "Kerro itsestäsi lyhyesti", "Milloin voit aloittaa?"). If availability is unknown, use a placeholder like "[aloituspäivä]" rather than inventing.`,
    user: `JOB AD:\n"""\n${jobText.slice(0, 15_000)}\n"""\n\nANALYSIS:\n${JSON.stringify({ job: analysis.job, strengths: analysis.strengths, requirements: analysis.requirements })}\n\nAPPROVED TAILORED CV (JSON):\n${JSON.stringify(cv)}`,
    temperature: 0.4,
  });
}

export async function llmInterview(jobText: string, analysis: Analysis, cv: CVData): Promise<InterviewPrep> {
  return structured<InterviewPrep>({
    name: "interview_prep",
    schema: interviewSchema,
    system: `You prepare immigrants for Finnish job interviews.
${GROUNDING}
Generate 9–12 role-specific questions an interviewer for THIS job would likely ask, each with a category: experience, motivation, practical (scenario/safety/quality), language, gap.
Include 2–3 "language" questions that test the languages the ad requires (e.g. asked in Finnish to check level, or about working in English/Swedish), plus one about how the applicant is improving their Finnish if their level is below the requirement.
sample_answer_fi must be in simple spoken Finnish the applicant could realistically say at their stated level (short sentences); sample_answer_en is its English version.
language_check: honestly compare required vs. stated language levels and give 3–5 practical tips for the interview (e.g. asking to repeat, preparing a self-introduction in Finnish). Each has Finnish + English, why it's asked, and an answer_hint built ONLY from the applicant's real CV (cite it in evidence; if nothing relevant exists, give honest advice on how to address the gap).
Then 10–12 simple Finnish interview phrases with English meanings, useful for this role.`,
    user: `JOB AD:\n"""\n${jobText.slice(0, 15_000)}\n"""\n\nANALYSIS:\n${JSON.stringify({ job: analysis.job, requirements: analysis.requirements, languages: analysis.languages, gaps: analysis.gaps })}\n\nCV (JSON):\n${JSON.stringify(cv)}`,
    temperature: 0.4,
  });
}

// ───────── full CV rewrite for one job ─────────

export interface RewriteResult {
  headline: string;
  summary: string;
  experience: { id: string; bullets: string[] }[];
  skills: string[];
  highlights: { title: string; text: string }[];
  note: string;
}

const rewriteSchema = s.obj({
  headline: s.str("max ~10 words, built from real job titles/skills"),
  summary: s.str("3–4 sentences, first person optional, only CV facts"),
  experience: s.arr(s.obj({ id: s.str("experience id from the CV JSON"), bullets: s.arr(s.str()) })),
  skills: s.arr(s.str("a skill relevant to THIS job that the CV evidences")),
  highlights: s.arr(s.obj({ title: s.str(), text: s.str() })),
  note: s.str("2–3 short sentences for the applicant: what you changed and why"),
});

export async function llmRewriteCV(jobText: string, analysis: Analysis, cv: CVData, profile: Profile, format: "experience" | "skills"): Promise<RewriteResult> {
  const formatRules =
    format === "experience"
      ? `CV TYPE: Experience-focused (the applicant has relevant experience).
- Keep every role. For the 2–3 most relevant roles write 3–5 strong bullets each; older/less relevant roles 1–2 bullets.
- Bullets start with an action verb, put the most job-relevant work first, and keep real numbers exactly as written.
- highlights: return an empty array.`
      : `CV TYPE: Career change (the applicant is moving into a new field).
- highlights: 2–4 expertise areas (title + 2–3 sentences, first person, e.g. "I have worked in customer service at …") that summarise transferable experience across jobs, most relevant to THIS job first.
- Experience bullets: 1–2 short bullets per role only (jobs are listed compactly).`;

  return structured<RewriteResult>({
    name: "cv_rewrite",
    schema: rewriteSchema,
    system: `You are an expert CV writer for the Finnish job market. Rewrite the applicant's CV so it is targeted at ONE job.
${GROUNDING}

WHAT YOU MAY CHANGE: headline, summary, experience bullets (wording, order, which bullets to keep), skills list, expertise areas.
WHAT YOU MUST NOT CHANGE: job titles, employers, dates, education, certificates, languages, contact details (they are taken from the original automatically).

RULES
- Use each experience "id" exactly as given. Rewrite bullets only from what that role's original bullets say — never move a duty to a different job, never add tools, numbers, results or responsibilities.
- skills: ONLY skills relevant to this job AND evidenced by the CV (skills list, bullets or education). 6–12 items, most relevant first. Do not list unrelated skills. Do not add job-ad keywords the CV doesn't support.
- Use the job ad's terminology where it truthfully fits the applicant's real experience (a Finnish term in brackets is fine).
- The whole CV must fit on at most 2 A4 pages: keep it concise (about 25 bullets in total at most).
${formatRules}`,
    user: `JOB AD:\n"""\n${jobText.slice(0, 15_000)}\n"""\n\nANALYSIS (requirements & fit):\n${JSON.stringify({ job: analysis.job, requirements: analysis.requirements, keywords: analysis.keywords, gaps: analysis.gaps })}\n\nORIGINAL CV (JSON):\n${JSON.stringify({ ...cv, photo: undefined, design: undefined })}\n\nPROFILE (extra facts):\n${JSON.stringify(profile)}`,
    temperature: 0.3,
  });
}
