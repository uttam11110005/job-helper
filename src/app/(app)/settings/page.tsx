import Link from "next/link";
import { Download, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { engine } from "@/lib/ai/engine";
import { providerLabel } from "@/lib/ai/openai";
import { Card, CardHeader, PageHeader, buttonClass } from "@/components/ui";
import { DeleteAccount } from "@/components/delete-account";

export const metadata = { title: "Settings & privacy" };

export default async function Settings() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings & privacy" />
      <Card>
        <CardHeader title="Account" icon={<UserRound className="size-5" />} />
        <dl className="grid gap-4 p-5 text-sm sm:grid-cols-3 sm:p-6">
          <div><dt className="text-muted">Name</dt><dd className="mt-0.5 font-medium">{user.name}</dd></div>
          <div><dt className="text-muted">Email</dt><dd className="mt-0.5 font-medium break-all">{user.email}</dd></div>
          <div><dt className="text-muted">Member since</dt><dd className="mt-0.5 font-medium">{new Date(user.created_at).toLocaleDateString("en-GB")}</dd></div>
        </dl>
      </Card>
      <Card>
        <CardHeader title="How your data is used" icon={<ShieldCheck className="size-5" />} />
        <ul className="list-disc space-y-1.5 py-5 pr-6 pl-10 text-[15px] text-ink-2">
          <li>Your CV, screenshots and job ads are personal data, used only to produce your analyses and documents.</li>
          <li>
            AI processing: {engine() === "ai" ? <>content is sent to {providerLabel()} to generate results.</> : <>currently <strong>offline demo mode</strong> — nothing leaves this server (screenshot OCR runs in your browser).</>}
          </li>
          <li>We never sell CVs or application content.</li>
          <li>Data is kept until you delete it. <Link href="/privacy" className="font-medium text-primary hover:underline">Read the privacy notice</Link>.</li>
        </ul>
      </Card>
      <Card>
        <CardHeader title="Export my data" icon={<Download className="size-5" />} description="Download everything we store about you as JSON." />
        <div className="p-5 sm:p-6">
          <a href="/api/account/export" className={buttonClass("secondary")}><Download className="size-4" aria-hidden /> Download my data</a>
        </div>
      </Card>
      <Card className="border-missing/30">
        <CardHeader title="Delete account" icon={<Trash2 className="size-5 text-missing" />} description="Permanently remove your account and all data." />
        <div className="p-5 sm:p-6"><DeleteAccount email={user.email} /></div>
      </Card>
    </div>
  );
}
