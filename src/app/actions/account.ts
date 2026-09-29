"use server";

import { redirect } from "next/navigation";
import { requireUser, signOut } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { deleteUploads } from "@/lib/storage";

/** Permanently deletes the account and every related record and file (GDPR erasure). */
export async function deleteAccountAction(confirmation: string) {
  const user = await requireUser();
  if (confirmation.trim().toLowerCase() !== user.email) {
    return { ok: false as const, error: "Type your email address exactly to confirm." };
  }
  const images = await all<{ storage_key: string }>(
    "SELECT i.storage_key FROM job_images i JOIN jobs j ON j.id = i.job_id WHERE j.user_id = ?",
    user.id,
  );
  await deleteUploads(images.map((i) => i.storage_key));
  await run("DELETE FROM users WHERE id = ?", user.id); // cascades to all user data
  await signOut();
  redirect("/?deleted=1");
}
