"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BREADCRUMB_MAP: Record<string, string> = {
  "/app": "Inicio",
  "/app/nueva": "Nueva operación",
  "/app/operaciones": "Operaciones",
  "/app/analisis": "Análisis",
  "/app/costos": "Costos",
  "/app/proveedores": "Proveedores",
  "/app/documentos": "Documentos",
  "/app/reportes": "Reportes",
  "/app/configuracion": "Configuración",
  "/app/operador": "Operador",
};

export default function Topbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    const label = BREADCRUMB_MAP[path];
    if (label) crumbs.push({ label, href: path });
    else if (seg !== "app") crumbs.push({ label: seg, href: path });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.04] bg-[#070e17] px-4 lg:px-6">
      <div className="flex items-center gap-3">
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

        {/* Breadcrumb — desktop */}
        <div className="hidden items-center gap-1.5 text-[13px] lg:flex">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#333d4d]">/</span>}
              {i === crumbs.length - 1 ? (
                <span className="text-white font-medium">{c.label}</span>
              ) : (
                <Link href={c.href} className="text-[#4a5568] transition-colors hover:text-[#94a3b8]">{c.label}</Link>
              )}
            </span>
          ))}
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
          <span className="hidden sm:inline">Nueva operación</span>
        </Link>

        {/* Notifications */}
        <button type="button" className="rounded-lg border border-white/[0.04] p-2 text-[#4a5568] transition-colors hover:text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>
      </div>
    </header>
  );
}
