"use client";

import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/Icon";
import { BrandLogo } from "@/components/BrandLogo";

type NavKey =
  | "cotizar"
  | "cotizaciones"
  | "operador"
  | "ajustes"
  | "chat"
  | "account"
  | "tendencias";

const NAV: Array<{
  key: NavKey;
  href: string;
  label: string;
}> = [
  { key: "account", href: "/account", label: "Dashboard" },
  { key: "cotizar", href: "/cotizar", label: "Operaciones" },
  { key: "cotizaciones", href: "/cotizaciones", label: "Cotizaciones" },
  { key: "operador", href: "/operador", label: "Expertos" },
  { key: "tendencias", href: "/tendencias", label: "Reportes" },
];

export function AppShell({
  active,
  title,
  subtitle,
  right,
  children,
  maxWidth = "1280px",
}: {
  active: NavKey;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const normalizedActive: NavKey = active === "chat" ? "cotizar" : active;
  const [openMobileNav, setOpenMobileNav] = useState(false);

  const navItemClass = (isActive: boolean) =>
    cn(
      "relative rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-colors",
      isActive
        ? "bg-[color:color-mix(in_oklab,var(--primary)_20%,transparent)] text-strong after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-[color:color-mix(in_oklab,var(--accent)_60%,white_8%)]"
        : "text-muted hover:text-strong"
    );

  return (
    <div className="bg-app min-h-screen text-strong">
      <header className="glass-nav sticky top-0 z-50 border-b border-subtle">
        <div className="mx-auto flex w-full items-center justify-between gap-6 px-6 py-3 lg:px-10" style={{ maxWidth }}>
          <div className="flex min-w-0 items-center gap-6">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-[var(--surface)] text-muted lg:hidden"
              onClick={() => setOpenMobileNav(true)}
              aria-label="Abrir navegación"
            >
              <Icon name="menu" size={18} />
            </button>
            <Link href="/" className="flex items-center gap-3">
              <span className="rounded-lg bg-white px-2 py-1 shadow-sm">
                <BrandLogo className="h-6" priority />
              </span>
            </Link>

            <label className="hidden min-w-40 max-w-72 flex-1 md:flex">
              <div className="flex h-10 w-full items-stretch overflow-hidden rounded-xl border border-subtle bg-[var(--surface)]">
                <div className="flex items-center justify-center pl-4 text-muted">
                  <Icon name="search" size={18} />
                </div>
                <input
                  className="h-10 w-full flex-1 border-none bg-transparent px-4 pl-2 text-sm text-strong placeholder:text-muted/70 focus:outline-none focus:ring-0"
                  placeholder="Buscar…"
                />
              </div>
            </label>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden items-center gap-3 lg:flex">
              {NAV.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  className={navItemClass(normalizedActive === n.key)}
                >
                  {n.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-[var(--surface)] text-strong/90 transition-colors hover:bg-[var(--surface2)]"
                aria-label="Notificaciones"
              >
                <Icon name="notifications" size={18} />
              </button>
              <Link
                href="/ajustes"
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-[var(--surface)] text-strong/90 transition-colors hover:bg-[var(--surface2)]",
                  normalizedActive === "ajustes" &&
                    "bg-[color:color-mix(in_oklab,var(--primary)_16%,transparent)]"
                )}
                aria-label="Ajustes"
              >
                <Icon name="settings" size={18} />
              </Link>
              <div
                className="ml-1 h-9 w-9 rounded-full border border-subtle bg-[linear-gradient(140deg,color-mix(in_oklab,var(--primary)_44%,transparent),color-mix(in_oklab,var(--accent)_34%,transparent))]"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </header>

      <Sheet open={openMobileNav} onOpenChange={setOpenMobileNav}>
        <SheetContent side="left" className="w-[320px] max-w-[90vw] rounded-r-2xl p-4">
          <div className="mb-3 flex items-center justify-between px-2 py-1">
            <span className="text-xs font-black uppercase tracking-[0.22em] text-muted">Navegación</span>
            <button
              type="button"
              onClick={() => setOpenMobileNav(false)}
              aria-label="Cerrar menú"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-subtle bg-[var(--surface)] text-muted"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <nav className="grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                onClick={() => setOpenMobileNav(false)}
                className={navItemClass(normalizedActive === n.key)}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/ajustes"
              onClick={() => setOpenMobileNav(false)}
              className={navItemClass(normalizedActive === "ajustes")}
            >
              Ajustes
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <main className="mx-auto w-full px-6 py-8 lg:px-10" style={{ maxWidth }}>
        {(title || subtitle || right) && (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              {subtitle ? (
                <div className="text-xs font-bold uppercase tracking-wider text-muted">
                  {subtitle}
                </div>
              ) : null}
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-strong">
                {title ?? "E‑COMEX"}
              </h1>
            </div>
            {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
