import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SealVerified } from "@/components/ui/SealVerified";
import { TimelineStep } from "@/components/ui/TimelineStep";
import { AppShell } from "@/components/shell/AppShell";
import { Icon } from "@/components/ui/Icon";
import { GuidedOnboarding } from "@/components/onboarding/GuidedOnboarding";

export const runtime = "nodejs";

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  if (!payload) {
    return (
      <AppShell
        active="account"
        title="Cuenta"
        subtitle="Opcional, para historial y seguimiento"
        right={
          <div className="flex items-center gap-2">
            <SealVerified />
            <ButtonLink href="/chat" variant="primary">
              Ir al análisis
              <Icon name="bolt" size={18} className="text-white/90" />
            </ButtonLink>
          </div>
        }
        maxWidth="1200px"
      >
        <Card>
          <CardHeader
            eyebrow="OPERACIÓN"
            title="Cuenta (opcional)"
            icon="person"
            right={<Badge tone="muted" icon="lock">Sin sesión</Badge>}
          />
          <CardContent>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              No necesitás cuenta para cotizar. Si querés, podés crear una para ver historial,
              wishlist y seguimiento.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/account/login"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/account/register"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-[#030d18] shadow-lg shadow-primary/20 transition-transform active:scale-95"
              >
                Crear cuenta
              </Link>
              <Link
                href="/chat"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 px-6 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Ir al análisis
              </Link>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const quotes = await prisma.quote.findMany({
    where: { userId: payload.sub },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const last = quotes.find((q) => q.totalMinUsd != null && q.totalMaxUsd != null) ?? null;
  const lastTitle =
    last && typeof (last.productJson as any)?.title === "string"
      ? (last.productJson as any).title
      : last?.userText ?? null;
  const lastTotal =
    last?.totalMinUsd != null && last?.totalMaxUsd != null
      ? `${fmtUsd(last.totalMinUsd)} – ${fmtUsd(last.totalMaxUsd)}`
      : null;
  const lastQuality =
    typeof (last?.quoteJson as any)?.quality === "number" && Number.isFinite((last?.quoteJson as any)?.quality)
      ? (last?.quoteJson as any)?.quality
      : null;

  return (
    <AppShell
      active="account"
      title="¿Qué quieres hacer hoy?"
      subtitle="Selecciona una opción para comenzar a gestionar tus operaciones de comercio exterior con inteligencia de datos."
      right={
        <div className="flex items-center gap-2">
          <Badge tone="success" icon="wifi">
            En línea
          </Badge>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/90 transition-colors hover:bg-white/10"
            >
              Salir
            </button>
          </form>
        </div>
      }
      maxWidth="1200px"
    >
      <div className="mt-4">
        <GuidedOnboarding />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <Badge tone="muted" icon="person">
          {payload.email}
        </Badge>
        {lastQuality != null ? <ProgressRing value={lastQuality} label="Calidad" /> : <SealVerified />}
      </div>
    </AppShell>
  );
}

