import type { Analysis, FitStatus } from "./types";

export const FIT_LABEL: Record<FitStatus, string> = {
  match: "Match",
  partial: "Partial",
  missing: "Missing",
  unknown: "Unknown",
};

export const FIT_MEANING: Record<FitStatus, string> = {
  match: "Direct evidence satisfies the requirement.",
  partial: "Related evidence exists but something is incomplete.",
  missing: "Explicit requirement is not supported by your profile/CV.",
  unknown: "Insufficient information to assess.",
};

export function fitCounts(a: Analysis) {
  const c: Record<FitStatus, number> = { match: 0, partial: 0, missing: 0, unknown: 0 };
  for (const r of a.requirements) c[r.status]++;
  for (const l of a.languages) c[l.status]++;
  return c;
}

/**
 * Job match % — guidance only, NOT a hiring prediction (BRD §11).
 * Required items (mandatory + unspecified requirements, required languages) count 80%,
 * nice-to-haves (preferred requirements and languages) 20%. Match = 1, Partial = ½,
 * Missing = 0; Unknown (e.g. personality traits) is left out.
 */
export function guidanceIndicator(a: Analysis): number | null {
  const required: FitStatus[] = [
    ...a.requirements.filter((r) => r.category !== "preferred").map((r) => r.status),
    ...a.languages.filter((l) => l.mandatory).map((l) => l.status),
  ].filter((s) => s !== "unknown");
  const preferred: FitStatus[] = [
    ...a.requirements.filter((r) => r.category === "preferred").map((r) => r.status),
    ...a.languages.filter((l) => !l.mandatory).map((l) => l.status),
  ].filter((s) => s !== "unknown");
  const coverage = (xs: FitStatus[]) => xs.reduce((sum, s) => sum + (s === "match" ? 1 : s === "partial" ? 0.5 : 0), 0) / xs.length;
  if (!required.length && !preferred.length) return null;
  const value = !preferred.length ? coverage(required) : !required.length ? coverage(preferred) : 0.8 * coverage(required) + 0.2 * coverage(preferred);
  return Math.round(value * 100);
}
