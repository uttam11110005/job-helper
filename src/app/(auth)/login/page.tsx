import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="mt-1 mb-6 text-[15px] text-muted">Log in to continue your applications.</p>
      <LoginForm next={next} />
    </>
  );
}
