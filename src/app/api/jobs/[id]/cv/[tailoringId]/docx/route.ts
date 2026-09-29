import { currentUser } from "@/lib/auth";
import { cvToDocx } from "@/lib/docx";
import { getJob, getTailoring } from "@/lib/repo";

export async function GET(_: Request, ctx: { params: Promise<{ id: string; tailoringId: string }> }) {
  const { id, tailoringId } = await ctx.params;
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const job = await getJob(user.id, id);
  const t = job ? await getTailoring(id, tailoringId) : null;
  if (!job || !t?.tailored) return new Response("Not found", { status: 404 });
  const buf = await cvToDocx(t.tailored);
  const slug = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  const filename = `CV_${slug(t.tailored.name || "applicant")}_${slug(job.title || "job")}_v${t.version}.docx`;
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
