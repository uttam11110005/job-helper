import Link from "next/link";
import { FileWarning } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUsage } from "@/lib/billing";
import { getLatestCV } from "@/lib/repo";
import { Card, Notice, PageHeader } from "@/components/ui";
import { JobInput } from "@/components/job-input";
import { UpgradePanel } from "@/components/upgrade";

export const metadata = { title: "Add a job" };

export default async function NewJob() {
  const user = await requireUser();
  const usage = await getUsage(user.id);
  const cv = await getLatestCV(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add a job ad"
        description="Paste the advertisement or upload screenshots of it. Text and screenshots go through the same analysis."
      />
      {!usage.canAnalyze ? (
        <Card className="mx-auto max-w-md p-6 sm:p-8"><UpgradePanel /></Card>
      ) : (
        <>
          {!cv && (
            <Notice tone="warn" icon={<FileWarning className="size-4" />} className="mb-5">
              You haven&apos;t added a CV yet, so we can explain the job but can&apos;t check your fit or tailor your CV.{" "}
              <Link href="/onboarding" className="font-semibold underline underline-offset-2">Add your CV first</Link>.
            </Notice>
          )}
          <Card className="p-5 sm:p-6"><JobInput /></Card>
        </>
      )}
    </div>
  );
}
