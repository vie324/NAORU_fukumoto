"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";

export interface NavLink {
  href: string;
  label: string;
}

export function NavBar({
  displayName,
  roleLabel,
  links,
}: {
  displayName: string;
  roleLabel: string;
  links: NavLink[];
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-base font-bold text-brand">
          トーク評価
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">
            {displayName}
            <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {roleLabel}
            </span>
          </span>
          <form action={logout}>
            <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">
              ログアウト
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
