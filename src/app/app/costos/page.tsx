import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { QuoteCostBlocks } from "@/app/app/operaciones/[id]/operation/QuoteCostBlocks";
import { parseQuoteCostJson } from "@/lib/quote/parseQuoteCostJson";
import { SystemEmpty, SystemPage, SystemSection } from "@/components/app/SystemPage";

export const runtime = "nodejs";

function productTitle(productJson: unknown, userText: string) {
  const pj = productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, 120);
  const u = userText?.trim();
  if (u) return u.slice(0, 80);
  return "Cotización";
}

function fmtAt(d: Date) {
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtUsdRange(min: number, max: number) {
  const a = min.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const b = max.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return `${a} – ${b}`;
}

export default async function CostosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const operations = await prisma.operation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      quote: {
        select: {
          id: true,
          productJson: true,
          userText: true,
          quoteJson: true,
          totalMinUsd: true,
          totalMaxUsd: true,
          createdAt: true,
        },
      },
    },
  });

  type Row =
    | {
        key: string;
        kind: "operation";
        operationId: string;
        quoteId: string;
        title: string;
        at: Date;
        cards: ReturnType<typeof parseQuoteCostJson>["cards"];
        breakdown: ReturnType<typeof parseQuoteCostJson>["breakdown"];
        totalMinUsd: number | null;
        totalMaxUsd: number | null;
      }
    | {
        key: string;
        kind: "quote";
        quoteId: string;
        title: string;
        at: Date;
        cards: ReturnType<typeof parseQuoteCostJson>["cards"];
        breakdown: ReturnType<typeof parseQuoteCostJson>["breakdown"];
        totalMinUsd: number | null;
        totalMaxUsd: number | null;
      };

  let rows: Row[] = [];

  if (operations.length > 0) {
    rows = operations.map((o) => {
      const { cards, breakdown } = parseQuoteCostJson(o.quote.quoteJson);
      return {
        key: `op-${o.id}`,
        kind: "operation" as const,
        operationId: o.id,
        quoteId: o.quote.id,
        title: productTitle(o.quote.productJson, o.quote.userText),
        at: o.createdAt,
        cards,
        breakdown,
        totalMinUsd: o.quote.totalMinUsd,
        totalMaxUsd: o.quote.totalMaxUsd,
      };
    });
  } else {
    const quotes = await prisma.quote.findMany({
      where: { userId: user.id, operation: { is: null } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        productJson: true,
        userText: true,
        quoteJson: true,
        totalMinUsd: true,
        totalMaxUsd: true,
        createdAt: true,
      },
    });
    rows = quotes.map((q) => {
      const { cards, breakdown } = parseQuoteCostJson(q.quoteJson);
      return {
        key: `q-${q.id}`,
        kind: "quote" as const,
        quoteId: q.id,
        title: productTitle(q.productJson, q.userText),
        at: q.createdAt,
        cards,
        breakdown,
        totalMinUsd: q.totalMinUsd,
        totalMaxUsd: q.totalMaxUsd,
      };
    });
  }

  let sumMin = 0;
  let sumMax = 0;
  let countWithRange = 0;
  for (const r of rows) {
    if (r.totalMinUsd != null && r.totalMaxUsd != null) {
      sumMin += r.totalMinUsd;
      sumMax += r.totalMaxUsd;
      countWithRange += 1;
    }
  }

  return (
    <SystemPage
      title="Costos"
      description="Desglose de cotizaciones recientes e importaciones."
      action={
        <Link href="/app/nueva" className="rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2348d4]">
          Simular operacion
        </Link>
      }
    >

        {rows.length === 0 ? (
          <SystemSection title="Estado">
            <SystemEmpty
              title="Todavia no hay costos para mostrar."
              description="Cuando generes cotizaciones u operaciones, vas a ver aca su desglose economico."
              action={
                <Link
                  href="/app/nueva"
                  className="inline-flex rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
                >
                  Nueva cotizacion
                </Link>
              }
            />
          </SystemSection>
        ) : (
          <>
            <SystemSection title="Desglose por entidad">
            <div className="space-y-0">
              {rows.map((r, i) => (
                <section key={r.key} className={i > 0 ? "mt-10 border-t border-white/[0.06] pt-10" : ""}>
                  <h2 className="text-[16px] font-bold text-white [overflow-wrap:anywhere]">{r.title}</h2>
                  <p className="mt-1 text-[12px] text-[#555c6b]">{fmtAt(r.at)}</p>
                  <div className="mt-4">
                    <QuoteCostBlocks
                      cards={r.cards}
                      breakdown={r.breakdown}
                      totalMinUsd={r.totalMinUsd}
                      totalMaxUsd={r.totalMaxUsd}
                    />
                  </div>
                  <div className="mt-4">
                    {r.kind === "operation" ? (
                      <Link
                        href={`/app/operaciones/${r.operationId}/operation`}
                        className="text-[13px] font-medium text-[#2b59ff] hover:underline"
                      >
                        Ver operación
                      </Link>
                    ) : (
                      <Link href={`/app/operaciones/${r.quoteId}`} className="text-[13px] font-medium text-[#2b59ff] hover:underline">
                        Ver cotización
                      </Link>
                    )}
                  </div>
                </section>
              ))}
            </div>
            </SystemSection>

            {rows.length > 1 && countWithRange > 0 ? (
              <div className="mt-10 rounded-xl border border-[#d4a843]/20 bg-[#d4a843]/[0.06] p-5">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">Total acumulado (estimado)</p>
                <p className="mt-2 text-[18px] font-bold text-[#d4a843]" style={{ fontFamily: "var(--font-display)" }}>
                  {fmtUsdRange(sumMin, sumMax)}
                </p>
                <p className="mt-1 text-[11px] text-[#555c6b]">Suma de rangos {countWithRange} ítem{countWithRange !== 1 ? "s" : ""} con total min/max.</p>
              </div>
            ) : null}
          </>
        )}
    </SystemPage>
  );
}
