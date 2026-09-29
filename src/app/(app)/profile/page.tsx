import Link from "next/link";
import { FileUser } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getLatestCV, getProfile, listCVs } from "@/lib/repo";
import { Card, CardHeader, PageHeader, cx } from "@/components/ui";
import { CVUploader } from "@/components/cv-uploader";
import { CVPreview } from "@/components/cv-preview";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "My CV & profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "cv" } = await searchParams;
  const user = await requireUser();
  const cv = await getLatestCV(user.id);
  const versions = await listCVs(user.id);
  const profile = await getProfile(user.id);

  return (
    <>
      <PageHeader title="My CV & profile" description="Your original CV is the source of truth. Job-specific versions are saved separately and never overwrite it." />
      <div role="tablist" className="mb-6 flex gap-1 border-b border-line">
        {[["cv", "CV"], ["profile", "Profile"]].map(([k, label]) => (
          <Link
            key={k}
            role="tab"
            aria-selected={tab === k}
            href={`/profile?tab=${k}`}
            className={cx("-mb-px border-b-2 px-4 py-2.5 text-sm font-medium", tab === k ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink")}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "profile" ? (
        <Card className="p-5 sm:p-6">
          <ProfileForm initial={profile} cv={cv?.parsed ?? null} />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-6">
            {cv && (
              <details className="group rounded-2xl border border-line bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                  <FileUser className="size-5 text-primary" aria-hidden />
                  <span className="flex-1">
                    <span className="block font-semibold">Upload a new version</span>
                    <span className="block text-sm text-muted">Saved as a new version; earlier ones are kept.</span>
                  </span>
                  <span className="text-xl leading-none text-muted transition-transform duration-200 ease-[var(--ease-out)] group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <div className="border-t border-line p-5"><CVUploader /></div>
              </details>
            )}
            {cv ? (
              <div className="overflow-hidden rounded-2xl border border-line">
                <CVPreview cv={cv.parsed} />
              </div>
            ) : (
              <Card className="p-5 sm:p-6">
                <h2 className="mb-4 text-lg font-semibold">Add your CV</h2>
                <CVUploader />
              </Card>
            )}
          </div>
          <div className="space-y-6">
            {versions.length > 0 && (
              <Card>
                <CardHeader title="Versions" />
                <ul className="divide-y divide-line">
                  {versions.map((v) => (
                    <li key={v.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="font-medium">v{v.version}{v.id === cv?.id && <span className="ml-2 text-xs font-normal text-primary">current</span>}</span>
                      <span className="truncate pl-3 text-muted">{v.source_file ?? "pasted"} · {new Date(v.created_at).toLocaleDateString("en-GB")}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
