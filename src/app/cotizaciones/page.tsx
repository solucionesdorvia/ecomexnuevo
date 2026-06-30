import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { getSessionUser, isOwnerEmail } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import ConsoleShell from "@/components/app/ConsoleShell";
import { SystemPage } from "@/components/app/SystemPage";
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
  const includeContact = { user: { select: { email: true } }, lead: { select: { contact: true } } } as const;
  const quotes = isStaff
    ? await prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: includeContact })
    : payload
      ? await prisma.quote.findMany({
          where: { userId: payload.sub },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: includeContact,
        })
      : [];

  // Cruce por navegador (anonId): muchos leads no quedaron vinculados a la cotización
  // pero comparten el anonId. Así recuperamos igual el contacto de quien cotizó.
  const anonIds = Array.from(new Set(quotes.map((q) => q.anonId).filter((x): x is string => !!x)));
  const leadByAnon = new Map<string, string>();
  if (anonIds.length) {
    const leads = await prisma.lead.findMany({
      where: { anonId: { in: anonIds } },
      select: { anonId: true, contact: true },
      orderBy: { createdAt: "desc" },
    });
    for (const l of leads) if (l.anonId && !leadByAnon.has(l.anonId)) leadByAnon.set(l.anonId, l.contact);
  }

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
      contact:
        q.user?.email ??
        q.lead?.contact ??
        (q.anonId ? leadByAnon.get(q.anonId) ?? null : null),
    };
  });

  return (
    <ConsoleShell>
      <SystemPage
        title={isStaff ? "Cotizaciones" : "Mis cotizaciones"}
        description={
          isStaff
            ? "Todas las cotizaciones generadas — quién cotizó, producto, NCM y montos."
            : "Gestioná, visualizá y compará tus operaciones de comercio exterior."
        }
        action={
          <Badge tone="success" icon="wifi">
            Sincronizado
          </Badge>
        }
        maxWidth="full"
      >
        {payload ? <CotizacionesClient quotes={rows} /> : <CotizacionesClient quotes={[]} />}
      </SystemPage>
    </ConsoleShell>
  );
}

