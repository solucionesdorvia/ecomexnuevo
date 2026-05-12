"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV_GROUP_LABELS, APP_NAV_ITEMS, type AppNavItem } from "./navConfig";

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function SidebarContent({ userEmail, userRole, onNavigate }: { userEmail?: string; userRole?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isOperator = userRole === "operator" || userRole === "admin";
  const items = APP_NAV_ITEMS.filter((item) => (item.operatorOnly ? isOperator : true));
  const groups: AppNavItem["group"][] = ["core", "operations", "intelligence", "workspace"];

  return (
    <>
      <div className="flex h-14 items-center border-b border-white/[0.04] px-5 pt-safe">
        <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert opacity-90" />
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
        <div className="space-y-5">
          {groups.map((groupKey) => {
            const groupItems = items.filter((item) => item.group === groupKey);
            if (groupItems.length === 0) return null;
            return (
              <section key={groupKey}>
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4a5568]">
                  {APP_NAV_GROUP_LABELS[groupKey]}
                </p>
                <div className="mt-2 space-y-0.5">
                  {groupItems.map((item) => {
                    const active = item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-150 ${
                          active
                            ? "-ml-px border-l-2 border-[#18C3D6] bg-[#18C3D6]/[0.08] font-medium text-white"
                            : item.primary
                              ? "text-[#18C3D6] hover:bg-[#18C3D6]/[0.05]"
                              : "text-[#4a5568] hover:bg-white/[0.02] hover:text-[#94a3b8]"
                        }`}
                      >
                        <NavIcon d={item.icon} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.04] px-4 py-3 pb-safe">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#18C3D6]/10 text-[11px] font-bold text-[#18C3D6]">
            {(userEmail ?? "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[#94a3b8]">{userEmail ?? "Usuario"}</p>
            <p className="text-[10px] text-[#4a5568]">{userRole ?? "user"}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-2">
          <button type="submit" className="text-[11px] text-[#4a5568] transition-colors hover:text-white">
            Cerrar sesión
          </button>
        </form>
      </div>
    </>
  );
}

export default function Sidebar({ userEmail, userRole, mobileOpen, onClose }: { userEmail?: string; userRole?: string; mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-white/[0.04] bg-[#050d16] lg:flex">
        <SidebarContent userEmail={userEmail} userRole={userRole} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-[opacity,visibility] duration-200 ${
          mobileOpen ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onClose}
          aria-label="Cerrar menú"
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-[min(300px,92vw)] flex-col border-r border-white/[0.06] bg-[#050d16] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent userEmail={userEmail} userRole={userRole} onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
