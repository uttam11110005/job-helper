import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path d="M11.5 7v18M6 14h20" stroke="var(--primary-ink)" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="22.5" cy="21.5" r="4.5" fill="var(--primary-ink)" />
      <path d="m20.6 21.6 1.4 1.4 2.6-2.8" fill="none" stroke="var(--primary)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg" aria-label="Job Helper home">
      <LogoMark />
      <span className="font-display text-[17px] font-semibold tracking-tight whitespace-nowrap">
        Job <span className="text-primary">Helper</span>
      </span>
    </Link>
  );
}
