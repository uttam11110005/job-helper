import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { CircleCheck, CircleDashed, CircleHelp, CircleX, LoaderCircle } from "lucide-react";
import type { FitStatus } from "@/lib/types";
import { FIT_LABEL, FIT_MEANING } from "@/lib/fit";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ───────── Buttons ─────────

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:bg-primary-hover shadow-sm",
  secondary: "bg-card text-ink border border-line hover:border-line-strong hover:bg-sunken",
  soft: "bg-primary-soft text-primary-soft-ink hover:brightness-[0.97]",
  ghost: "text-ink-2 hover:bg-sunken hover:text-ink",
  danger: "bg-missing text-white hover:brightness-110 dark:text-[#1a0606]",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[15px] gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(
    "pressable inline-flex items-center justify-center font-medium whitespace-nowrap cursor-pointer select-none",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <LoaderCircle className="size-4 spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

// ───────── Surfaces ─────────

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cx("rounded-2xl border border-line bg-card", className)} {...rest} />;
}

export function CardHeader({ title, description, action, icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
      <div className="flex min-w-0 gap-3">
        {icon && <div className="mt-0.5 text-primary">{icon}</div>}
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-sm font-medium text-primary">{eyebrow}</div>}
        <h1 className="text-[28px] font-semibold sm:text-[32px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ───────── Badges ─────────

const FIT_STYLE: Record<FitStatus, string> = {
  match: "bg-match-bg text-match",
  partial: "bg-partial-bg text-partial",
  missing: "bg-missing-bg text-missing",
  unknown: "bg-unknown-bg text-unknown",
};
const FIT_ICON: Record<FitStatus, typeof CircleCheck> = {
  match: CircleCheck,
  partial: CircleDashed,
  missing: CircleX,
  unknown: CircleHelp,
};

export function FitBadge({ status, className }: { status: FitStatus; className?: string }) {
  const Icon = FIT_ICON[status];
  return (
    <span
      title={FIT_MEANING[status]}
      className={cx("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold", FIT_STYLE[status], className)}
    >
      <Icon className="size-3.5" aria-hidden />
      {FIT_LABEL[status]}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "primary" | FitStatus; className?: string }) {
  const style =
    tone === "neutral" ? "bg-sunken text-ink-2 border border-line" : tone === "primary" ? "bg-primary-soft text-primary-soft-ink" : FIT_STYLE[tone];
  return <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", style, className)}>{children}</span>;
}

// ───────── Form fields ─────────

const fieldBase =
  "w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cx(fieldBase, "py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cx(fieldBase, "h-11 cursor-pointer pr-8", className)} {...rest} />;
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-missing" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

// ───────── Misc ─────────

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-card px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="mt-1.5 max-w-md text-[15px] text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", icon, children, className }: { tone?: "info" | "warn" | "error" | "success"; icon?: ReactNode; children: ReactNode; className?: string }) {
  const style = {
    info: "bg-primary-soft text-primary-soft-ink",
    warn: "bg-partial-bg text-partial",
    error: "bg-missing-bg text-missing",
    success: "bg-match-bg text-match",
  }[tone];
  return (
    <div className={cx("flex gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed", style, className)} role={tone === "error" ? "alert" : undefined}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Progress({ value, className, label }: { value: number; className?: string; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("h-2 w-full overflow-hidden rounded-full bg-sunken", className)}
    >
      <div className="h-full rounded-full bg-primary transition-transform duration-500 ease-[var(--ease-out)] origin-left" style={{ transform: `scaleX(${value / 100})` }} />
    </div>
  );
}
