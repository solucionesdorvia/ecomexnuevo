"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationsBell from "./NotificationsBell";
import { APP_NAV_GROUP_LABELS, buildBreadcrumbs, matchNavItem } from "./navConfig";

export default function Topbar({
  onMenuToggle,
  userRole,
  mobileNavOpen = false,
}: {
  onMenuToggle: () => void;
  userRole?: string;
  mobileNavOpen?: boolean;
}) {
  const pathname = usePathname();
  const isOperator = userRole === "operator" || userRole === "admin";
  const crumbs = buildBreadcrumbs(pathname, isOperator);
  const current = matchNavItem(pathname, isOperator);
  const mobileTitle = crumbs.length > 0 ? crumbs[crumbs.length - 1]?.label ?? "App" : "App";

  return (
    <header className="sticky top-0 z-20 flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/[0.04] bg-[#070e17]/95 px-3 pb-2.5 pt-safe backdrop-blur sm:px-4 lg:min-h-16 lg:px-6 lg:pb-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#4a5568] transition-colors hover:bg-white/[0.04] hover:text-white lg:hidden"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0 flex-1 lg:flex-none">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            <img src="/brand/ecomex-logo.png" alt="" className="h-4 w-auto shrink-0 brightness-0 invert opacity-80" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">{mobileTitle}</p>
              {current?.description ? (
                <p className="truncate text-[10px] text-[#4a5568]">{current.description}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 lg:block">
          <div className="flex items-center gap-2">
            {current ? (
              <>
                <span className="rounded-full border border-[#18C3D6]/20 bg-[#18C3D6]/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#18C3D6]">
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

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* New operation CTA */}
        <Link
          href="/app/nueva"
          aria-label="Crear nueva operación"
          className="flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#18C3D6] px-2.5 text-[12px] font-semibold text-[#030d18] transition-colors hover:bg-[#0ea5b9] sm:h-9 sm:min-w-0 sm:px-3"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Nueva operación</span>
        </Link>

        <NotificationsBell />
      </div>
    </header>
  );
}
