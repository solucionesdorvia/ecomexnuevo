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
      <div className="flex h-14 items-center px-5 border-b border-white/[0.04]">
        <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert opacity-90" />
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4">
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
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-150 ${
                          active
                            ? "border-l-2 border-[#2b59ff] -ml-px bg-[#2b59ff]/8 font-medium text-white"
                            : item.primary
                              ? "text-[#2b59ff] hover:bg-[#2b59ff]/5"
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

      <div className="border-t border-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2b59ff]/10 text-[11px] font-bold text-[#2b59ff]">
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
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-[#050d16] shadow-2xl">
            <SidebarContent userEmail={userEmail} userRole={userRole} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
