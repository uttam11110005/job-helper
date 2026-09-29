import { currentUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { readUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_: Request, ctx: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await ctx.params;
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const row = await get<{ storage_key: string }>(
    `SELECT i.storage_key FROM job_images i JOIN jobs j ON j.id = i.job_id
     WHERE i.id = ? AND j.id = ? AND j.user_id = ?`,
    imageId,
    id,
    user.id,
  );
  if (!row) return new Response("Not found", { status: 404 });
  const buf = await readUpload(row.storage_key);
  if (!buf) return new Response("Not found", { status: 404 });
  const ext = row.storage_key.split(".").pop()?.toLowerCase().replace(/-.*$/, "") ?? "";
  return new Response(new Uint8Array(buf), {
    headers: { "Content-Type": TYPES[ext] ?? "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
