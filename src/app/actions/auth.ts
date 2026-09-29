"use server";

import { redirect } from "next/navigation";
import { signIn, signOut, signUp } from "@/lib/auth";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

export async function signupAction(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const consent = form.get("consent") === "on";
  const fields = { name, email };
  if (name.length < 2) return { error: "Please enter your name.", fields };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address.", fields };
  if (password.length < 8) return { error: "Password must be at least 8 characters.", fields };
  if (!consent) return { error: "Please accept the privacy notice to continue.", fields };
  const r = await signUp(name, email, password);
  if ("error" in r) return { error: r.error, fields };
  redirect("/onboarding");
}

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const r = await signIn(email, password);
  if ("error" in r) return { error: r.error, fields: { email } };
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}
