"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationsBell from "./NotificationsBell";
import { APP_NAV_GROUP_LABELS, buildBreadcrumbs, matchNavItem } from "./navConfig";

export default function Topbar({ onMenuToggle, userRole }: { onMenuToggle: () => void; userRole?: string }) {
  const pathname = usePathname();
  const isOperator = userRole === "operator" || userRole === "admin";
  const crumbs = buildBreadcrumbs(pathname, isOperator);
  const current = matchNavItem(pathname, isOperator);

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.04] bg-[#070e17]/95 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-[#4a5568] transition-colors hover:text-white lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Mobile logo */}
        <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-4 brightness-0 invert opacity-80 lg:hidden" />

        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-2">
            {current ? (
              <>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#2b59ff]">
                  {APP_NAV_GROUP_LABELS[current.group]}
                </span>
                <p className="truncate text-[12px] text-[#4a5568]">{current.description}</p>
              </>
            ) : (
              <p className="truncate text-[12px] text-[#4a5568]">Sistema operativo de importaciones.</p>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[13px]">
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[#333d4d]">/</span>}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium text-white">{c.label}</span>
                ) : (
                  <Link href={c.href} className="text-[#4a5568] transition-colors hover:text-[#94a3b8]">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search — desktop only */}
        <div className="hidden items-center gap-2 rounded-lg border border-white/[0.04] bg-[#0B1622] px-3 py-1.5 md:flex">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[12px] text-[#4a5568]">Buscar...</span>
          <kbd className="ml-4 rounded border border-white/[0.06] bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-[#4a5568]">⌘K</kbd>
        </div>

        {/* New operation CTA */}
        <Link
          href="/app/nueva"
          className="flex items-center gap-1.5 rounded-lg bg-[#2b59ff] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#2348d4]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Nueva operacion</span>
        </Link>

        <NotificationsBell />
      </div>
    </header>
  );
}
