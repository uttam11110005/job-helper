import { currentUser } from "@/lib/auth";
import { all, get } from "@/lib/db";

/** GDPR data portability: everything we hold about the user as JSON. */
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const parse = (rows: Record<string, unknown>[], keys: string[]) =>
    rows.map((r) => {
      const o = { ...r };
      for (const k of keys) if (typeof o[k] === "string") try { o[k] = JSON.parse(o[k] as string); } catch {}
      return o;
    });
  const jobIds = (await all<{ id: string }>("SELECT id FROM jobs WHERE user_id = ?", user.id)).map((j) => j.id);
  const inJobs = async (sql: string) => (await Promise.all(jobIds.map((id) => all(sql, id)))).flat();
  const data = {
    exported_at: new Date().toISOString(),
    user,
    profile: parse(await all("SELECT data, updated_at FROM profiles WHERE user_id = ?", user.id), ["data"])[0] ?? null,
    cvs: parse(await all("SELECT id, source_file, source_type, raw_text, parsed_content, version, created_at FROM cvs WHERE user_id = ?", user.id), ["parsed_content"]),
    jobs: await all("SELECT * FROM jobs WHERE user_id = ?", user.id),
    job_images: await inJobs("SELECT job_id, storage_key, sequence, ocr_text FROM job_images WHERE job_id = ?"),
    analyses: parse(await inJobs("SELECT job_id, data, engine, created_at FROM analyses WHERE job_id = ?"), ["data"]),
    cv_tailorings: parse(await inJobs("SELECT * FROM cv_tailorings WHERE job_id = ?"), ["recommendations", "tailored_content"]),
    applications: parse(await inJobs("SELECT * FROM applications WHERE job_id = ?"), ["form_answers", "interview"]),
    usage: await get("SELECT free_analyses_used, total_analyses, plan FROM usage WHERE user_id = ?", user.id),
    subscriptions: await all("SELECT plan, status, amount_cents, currency, card_last4, started_at, renewal_date, cancel_at_period_end, canceled_at FROM subscriptions WHERE user_id = ?", user.id),
    payments: await all("SELECT amount_cents, currency, description, paid_at FROM payments WHERE user_id = ?", user.id),
  };
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="job-helper-data.json"`,
    },
  });
}
