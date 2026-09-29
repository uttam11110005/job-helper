import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await currentUser()) redirect("/dashboard");
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-10">
      <Logo />
      <div className="enter mt-10 w-full max-w-[420px] rounded-2xl border border-line bg-card p-6 shadow-soft sm:p-8">{children}</div>
    </div>
  );
}
