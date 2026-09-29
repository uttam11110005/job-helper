// Shared domain types. These mirror the BRD data model (§16) and the
// structured outputs the AI layer must return (§17: structured + validated).

export type FitStatus = "match" | "partial" | "missing" | "unknown";

export const JOB_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected", "Closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface Experience {
  id: string;
  title: string;
  employer: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  start: string;
  end: string;
  details: string;
}

export interface LanguageSkill {
  name: string;
  level: string; // CEFR (A1–C2), "Native", or free text
}

export type CVTemplate = "classic" | "sidebar" | "ats";

export interface CVDesign {
  template: CVTemplate;
  accent: string; // hex
  showPhoto?: boolean; // default true; false = layout without a photo
}

export const CV_ACCENTS = [
  { name: "Amber", hex: "#d97706" },
  { name: "Orchid", hex: "#b8458f" },
  { name: "Ocean", hex: "#0b5cad" },
  { name: "Forest", hex: "#2f7d5b" },
  { name: "Coral", hex: "#d4543f" },
  { name: "Graphite", hex: "#334155" },
] as const;

export const DEFAULT_DESIGN: CVDesign = { template: "classic", accent: "#d97706" };

export interface CVData {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certificates: string[];
  languages: LanguageSkill[];
  // Optional presentation extras (all user-provided, never AI-invented)
  photo?: string; // small square JPEG data URL
  highlights?: { title: string; text: string }[]; // "Customer service", "Sales"… competence areas
  interests?: string[]; // volunteering & interests
  design?: CVDesign;
}

export interface Profile {
  headline: string;
  location: string;
  workAuthorization: string;
  targetRoles: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certificates: string[];
  languages: LanguageSkill[];
}

export interface Requirement {
  id: string;
  text_original: string;
  text_en: string;
  category: "mandatory" | "preferred" | "unspecified";
  kind: "experience" | "skill" | "education" | "language" | "certificate" | "other";
  status: FitStatus;
  evidence: string; // quote from CV/profile, empty if none
  explanation: string;
}

export interface LanguageRequirement {
  language: string;
  required_level: string;
  mandatory: boolean;
  applicant_level: string;
  status: FitStatus;
  note: string;
}

export interface Recommendation {
  id: string;
  section: "headline" | "summary" | "highlight" | "bullet" | "skills";
  title?: string; // for "highlight": the expertise area name
  experience_id: string; // for bullets, else ""
  bullet_index: number; // for bullets, else -1
  original: string;
  suggested: string;
  reason: string;
  evidence: string;
}

export interface Analysis {
  job: { title: string; employer: string; location: string; employment_type: string; deadline: string };
  summary: string;
  responsibilities: string[];
  requirements: Requirement[];
  languages: LanguageRequirement[];
  vocabulary: { fi: string; en: string; note: string }[];
  strengths: { title: string; evidence: string }[];
  gaps: { title: string; detail: string; advice: string }[];
  keywords: { term: string; supported: boolean; evidence: string }[];
  structure_advice: string[];
  recommendations: Recommendation[];
  uncertainty: string[];
  // Which CV type fits: "experience" (Mark Burns style — directly relevant jobs)
  // or "skills" (Eleonora style — career change, experience summarised into expertise areas).
  cv_strategy?: { recommended: CVFormat; reason: string };
}

export type CVFormat = "experience" | "skills";

export type Decision = "pending" | "accepted" | "rejected";

export interface RecommendationState extends Recommendation {
  decision: Decision;
  edited: string | null; // user's edited version of `suggested`
  flags: string[]; // grounding-guard warnings
}

export interface ApplicationDraft {
  message_fi: string;
  message_en: string;
  form_answers: { question: string; answer_fi: string; answer_en: string }[];
}

export type InterviewCategory = "experience" | "motivation" | "practical" | "language" | "gap";

export interface InterviewQuestion {
  question_fi: string;
  question_en: string;
  category?: InterviewCategory; // optional: preps saved before this field existed
  why: string;
  answer_hint: string;
  sample_answer_fi?: string;
  sample_answer_en?: string;
  evidence: string;
}

export interface InterviewPrep {
  questions: InterviewQuestion[];
  phrases: { fi: string; en: string }[];
  language_check?: { summary: string; tips: string[] };
}

export interface OcrResult {
  readable: boolean;
  text: string;
  issues: string;
}

export function emptyCV(): CVData {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    headline: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certificates: [],
    languages: [],
  };
}

export function emptyProfile(): Profile {
  return {
    headline: "",
    location: "",
    workAuthorization: "",
    targetRoles: "",
    experience: [],
    education: [],
    skills: [],
    certificates: [],
    languages: [],
  };
}
