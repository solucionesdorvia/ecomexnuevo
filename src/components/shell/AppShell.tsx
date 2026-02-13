import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/components/ui/cn";

type NavKey = "chat" | "account" | "cotizaciones" | "tendencias";

const NAV: Array<{
  key: NavKey;
  href: string;
  label: string;
  icon: string;
}> = [
  { key: "account", href: "/account", label: "Tablero", icon: "dashboard" },
  { key: "chat", href: "/chat", label: "Asistente IA", icon: "smart_toy" },
  { key: "cotizaciones", href: "/cotizaciones", label: "Cotizaciones", icon: "calculate" },
  { key: "tendencias", href: "/tendencias", label: "Señales", icon: "trending_up" },
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
  return (
    <div className="min-h-screen app-background text-white">
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden w-72 flex-col border-r border-white/5 bg-background-deeper/50 backdrop-blur-md lg:flex">
          <div className="flex flex-col justify-between gap-6 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <span className="material-symbols-outlined text-primary text-2xl">
                  terminal
                </span>
              </div>
              <div className="flex flex-col">
                <div className="text-base font-bold tracking-tight">Terminal</div>
                <div className="text-xs font-medium uppercase tracking-widest text-muted">
                  Control room
                </div>
              </div>
            </div>

            <nav className="flex flex-col gap-2">
              {NAV.map((n) => (
                <Link
                  key={n.key}
                  href={n.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-muted transition-all hover:bg-white/5 hover:text-white",
                    n.key === active && "border border-primary/20 bg-primary/10 text-white"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined",
                      n.key === active ? "text-primary" : ""
                    )}
                  >
                    {n.icon}
                  </span>
                  <span className="text-sm font-semibold">{n.label}</span>
                </Link>
              ))}
            </nav>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                Estado
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="success" icon="wifi">
                  En línea
                </Badge>
                <Badge tone="muted" icon="directions_boat">
                  Marítimo
                </Badge>
              </div>
              <div className="mt-3 text-xs leading-relaxed text-muted">
                Vista premium. Todo se valida y se cierra en consultoría.
              </div>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <header className="glass-nav sticky top-0 z-30 border-b border-white/5">
            <div
              className="mx-auto flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              style={{ maxWidth }}
            >
              <div className="min-w-0">
                {title ? (
                  <div className="text-xl font-black tracking-tight">{title}</div>
                ) : (
                  <div className="text-xl font-black tracking-tight">E‑COMEX</div>
                )}
                {subtitle ? (
                  <div className="mt-1 text-xs font-medium uppercase tracking-widest text-muted">
                    {subtitle}
                  </div>
                ) : null}
              </div>
              {right ? (
                <div className="flex w-full flex-wrap items-center justify-start gap-3 sm:w-auto sm:justify-end">
                  {right}
                </div>
              ) : null}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full px-6 py-8 lg:px-10" style={{ maxWidth }}>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

