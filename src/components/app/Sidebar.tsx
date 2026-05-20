"use client";

import Image from "next/image";
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
        <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={90} height={20} className="h-5 brightness-0 invert opacity-90" />
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
        <div className="space-y-5">
          {groups.map((groupKey) => {
            const groupItems = items.filter((item) => item.group === groupKey);
            if (groupItems.length === 0) return null;
            return (
              <section key={groupKey}>
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3d4a5a]">
                  {APP_NAV_GROUP_LABELS[groupKey]}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {groupItems.map((item) => {
                    const active = item.href === "/app" ? pathname === "/app" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 ${
                          active
                            ? "-ml-px border-l-2 border-[#18C3D6] bg-[#18C3D6]/[0.08] font-semibold text-white"
                            : item.primary
                              ? "font-medium text-[#18C3D6] hover:bg-[#18C3D6]/[0.06] hover:text-[#3dd5e8]"
                              : "text-[#6b7a8d] hover:bg-white/[0.03] hover:text-[#aab4c2]"
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

      <div className="border-t border-white/[0.04] px-3 py-3 pb-safe">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#18C3D6]/20 to-[#18C3D6]/[0.06] text-[12px] font-bold text-[#18C3D6] ring-1 ring-[#18C3D6]/20">
            {(userEmail ?? "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-[#a0aab8]">{userEmail ?? "Usuario"}</p>
            <p className="text-[10px] capitalize text-[#4a5568]">{userRole ?? "user"}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#4a5568] transition-colors hover:bg-white/[0.04] hover:text-[#94a3b8]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </form>
        </div>
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
