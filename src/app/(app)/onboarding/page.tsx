import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLatestCV } from "@/lib/repo";
import { CVUploader } from "@/components/cv-uploader";
import { Card } from "@/components/ui";

export const metadata = { title: "Welcome" };

export default async function Onboarding() {
  const user = await requireUser();
  if (await getLatestCV(user.id)) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-8 flex items-center gap-3 text-sm" aria-label="Setup progress">
        <li className="flex items-center gap-2 font-medium text-primary">
          <span className="grid size-6 place-items-center rounded-full bg-primary text-xs text-primary-ink">1</span> Your CV
        </li>
        <li className="h-px w-8 bg-line-strong" aria-hidden />
        <li className="flex items-center gap-2 text-muted">
          <span className="grid size-6 place-items-center rounded-full bg-sunken text-xs">2</span> Add a job
        </li>
      </ol>
      <h1 className="text-[28px] font-semibold sm:text-[32px]">Hi {user.name.split(" ")[0]}, let&apos;s start with your CV</h1>
      <p className="mt-2 mb-8 text-[15px] text-muted">
        We compare every job ad against your real experience. Upload your current CV — any language, any format.
      </p>
      <Card className="p-5 sm:p-6">
        <CVUploader redirectTo="/jobs/new" />
      </Card>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/dashboard" className="underline-offset-4 hover:text-ink hover:underline">Skip for now</Link> — you can add it later.
      </p>
    </div>
  );
}
