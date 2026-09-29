import "server-only";
import { all, get } from "./db";
import type {
  Analysis,
  ApplicationDraft,
  CVData,
  CVFormat,
  InterviewPrep,
  JobStatus,
  Profile,
  RecommendationState,
} from "./types";
import { emptyProfile } from "./types";
import { normalizeCV } from "./ai/engine";

export interface CVRecord {
  id: string;
  source_file: string | null;
  source_type: string;
  raw_text: string;
  parsed: CVData;
  version: number;
  created_at: string;
}

export interface JobRecord {
  id: string;
  title: string;
  employer: string;
  location: string;
  raw_text: string;
  source_type: "text" | "images";
  status: JobStatus;
  deadline: string | null;
  applied_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AnalysisRecord {
  id: string;
  cv_id: string | null;
  data: Analysis;
  engine: string;
  created_at: string;
}

export interface TailoringMeta {
  approved: boolean; // the applicant has checked the rewritten CV
  flags: Record<string, string[]>; // grounding warnings per field ("summary", "exp:e1:0", …)
  format?: CVFormat;
  note?: string; // what the rewrite changed
}

export interface TailoringRecord {
  id: string;
  source_cv_id: string;
  recommendations: RecommendationState[];
  tailored: CVData | null;
  meta: TailoringMeta;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRecord extends ApplicationDraft {
  tailoring_id: string | null;
  interview: InterviewPrep | null;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<Profile> {
  const row = await get<{ data: string }>("SELECT data FROM profiles WHERE user_id = ?", userId);
  return row ? { ...emptyProfile(), ...JSON.parse(row.data) } : emptyProfile();
}

function toCV(r: Record<string, unknown>): CVRecord {
  return {
    id: r.id as string,
    source_file: r.source_file as string | null,
    source_type: r.source_type as string,
    raw_text: r.raw_text as string,
    parsed: normalizeCV(JSON.parse(r.parsed_content as string)),
    version: r.version as number,
    created_at: r.created_at as string,
  };
}

export async function getLatestCV(userId: string): Promise<CVRecord | null> {
  const r = await get("SELECT * FROM cvs WHERE user_id = ? ORDER BY version DESC LIMIT 1", userId);
  return r ? toCV(r) : null;
}

export async function getCV(userId: string, cvId: string): Promise<CVRecord | null> {
  const r = await get("SELECT * FROM cvs WHERE user_id = ? AND id = ?", userId, cvId);
  return r ? toCV(r) : null;
}

export async function listCVs(userId: string): Promise<CVRecord[]> {
  return (await all("SELECT * FROM cvs WHERE user_id = ? ORDER BY version DESC", userId)).map(toCV);
}

export async function getJob(userId: string, jobId: string): Promise<JobRecord | null> {
  return await get<JobRecord>("SELECT * FROM jobs WHERE id = ? AND user_id = ?", jobId, userId) ?? null;
}

export async function listJobs(userId: string) {
  return await all<JobRecord & { has_analysis: number; tailored_versions: number; has_application: number }>(
    `SELECT j.*,
       EXISTS(SELECT 1 FROM analyses a WHERE a.job_id = j.id) AS has_analysis,
       CAST((SELECT COUNT(*) FROM cv_tailorings t WHERE t.job_id = j.id AND t.tailored_content IS NOT NULL) AS INTEGER) AS tailored_versions,
       EXISTS(SELECT 1 FROM applications p WHERE p.job_id = j.id AND p.message_fi != '') AS has_application
     FROM jobs j WHERE j.user_id = ? ORDER BY j.updated_at DESC`,
    userId,
  );
}

export async function getJobImages(jobId: string) {
  return await all<{ id: string; storage_key: string; sequence: number; ocr_text: string }>(
    "SELECT * FROM job_images WHERE job_id = ? ORDER BY sequence",
    jobId,
  );
}

export async function getAnalysis(jobId: string): Promise<AnalysisRecord | null> {
  const r = await get<{ id: string; cv_id: string | null; data: string; engine: string; created_at: string }>(
    "SELECT * FROM analyses WHERE job_id = ?",
    jobId,
  );
  return r ? { ...r, data: JSON.parse(r.data) } : null;
}

function toTailoring(r: Record<string, unknown>): TailoringRecord {
  return {
    id: r.id as string,
    source_cv_id: r.source_cv_id as string,
    recommendations: JSON.parse(r.recommendations as string),
    tailored: r.tailored_content ? normalizeCV(JSON.parse(r.tailored_content as string)) : null,
    // Versions made before the review step existed count as already checked.
    meta: r.meta ? JSON.parse(r.meta as string) : { approved: Boolean(r.tailored_content), flags: {} },
    version: r.version as number,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

export async function getLatestTailoring(jobId: string): Promise<TailoringRecord | null> {
  const r = await get("SELECT * FROM cv_tailorings WHERE job_id = ? ORDER BY (tailored_content IS NOT NULL) DESC, version DESC LIMIT 1", jobId);
  return r ? toTailoring(r) : null;
}

export async function getTailoring(jobId: string, id: string): Promise<TailoringRecord | null> {
  const r = await get("SELECT * FROM cv_tailorings WHERE job_id = ? AND id = ?", jobId, id);
  return r ? toTailoring(r) : null;
}

export async function listTailorings(jobId: string): Promise<TailoringRecord[]> {
  return (await all("SELECT * FROM cv_tailorings WHERE job_id = ? AND tailored_content IS NOT NULL ORDER BY version DESC", jobId)).map(toTailoring);
}

export async function getApplication(jobId: string): Promise<ApplicationRecord | null> {
  const r = await get<Record<string, string | null>>("SELECT * FROM applications WHERE job_id = ?", jobId);
  if (!r) return null;
  return {
    message_fi: r.message_fi ?? "",
    message_en: r.message_en ?? "",
    form_answers: JSON.parse(r.form_answers ?? "[]"),
    interview: r.interview ? JSON.parse(r.interview) : null,
    tailoring_id: r.tailoring_id,
    updated_at: r.updated_at ?? "",
  };
}
