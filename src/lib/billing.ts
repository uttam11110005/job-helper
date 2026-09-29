import "server-only";
import { get, all, run, now, uid, tx } from "./db";

export const FREE_LIMIT = 3;
export const PRO_PRICE_CENTS = 599;
export const CURRENCY = "EUR";
export const PRO_PRICE_LABEL = "€5.99";

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  payment_customer_id: string;
  subscription_id: string;
  status: "active" | "canceled";
  amount_cents: number;
  currency: string;
  card_last4: string | null;
  started_at: string;
  renewal_date: string;
  cancel_at_period_end: number;
  canceled_at: string | null;
}

export interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  description: string;
  paid_at: string;
}

export interface UsageState {
  used: number;
  remaining: number;
  total: number;
  isPro: boolean;
  canAnalyze: boolean;
  subscription: Subscription | null;
}

function addMonth(iso: string) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/**
 * Returns the user's current subscription, advancing the simulated billing
 * clock: an active, non-cancelled subscription whose period has ended is
 * renewed (and a payment recorded); a cancelled one lapses.
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const sub = await get<Subscription>(
    "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
    userId,
  );
  if (!sub) return null;
  if (sub.status === "active" && new Date(sub.renewal_date) <= new Date()) {
    if (sub.cancel_at_period_end) {
      await run("UPDATE subscriptions SET status = 'canceled' WHERE id = ?", sub.id);
      await run("UPDATE usage SET plan = 'free' WHERE user_id = ?", userId);
      return { ...sub, status: "canceled" };
    }
    let renewal = sub.renewal_date;
    while (new Date(renewal) <= new Date()) {
      await run(
        "INSERT INTO payments (id, user_id, subscription_id, amount_cents, currency, description, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        uid("pay_"),
        userId,
        sub.subscription_id,
        sub.amount_cents,
        sub.currency,
        "Job Helper Pro — monthly renewal",
        renewal,
      );
      renewal = addMonth(renewal);
    }
    await run("UPDATE subscriptions SET renewal_date = ? WHERE id = ?", renewal, sub.id);
    return { ...sub, renewal_date: renewal };
  }
  return sub;
}

export async function getUsage(userId: string): Promise<UsageState> {
  const u = (await get<{ free_analyses_used: number; total_analyses: number }>(
    "SELECT free_analyses_used, total_analyses FROM usage WHERE user_id = ?",
    userId,
  )) ?? { free_analyses_used: 0, total_analyses: 0 };
  const subscription = await getSubscription(userId);
  const isPro = subscription?.status === "active";
  const used = Math.min(u.free_analyses_used, FREE_LIMIT);
  const remaining = FREE_LIMIT - used;
  return {
    used,
    remaining,
    total: u.total_analyses,
    isPro,
    canAnalyze: isPro || remaining > 0,
    subscription,
  };
}

/** One submitted job = one analysis (BRD §14.1). Called once per job. */
export async function consumeAnalysis(userId: string) {
  const usage = await getUsage(userId);
  if (!usage.canAnalyze) throw new Error("FREE_LIMIT_REACHED");
  if (usage.isPro) {
    await run("UPDATE usage SET total_analyses = total_analyses + 1 WHERE user_id = ?", userId);
  } else {
    await run(
      "UPDATE usage SET free_analyses_used = free_analyses_used + 1, total_analyses = total_analyses + 1 WHERE user_id = ?",
      userId,
    );
  }
}

export async function listPayments(userId: string): Promise<Payment[]> {
  return all<Payment>(
    "SELECT id, amount_cents, currency, description, paid_at FROM payments WHERE user_id = ? ORDER BY paid_at DESC",
    userId,
  );
}

/**
 * Simulated payment provider. In production this is replaced by Stripe
 * Checkout + a webhook that writes the same rows.
 */
export async function startProSubscription(userId: string, cardLast4: string) {
  const existing = await getSubscription(userId);
  if (existing?.status === "active") {
    // Resuming a subscription scheduled to cancel: no new charge.
    await run("UPDATE subscriptions SET cancel_at_period_end = 0, canceled_at = NULL WHERE id = ?", existing.id);
    return existing.id;
  }
  const paidAt = now();
  const subId = uid("sub_");
  await tx(async () => {
    await run(
      `INSERT INTO subscriptions (id, user_id, plan, payment_customer_id, subscription_id, status, amount_cents, currency, card_last4, started_at, renewal_date)
       VALUES (?, ?, 'pro', ?, ?, 'active', ?, ?, ?, ?, ?)`,
      uid("s_"),
      userId,
      uid("cus_"),
      subId,
      PRO_PRICE_CENTS,
      CURRENCY,
      cardLast4,
      paidAt,
      addMonth(paidAt),
    );
    await run(
      "INSERT INTO payments (id, user_id, subscription_id, amount_cents, currency, description, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      uid("pay_"),
      userId,
      subId,
      PRO_PRICE_CENTS,
      CURRENCY,
      "Job Helper Pro — first month",
      paidAt,
    );
    await run("UPDATE usage SET plan = 'pro' WHERE user_id = ?", userId);
  });
  return subId;
}

export async function cancelSubscription(userId: string) {
  const sub = await getSubscription(userId);
  if (!sub || sub.status !== "active") return;
  await run("UPDATE subscriptions SET cancel_at_period_end = 1, canceled_at = ? WHERE id = ?", now(), sub.id);
}

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
