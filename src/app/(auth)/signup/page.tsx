import { SignupForm } from "@/components/auth-forms";

export const metadata = { title: "Create account" };

export default function Signup() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Create your free account</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted">3 complete job analyses included. No card needed.</p>
      <SignupForm />
    </>
  );
}
