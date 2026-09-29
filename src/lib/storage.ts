import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./db";

// Uploaded job-ad screenshots are personal data.
//   - Vercel: private Vercel Blob store (BLOB_READ_WRITE_TOKEN) — never publicly reachable;
//     files are streamed to the owner through an authenticated route.
//   - Local: data/uploads.
// The stored key is either "blob:<pathname>" or a relative local path.

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

export async function saveUpload(key: string, data: Buffer, contentType: string): Promise<string> {
  if (useBlob()) {
    const { put } = await import("@vercel/blob");
    const res = await put(key, data, { access: "private", contentType, addRandomSuffix: true });
    return `blob:${res.pathname}`;
  }
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
  return key;
}

export async function readUpload(storageKey: string): Promise<Buffer | null> {
  if (storageKey.startsWith("blob:")) {
    const { get } = await import("@vercel/blob");
    const res = await get(storageKey.slice(5), { access: "private" });
    if (!res?.stream) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  const file = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storageKey);
  if (!file.startsWith(UPLOAD_DIR)) return null;
  return fs.readFile(file).catch(() => null);
}

export async function deleteUploads(storageKeys: string[]) {
  const blobs = storageKeys.filter((k) => k.startsWith("blob:")).map((k) => k.slice(5));
  if (blobs.length) {
    const { del } = await import("@vercel/blob");
    await del(blobs).catch(() => undefined);
  }
  for (const k of storageKeys.filter((k) => !k.startsWith("blob:"))) {
    await fs.rm(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, k), { force: true }).catch(() => undefined);
  }
}
