import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { getSessionUser, isOwnerEmail } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/shell/AppShell";
import { CotizacionesClient, type QuoteRow } from "@/app/cotizaciones/ui/CotizacionesClient";
import { Badge } from "@/components/ui/Badge";

export const runtime = "nodejs";

export default async function CotizacionesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  const sessionUser = await getSessionUser();
  const isStaff = Boolean(
    sessionUser && (sessionUser.role === "admin" || sessionUser.role === "operator" || isOwnerEmail(sessionUser.email))
  );

  // El equipo (admin/operador/dueño) ve TODAS las cotizaciones; un usuario común, solo las suyas.
  const quotes = isStaff
    ? await prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
    : payload
      ? await prisma.quote.findMany({
          where: { userId: payload.sub },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];

  const rows: QuoteRow[] = quotes.map((q) => {
    const pj = (q.productJson ?? {}) as Record<string, unknown>;
    const stage = String(q.stage ?? "").toLowerCase();
    const status: QuoteRow["status"] =
      stage.includes("refined") || stage.includes("lead")
        ? "sent"
        : stage.includes("quoted") || stage.includes("decision")
          ? "verified"
          : "draft";
    const productTitle =
      typeof pj.title === "string" && pj.title.trim() ? pj.title.trim() : q.userText;
    const ncm = typeof pj.ncm === "string" && pj.ncm.trim() ? pj.ncm.trim() : null;
    const origin =
      typeof pj.origin === "string" && pj.origin.trim() ? pj.origin.trim() : null;
    const shippingProfile =
      typeof pj.shippingProfile === "string" && pj.shippingProfile.trim()
        ? pj.shippingProfile.trim()
        : null;
    const rubro =
      typeof pj.category === "string" && pj.category.trim() ? pj.category.trim() : null;
    const qj = (q.quoteJson ?? {}) as Record<string, unknown>;
    const quality = typeof qj.quality === "number" && Number.isFinite(qj.quality) ? qj.quality : null;

    return {
      id: q.id,
      createdAt: q.createdAt.toISOString(),
      status,
      rubro,
      mode: q.mode,
      stage: q.stage,
      userText: q.userText,
      productTitle,
      totalMinUsd: q.totalMinUsd ?? null,
      totalMaxUsd: q.totalMaxUsd ?? null,
      ncm,
      origin,
      shippingProfile,
      quality,
    };
  });

  return (
    <AppShell
      active="cotizaciones"
      title="Mis Cotizaciones"
      subtitle="Gestiona, visualiza y compara tus operaciones de comercio exterior activas."
      right={<Badge tone="success" icon="wifi">Sincronizado</Badge>}
      maxWidth="1320px"
    >
      {payload ? <CotizacionesClient quotes={rows} /> : <CotizacionesClient quotes={[]} />}
    </AppShell>
  );
}

