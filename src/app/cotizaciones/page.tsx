import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/db";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SealVerified } from "@/components/ui/SealVerified";
import { AppShell } from "@/components/shell/AppShell";
import { CotizacionesClient, type QuoteRow } from "@/app/cotizaciones/ui/CotizacionesClient";

export const runtime = "nodejs";

export default async function CotizacionesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value;
  const payload = token ? await verifyAuthToken(token) : null;

  const quotes = payload
    ? await prisma.quote.findMany({
        where: { userId: payload.sub },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const rows: QuoteRow[] = quotes.map((q) => {
    const pj: any = q.productJson ?? {};
    const qj: any = q.quoteJson ?? {};
    const bd: any = qj?.breakdown ?? null;
    const productTitle =
      typeof pj?.title === "string" && pj.title.trim() ? pj.title.trim() : q.userText;
    const ncm = typeof pj?.ncm === "string" && pj.ncm.trim() ? pj.ncm.trim() : null;
    const origin =
      typeof pj?.origin === "string" && pj.origin.trim() ? pj.origin.trim() : null;
    const shippingProfile =
      typeof pj?.shippingProfile === "string" && pj.shippingProfile.trim()
        ? pj.shippingProfile.trim()
        : null;
    const quality = typeof qj?.quality === "number" && Number.isFinite(qj.quality) ? qj.quality : null;
    const breakdown =
      bd &&
      typeof bd === "object" &&
      typeof bd.cifMinUsd === "number" &&
      typeof bd.cifMaxUsd === "number" &&
      typeof bd.impuestosTotalMinUsd === "number" &&
      typeof bd.impuestosTotalMaxUsd === "number" &&
      typeof bd.gestionMinUsd === "number" &&
      typeof bd.gestionMaxUsd === "number"
        ? {
            cifMinUsd: bd.cifMinUsd,
            cifMaxUsd: bd.cifMaxUsd,
            impuestosMinUsd: bd.impuestosTotalMinUsd,
            impuestosMaxUsd: bd.impuestosTotalMaxUsd,
            gestionMinUsd: bd.gestionMinUsd,
            gestionMaxUsd: bd.gestionMaxUsd,
          }
        : null;

    return {
      id: q.id,
      createdAt: q.createdAt.toISOString(),
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
      breakdown,
    };
  });

  return (
    <AppShell
      active="cotizaciones"
      title="Cotizaciones"
      subtitle="Biblioteca de manifiestos"
      right={
        <div className="flex items-center gap-2">
          <SealVerified />
          <ButtonLink href="/chat" variant="primary">
            Nueva cotización
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </ButtonLink>
        </div>
      }
      maxWidth="1200px"
    >
      <SectionHeader
        eyebrow="BIBLIOTECA DE MANIFIESTOS"
        title="Cotizaciones"
        subtitle="Filtrá, compará (2–3) y decidí con validación profesional."
        icon="calculate"
      />

      {payload ? (
        quotes.length ? (
          <CotizacionesClient quotes={rows} />
        ) : (
          <Card className="mt-8 border-white/10 bg-white/5">
            <div className="p-6 text-sm text-muted">
              Todavía no hay cotizaciones. Creá una desde el chat.
            </div>
          </Card>
        )
      ) : (
        <Card className="mt-8 border-white/10 bg-white/5">
          <div className="p-6 text-sm text-muted">
            Iniciá sesión para ver tu historial. Igual podés cotizar sin cuenta en el
            chat.
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/account/login" variant="secondary">
                Iniciar sesión
              </ButtonLink>
              <ButtonLink href="/chat" variant="primary">
                Ir al chat
              </ButtonLink>
            </div>
          </div>
        </Card>
      )}
    </AppShell>
  );
}

