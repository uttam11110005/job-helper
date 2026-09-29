"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { get, run, now, uid } from "@/lib/db";
import { extractCVText } from "@/lib/extract";
import { normalizeCV, parseCV } from "@/lib/ai/engine";
import type { CVData, Profile } from "@/lib/types";

const MAX_CV_BYTES = 4 * 1024 * 1024; // hosting request limit is 4.5 MB

export type ParseResult =
  | { ok: true; parsed: CVData; rawText: string; sourceFile: string | null; sourceType: "file" | "text" }
  | { ok: false; error: string };

/** Extracts + parses a CV for the user to review. Nothing is saved yet. */
export async function parseCVAction(form: FormData): Promise<ParseResult> {
  await requireUser();
  try {
    const file = form.get("file");
    let text = String(form.get("text") ?? "");
    let sourceFile: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_CV_BYTES) return { ok: false, error: "File is larger than 4 MB. Save it as a smaller PDF, or paste the CV text instead." };
      text = await extractCVText(file);
      sourceFile = file.name;
    }
    if (text.trim().length < 50) {
      return { ok: false, error: "We couldn't find enough text. If your PDF is a scanned image, paste the CV text instead." };
    }
    const parsed = await parseCV(text);
    return { ok: true, parsed, rawText: text, sourceFile, sourceType: sourceFile ? "file" : "text" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read this CV." };
  }
}

/** Saves a reviewed CV as a NEW version. Earlier versions are never overwritten. */
export async function saveCVAction(input: {
  parsed: CVData;
  rawText: string;
  sourceFile: string | null;
  sourceType: string;
}) {
  const user = await requireUser();
  const last = await get<{ v: number }>("SELECT COALESCE(MAX(version), 0) AS v FROM cvs WHERE user_id = ?", user.id);
  const id = uid("cv_");
  await run(
    "INSERT INTO cvs (id, user_id, source_file, source_type, raw_text, parsed_content, version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    id,
    user.id,
    input.sourceFile,
    input.sourceType,
    input.rawText,
    JSON.stringify(normalizeCV(input.parsed)),
    (last?.v ?? 0) + 1,
    now(),
  );
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function saveProfileAction(profile: Profile) {
  const user = await requireUser();
  await run(
    `INSERT INTO profiles (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    user.id,
    JSON.stringify(profile),
    now(),
  );
  revalidatePath("/profile");
  return { ok: true };
}
