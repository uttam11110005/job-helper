"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { Button, Field, Input, Notice } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>Log in</Button>
      <p className="text-center text-sm text-muted">
        New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create a free account</Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Full name" htmlFor="name">
        <Input id="name" name="name" autoComplete="name" required defaultValue={state?.fields?.name} />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <label className="flex cursor-pointer gap-3 text-sm text-ink-2">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
        <span>
          I agree that my CV and job data are processed to provide this service, as described in the{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">privacy notice</Link>.
        </span>
      </label>
      <Button type="submit" className="w-full" loading={pending}>Create account</Button>
      <p className="text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Log in</Link>
      </p>
    </form>
  );
}
