"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/app", label: "Inicio", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/app/nueva", label: "Nueva operación", icon: "M12 4v16m8-8H4", primary: true },
  { href: "/app/operaciones", label: "Operaciones", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { href: "/app/costos", label: "Costos", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" },
  { href: "/app/proveedores", label: "Proveedores", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/app/documentos", label: "Documentos", icon: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
  { href: "/app/reportes", label: "Reportes", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/app/configuracion", label: "Configuración", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

const OPERATOR = { href: "/app/operador", label: "Operador", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" };

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

  return (
    <>
      <div className="flex h-14 items-center px-5 border-b border-white/[0.04]">
        <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert opacity-90" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-150 ${
                  active
                    ? "bg-[#2b59ff]/8 text-white font-medium border-l-2 border-[#2b59ff] -ml-px"
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

        {isOperator && (
          <>
            <div className="my-4 mx-3 h-px bg-white/[0.04]" />
            <Link
              href={OPERATOR.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors duration-150 ${
                pathname.startsWith(OPERATOR.href)
                  ? "bg-[#7c3aed]/10 text-white font-medium"
                  : "text-[#4a5568] hover:bg-white/[0.02] hover:text-[#94a3b8]"
              }`}
            >
              <NavIcon d={OPERATOR.icon} />
              {OPERATOR.label}
            </Link>
          </>
        )}
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
