"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { get, run, now, uid, tx } from "@/lib/db";
import { deleteUploads, saveUpload } from "@/lib/storage";
import { consumeAnalysis, getUsage } from "@/lib/billing";
import {
  analyzeJob,
  applyRecommendations,
  condenseCV,
  rewriteCV,
  buildRecommendationStates,
  engine,
  generateApplication,
  generateInterview,
  normalizeCV,
  ocrImages,
} from "@/lib/ai/engine";
import {
  getAnalysis,
  getApplication,
  getCV,
  getJob,
  getJobImages,
  getLatestCV,
  getLatestTailoring,
  getProfile,
  getTailoring,
} from "@/lib/repo";
import type { CVData, CVFormat, JobStatus, RecommendationState } from "@/lib/types";
import { JOB_STATUSES, emptyCV } from "@/lib/types";

type Fail = { ok: false; error: string; code?: "LIMIT" | "NO_CV" };

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/^AI (401|403)/.test(msg)) return "The AI API key was rejected. Check the key in .env.local.";
  if (msg.startsWith("AI 429")) return "The free AI tier is busy or its daily limit is reached. Please try again in a minute.";
  if (msg.startsWith("AI ")) return `The AI service returned an error. (${msg.slice(0, 160)})`;
  return msg;
}

// ───────────────────────── job input ─────────────────────────

/** Paste-text flow: create the job and analyse it in one step. */
export async function createJobFromTextAction(text: string): Promise<{ ok: true; jobId: string } | Fail> {
  const user = await requireUser();
  const clean = text.trim();
  if (clean.length < 80) return { ok: false, error: "That looks too short for a job ad. Paste the full advertisement text." };
  if (!(await getUsage(user.id)).canAnalyze) return { ok: false, code: "LIMIT", error: "Free analyses used." };
  const jobId = uid("job_");
  await run(
    "INSERT INTO jobs (id, user_id, raw_text, source_type, created_at, updated_at) VALUES (?, ?, ?, 'text', ?, ?)",
    jobId,
    user.id,
    clean,
    now(),
    now(),
  );
  const r = await analyzeJobAction(jobId, clean);
  if (!r.ok) return r;
  return { ok: true, jobId };
}

/** Screenshot flow, step 1: store images and extract text for user review. */
export async function createJobFromImagesAction(form: FormData): Promise<{ ok: true; jobId: string } | Fail> {
  const user = await requireUser();
  if (!(await getUsage(user.id)).canAnalyze) return { ok: false, code: "LIMIT", error: "Free analyses used." };
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Add at least one screenshot." };
  if (files.length > MAX_IMAGES) return { ok: false, error: `You can upload up to ${MAX_IMAGES} screenshots per job.` };
  for (const f of files) {
    if (!IMAGE_TYPES[f.type]) return { ok: false, error: `${f.name}: only PNG, JPG or WebP images are supported.` };
    if (f.size > MAX_IMAGE_BYTES) return { ok: false, error: `${f.name} is larger than 8 MB.` };
  }

  const jobId = uid("job_");
  const dataUrls: string[] = [];
  const images: { id: string; key: string; seq: number }[] = [];
  for (const [i, f] of files.entries()) {
    const buf = Buffer.from(await f.arrayBuffer());
    const key = await saveUpload(`${user.id}/${jobId}/${i + 1}.${IMAGE_TYPES[f.type]}`, buf, f.type);
    images.push({ id: uid("img_"), key, seq: i + 1 });
    dataUrls.push(`data:${f.type};base64,${buf.toString("base64")}`);
  }
  await tx(async () => {
    await run(
      "INSERT INTO jobs (id, user_id, raw_text, source_type, created_at, updated_at) VALUES (?, ?, '', 'images', ?, ?)",
      jobId,
      user.id,
      now(),
      now(),
    );
    for (const im of images)
      await run("INSERT INTO job_images (id, job_id, storage_key, sequence) VALUES (?, ?, ?, ?)", im.id, jobId, im.key, im.seq);
  });

  try {
    const ocr = await ocrImages(dataUrls);
    if (ocr) {
      await run("UPDATE jobs SET raw_text = ? WHERE id = ?", ocr.text, jobId);
      if (images.length === 1) await run("UPDATE job_images SET ocr_text = ? WHERE id = ?", ocr.text, images[0].id);
      if (!ocr.readable) {
        await run("UPDATE jobs SET notes = ? WHERE id = ?", `OCR_UNREADABLE:${ocr.issues}`, jobId);
      }
    }
  } catch (e) {
    await run("UPDATE jobs SET notes = ? WHERE id = ?", `OCR_ERROR:${friendly(e)}`, jobId);
  }
  return { ok: true, jobId };
}

/** Saves text extracted in the browser (demo-mode OCR). */
export async function saveOcrTextAction(jobId: string, text: string) {
  const user = await requireUser();
  if (!await getJob(user.id, jobId)) return { ok: false as const, error: "Job not found." };
  await run("UPDATE jobs SET raw_text = ?, updated_at = ? WHERE id = ?", text, now(), jobId);
  return { ok: true as const };
}

// ───────────────────────── analysis ─────────────────────────

export async function analyzeJobAction(jobId: string, reviewedText?: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser();
  const job = await getJob(user.id, jobId);
  if (!job) return { ok: false, error: "Job not found." };
  const text = (reviewedText ?? job.raw_text).trim();
  if (text.length < 80) return { ok: false, error: "The job text is too short or unreadable. Correct it or upload clearer screenshots." };

  const existing = await getAnalysis(jobId);
  if (!existing && !(await getUsage(user.id)).canAnalyze) return { ok: false, code: "LIMIT", error: "Free analyses used." };

  const cvRec = await getLatestCV(user.id);
  const cv = cvRec?.parsed ?? emptyCV();
  const profile = await getProfile(user.id);

  let analysis;
  try {
    analysis = await analyzeJob(text, cv, profile);
  } catch (e) {
    return { ok: false, error: friendly(e) };
  }

  await tx(async () => {
    await run(
      `UPDATE jobs SET raw_text = ?, title = COALESCE(NULLIF(?, ''), title), employer = COALESCE(NULLIF(?, ''), employer),
       location = COALESCE(NULLIF(?, ''), location), notes = CASE WHEN notes LIKE 'OCR_%' THEN '' ELSE notes END, updated_at = ? WHERE id = ?`,
      text,
      analysis.job.title,
      analysis.job.employer,
      analysis.job.location,
      now(),
      jobId,
    );
    if (existing) {
      await run("UPDATE analyses SET data = ?, cv_id = ?, engine = ?, created_at = ? WHERE job_id = ?", JSON.stringify(analysis), cvRec?.id ?? null, engine(), now(), jobId);
    } else {
      // One submitted job = one analysis. Re-running the same job is free.
      await consumeAnalysis(user.id);
      await run(
        "INSERT INTO analyses (id, job_id, cv_id, data, engine, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        uid("an_"),
        jobId,
        cvRec?.id ?? null,
        JSON.stringify(analysis),
        engine(),
        now(),
      );
    }
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

// ───────────────────────── CV tailoring ─────────────────────────

async function ownedTailoring(userId: string, jobId: string, tailoringId: string) {
  if (!await getJob(userId, jobId)) return null;
  return await getTailoring(jobId, tailoringId);
}

export async function saveTailoredCVAction(jobId: string, tailoringId: string, cv: CVData) {
  const user = await requireUser();
  const t = await ownedTailoring(user.id, jobId, tailoringId);
  if (!t) return { ok: false as const, error: "Not found." };
  await run("UPDATE cv_tailorings SET tailored_content = ?, updated_at = ? WHERE id = ?", JSON.stringify(normalizeCV(cv)), now(), tailoringId);
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const };
}

/** Saves the current tailored CV as a new version (keeps the old one intact). */
export async function newTailoringVersionAction(jobId: string, fromId: string) {
  const user = await requireUser();
  const t = await ownedTailoring(user.id, jobId, fromId);
  if (!t) return { ok: false as const, error: "Not found." };
  const v = (await get<{ v: number }>("SELECT COALESCE(MAX(version), 0) AS v FROM cv_tailorings WHERE job_id = ?", jobId))?.v ?? 0;
  const id = uid("tl_");
  await run(
    "INSERT INTO cv_tailorings (id, job_id, source_cv_id, recommendations, tailored_content, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    id,
    jobId,
    t.source_cv_id,
    JSON.stringify(t.recommendations),
    t.tailored ? JSON.stringify(t.tailored) : null,
    v + 1,
    now(),
    now(),
  );
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const, id };
}

// ───────────────────────── application & interview ─────────────────────────

async function verifiedCV(userId: string, jobId: string): Promise<{ cv: CVData; tailoringId: string | null } | null> {
  const t = await getLatestTailoring(jobId);
  if (t?.tailored) return { cv: t.tailored, tailoringId: t.id };
  const cv = await getLatestCV(userId);
  return cv ? { cv: cv.parsed, tailoringId: null } : null;
}

async function upsertApplication(jobId: string, fields: Record<string, string | null>) {
  const exists = await get("SELECT 1 FROM applications WHERE job_id = ?", jobId);
  if (!exists) await run("INSERT INTO applications (job_id, created_at, updated_at) VALUES (?, ?, ?)", jobId, now(), now());
  const keys = Object.keys(fields);
  await run(
    `UPDATE applications SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE job_id = ?`,
    ...keys.map((k) => fields[k]),
    now(),
    jobId,
  );
}

export async function generateApplicationAction(jobId: string) {
  const user = await requireUser();
  const job = await getJob(user.id, jobId);
  const analysis = await getAnalysis(jobId);
  if (!job || !analysis) return { ok: false as const, error: "Analyse the job first." };
  const v = await verifiedCV(user.id, jobId);
  if (!v) return { ok: false as const, error: "Add your CV first so the application uses your real experience." };
  try {
    const draft = await generateApplication(job.raw_text, analysis.data, v.cv);
    await upsertApplication(jobId, {
      message_fi: draft.message_fi,
      message_en: draft.message_en,
      form_answers: JSON.stringify(draft.form_answers),
      tailoring_id: v.tailoringId,
    });
  } catch (e) {
    return { ok: false as const, error: friendly(e) };
  }
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const };
}

export async function saveApplicationAction(
  jobId: string,
  data: { message_fi: string; message_en: string; form_answers: { question: string; answer_fi: string; answer_en: string }[] },
) {
  const user = await requireUser();
  if (!await getJob(user.id, jobId)) return { ok: false as const, error: "Not found." };
  await upsertApplication(jobId, {
    message_fi: data.message_fi,
    message_en: data.message_en,
    form_answers: JSON.stringify(data.form_answers),
  });
  return { ok: true as const };
}

export async function generateInterviewAction(jobId: string) {
  const user = await requireUser();
  const job = await getJob(user.id, jobId);
  const analysis = await getAnalysis(jobId);
  if (!job || !analysis) return { ok: false as const, error: "Analyse the job first." };
  const v = await verifiedCV(user.id, jobId);
  if (!v) return { ok: false as const, error: "Add your CV first." };
  try {
    const prep = await generateInterview(job.raw_text, analysis.data, v.cv);
    await upsertApplication(jobId, { interview: JSON.stringify(prep) });
  } catch (e) {
    return { ok: false as const, error: friendly(e) };
  }
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const };
}

// ───────────────────────── tracker ─────────────────────────

export async function updateJobAction(
  jobId: string,
  patch: Partial<{ status: JobStatus; title: string; employer: string; location: string; deadline: string; applied_at: string; notes: string }>,
) {
  const user = await requireUser();
  const job = await getJob(user.id, jobId);
  if (!job) return { ok: false as const, error: "Not found." };
  if (patch.status && !JOB_STATUSES.includes(patch.status)) return { ok: false as const, error: "Invalid status." };
  const next = { ...patch };
  if (patch.status === "Applied" && !job.applied_at && !patch.applied_at) next.applied_at = new Date().toISOString().slice(0, 10);
  const keys = Object.keys(next) as (keyof typeof next)[];
  if (!keys.length) return { ok: true as const };
  await run(
    `UPDATE jobs SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
    ...keys.map((k) => (next[k] ?? null) as string | null),
    now(),
    jobId,
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteJobAction(jobId: string) {
  const user = await requireUser();
  if (!await getJob(user.id, jobId)) return { ok: false as const };
  await deleteUploads((await getJobImages(jobId)).map((im) => im.storage_key));
  await run("DELETE FROM jobs WHERE id = ? AND user_id = ?", jobId, user.id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function getApplicationSnapshot(jobId: string) {
  const user = await requireUser();
  if (!await getJob(user.id, jobId)) return null;
  return await getApplication(jobId);
}

// ───────────────────────── one-click rewrite flow ─────────────────────────

async function setMeta(tailoringId: string, meta: object) {
  await run("UPDATE cv_tailorings SET meta = ?, updated_at = ? WHERE id = ?", JSON.stringify(meta), now(), tailoringId);
}

/** Rewrites the whole CV for this job as a NEW version (earlier versions are kept). */
export async function rewriteCVAction(jobId: string, format: CVFormat) {
  const user = await requireUser();
  const job = await getJob(user.id, jobId);
  const analysis = await getAnalysis(jobId);
  if (!job || !analysis) return { ok: false as const, error: "Analyse the job first." };
  const cvRec = await getLatestCV(user.id);
  if (!cvRec) return { ok: false as const, error: "Add your CV first." };
  const prev = await getLatestTailoring(jobId);
  let out;
  try {
    out = await rewriteCV(job.raw_text, analysis.data, { ...cvRec.parsed, photo: cvRec.parsed.photo ?? prev?.tailored?.photo, design: prev?.tailored?.design }, await getProfile(user.id), format);
  } catch (e) {
    return { ok: false as const, error: friendly(e) };
  }
  if (!out.cv.interests?.length && prev?.tailored?.interests?.length) out.cv.interests = prev.tailored.interests;
  const v = (await get<{ v: number }>("SELECT COALESCE(MAX(version), 0) AS v FROM cv_tailorings WHERE job_id = ?", jobId))?.v ?? 0;
  const id = uid("tl_");
  await run(
    "INSERT INTO cv_tailorings (id, job_id, source_cv_id, recommendations, tailored_content, meta, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    id,
    jobId,
    cvRec.id,
    JSON.stringify(prev?.recommendations ?? []),
    JSON.stringify(out.cv),
    JSON.stringify({ approved: false, flags: out.flags, format, note: out.note }),
    v + 1,
    now(),
    now(),
  );
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const, id };
}

export async function approveCVAction(jobId: string, tailoringId: string) {
  const user = await requireUser();
  const t = await ownedTailoring(user.id, jobId, tailoringId);
  if (!t) return { ok: false as const, error: "Not found." };
  await setMeta(tailoringId, { ...t.meta, approved: true });
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const };
}

export async function condenseCVAction(jobId: string, tailoringId: string) {
  const user = await requireUser();
  const t = await ownedTailoring(user.id, jobId, tailoringId);
  if (!t?.tailored) return { ok: false as const, error: "Not found." };
  const { cv, changes } = condenseCV(t.tailored);
  await run("UPDATE cv_tailorings SET tailored_content = ?, updated_at = ? WHERE id = ?", JSON.stringify(cv), now(), tailoringId);
  revalidatePath(`/jobs/${jobId}`, "layout");
  return { ok: true as const, changes };
}
