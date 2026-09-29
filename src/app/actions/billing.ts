"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { cancelSubscription, startProSubscription } from "@/lib/billing";

/**
 * Simulated checkout. The card form is test-mode only: we never receive or
 * store a full card number — only the last four digits for the receipt.
 * Swap this for Stripe Checkout + webhook in production.
 */
export async function checkoutAction(input: { last4: string; acceptedTerms: boolean }) {
  const user = await requireUser();
  if (!input.acceptedTerms) return { ok: false as const, error: "Please confirm the recurring subscription terms." };
  if (!/^\d{4}$/.test(input.last4)) return { ok: false as const, error: "Card details are incomplete." };
  await startProSubscription(user.id, input.last4);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function cancelSubscriptionAction() {
  const user = await requireUser();
  await cancelSubscription(user.id);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function resumeSubscriptionAction() {
  const user = await requireUser();
  await startProSubscription(user.id, "0000");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
