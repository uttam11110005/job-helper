"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, FileUser, KanbanSquare, LayoutDashboard, LogOut, Plus, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import { cx } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs/new", label: "New job", icon: Plus },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/profile", label: "My CV", icon: FileUser },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function isActive(path: string, href: string) {
  if (href === "/jobs/new") return path === "/jobs/new";
  if (href === "/tracker") return path.startsWith("/tracker") || (path.startsWith("/jobs/") && path !== "/jobs/new");
  return path.startsWith(href);
}

export function DesktopNav() {
  const path = usePathname();
  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
      {NAV.map((n) => {
        const active = isActive(path, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "pressable flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium",
              active ? "bg-primary-soft text-primary-soft-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
            )}
          >
            <n.icon className="size-4" aria-hidden />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV.map((n) => {
          const active = isActive(path, n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cx("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active ? "text-primary" : "text-muted")}
              >
                <n.icon className="size-5" aria-hidden />
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="pressable grid size-9 cursor-pointer place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-ink"
      >
        {initials || <UserRound className="size-4" />}
      </button>
      <div
        role="menu"
        data-open={open}
        inert={!open}
        className="absolute right-0 top-11 z-50 w-60 origin-top-right rounded-xl border border-line bg-card p-1.5 shadow-float transition-[opacity,transform] duration-150 ease-[var(--ease-out)] data-[open=false]:pointer-events-none data-[open=false]:scale-[0.97] data-[open=false]:opacity-0"
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <div className="my-1 h-px bg-line" />
        <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-sunken">
          <Settings className="size-4 text-muted" aria-hidden /> Settings & privacy
        </Link>
        <form action={logoutAction}>
          <button role="menuitem" className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-sunken">
            <LogOut className="size-4 text-muted" aria-hidden /> Log out
          </button>
        </form>
      </div>
    </div>
  );
}
