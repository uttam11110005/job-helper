import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { get, run, now, uid, tx } from "./db";

const COOKIE = "fjh_session";
const SESSION_DAYS = 30;

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await run("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", token, userId, expires.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function signUp(name: string, email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (await get("SELECT id FROM users WHERE email = ?", normalized)) {
    return { error: "An account with this email already exists." };
  }
  const id = uid("u_");
  await tx(async () => {
    await run(
      "INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
      id,
      name.trim(),
      normalized,
      hashPassword(password),
      now(),
    );
    await run("INSERT INTO usage (user_id) VALUES (?)", id);
  });
  await startSession(id);
  return { ok: true as const };
}

export async function signIn(email: string, password: string) {
  const row = await get<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = ?",
    email.trim().toLowerCase(),
  );
  if (!row || !verifyPassword(password, row.password_hash)) {
    return { error: "Email or password is incorrect." };
  }
  await startSession(row.id);
  return { ok: true as const };
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token = ?", token);
  store.delete(COOKIE);
}

export const currentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await get<User & { expires_at: string }>(
    `SELECT u.id, u.name, u.email, u.created_at, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    token,
  );
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return { id: row.id, name: row.name, email: row.email, created_at: row.created_at };
});

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
