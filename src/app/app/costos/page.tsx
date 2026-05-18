import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseQuoteCostJson } from "@/lib/quote/parseQuoteCostJson";

export const runtime = "nodejs";

function productTitle(productJson: unknown, userText: string) {
  const pj = productJson as { title?: string; name?: string } | null | undefined;
  const t = pj?.title ?? pj?.name;
  if (t && String(t).trim()) return String(t).slice(0, 80);
  return userText?.trim()?.slice(0, 60) || "Cotización";
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function fmtRange(min: number, max: number) {
  return `${fmtUsd(min)} – ${fmtUsd(max)}`;
}

type CardKey = "fob" | "flete" | "impuestos" | "gestion" | "total";

function extractCostRow(
  cards: { label: string; value: string; detail?: string; highlight?: boolean }[],
  totalMin: number | null,
  totalMax: number | null
): Record<CardKey, string | null> {
  const find = (keywords: string[]) => {
    const c = cards.find((c) =>
      keywords.some((k) => c.label.toLowerCase().includes(k))
    );
    return c?.value ?? null;
  };
  return {
    fob: find(["producto", "fob"]),
    flete: find(["flete"]),
    impuestos: find(["impuest"]),
    gestion: find(["gesti"]),
    total:
      totalMin != null && totalMax != null
        ? fmtRange(totalMin, totalMax)
        : find(["total"]),
  };
}

export default async function CostosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const operations = await prisma.operation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
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

  type Row = {
    key: string;
    kind: "operation" | "quote";
    operationId?: string;
    quoteId: string;
    title: string;
    at: Date;
    costs: Record<CardKey, string | null>;
    totalMinUsd: number | null;
    totalMaxUsd: number | null;
  };

  let rows: Row[] = [];

  if (operations.length > 0) {
    rows = operations.map((o) => {
      const { cards } = parseQuoteCostJson(o.quote.quoteJson);
      return {
        key: `op-${o.id}`,
        kind: "operation" as const,
        operationId: o.id,
        quoteId: o.quote.id,
        title: productTitle(o.quote.productJson, o.quote.userText),
        at: o.createdAt,
        costs: extractCostRow(cards, o.quote.totalMinUsd, o.quote.totalMaxUsd),
        totalMinUsd: o.quote.totalMinUsd,
        totalMaxUsd: o.quote.totalMaxUsd,
      };
    });
  } else {
    const quotes = await prisma.quote.findMany({
      where: { userId: user.id, operation: { is: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
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
      const { cards } = parseQuoteCostJson(q.quoteJson);
      return {
        key: `q-${q.id}`,
        kind: "quote" as const,
        quoteId: q.id,
        title: productTitle(q.productJson, q.userText),
        at: q.createdAt,
        costs: extractCostRow(cards, q.totalMinUsd, q.totalMaxUsd),
        totalMinUsd: q.totalMinUsd,
        totalMaxUsd: q.totalMaxUsd,
      };
    });
  }

  let countWithRange = 0;
  let sumAvgUsd = 0;
  for (const r of rows) {
    if (r.totalMinUsd != null && r.totalMaxUsd != null) {
      countWithRange++;
      sumAvgUsd += (r.totalMinUsd + r.totalMaxUsd) / 2;
    }
  }
  const totalEstimadoLabel =
    sumAvgUsd > 0
      ? `USD ${Math.round(sumAvgUsd).toLocaleString("es-AR")}`
      : "—";

  const COL_HEADERS: { key: CardKey; label: string }[] = [
    { key: "fob", label: "Producto (FOB)" },
    { key: "flete", label: "Flete intl." },
    { key: "impuestos", label: "Impuestos ARG" },
    { key: "gestion", label: "Gestión" },
    { key: "total", label: "Total puesto ARG" },
  ];

  return (
    <div className="relative px-safe pb-8 pt-4 sm:p-6 lg:p-8">
      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.09),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-[1100px]">
        {/* Header */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 backdrop-blur sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/25 to-transparent" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#18C3D6]/[0.06] blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3d4a5a]">Sistema E-COMEX</p>
              <h1 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
                Costos
              </h1>
              <p className="mt-1 text-[13px] text-[#5a6577]">Desglose económico consolidado.</p>
            </div>
            <Link
              href="/app/nueva"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#18C3D6] px-4 py-2.5 text-[13px] font-semibold text-[#030d18] transition hover:bg-[#0ea5b9]"
            >
              Nueva operación
            </Link>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Cotizaciones", value: String(rows.length) },
            { label: "Con desglose completo", value: String(countWithRange) },
            { label: "Total estimado acumulado", value: totalEstimadoLabel, highlight: true },
          ].map((k) => (
            <div
              key={k.label}
              className={`relative overflow-hidden rounded-xl border p-4 ${
                k.highlight
                  ? "border-[#18C3D6]/20 bg-[#18C3D6]/[0.04]"
                  : "border-white/[0.04] bg-[#0B1622]"
              }`}
            >
              <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${k.highlight ? "bg-[#18C3D6]/60" : "bg-[#18C3D6]/20"}`} />
              <p className="pl-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555c6b]">{k.label}</p>
              <p
                className={`mt-2 pl-3 text-[22px] font-extrabold leading-none ${k.highlight ? "text-[#18C3D6]" : "text-white"}`}
                style={{ fontFamily: "var(--font-display)" }}
              >
                {k.value}
              </p>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/[0.04] bg-[#0B1622] px-6 py-12 text-center">
            <p className="text-[15px] font-medium text-white">Todavía no hay cotizaciones.</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] text-[#555c6b]">
              Cuando generes una cotización, su desglose económico aparece aquí.
            </p>
            <Link
              href="/app/nueva"
              className="mt-5 inline-flex rounded-lg bg-[#18C3D6] px-4 py-2 text-[13px] font-medium text-[#030d18] hover:bg-[#0ea5b9]"
            >
              Nueva cotización
            </Link>
          </div>
        ) : (
          <>
            {/* Cost table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]">
              {/* Table header */}
              <div className="hidden grid-cols-[1fr_repeat(4,minmax(100px,1fr))_130px_72px] gap-px border-b border-white/[0.06] bg-white/[0.03] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#555c6b] sm:grid">
                <span>Producto</span>
                {COL_HEADERS.slice(1, 5).map((h) => (
                  <span key={h.key} className="text-right">{h.label}</span>
                ))}
                <span className="text-right">Total ARG</span>
                <span />
              </div>

              {/* Rows */}
              <div className="divide-y divide-white/[0.04]">
                {rows.map((r) => (
                  <div
                    key={r.key}
                    className="group grid-cols-[1fr_repeat(4,minmax(100px,1fr))_130px_72px] gap-px px-4 py-4 transition-colors hover:bg-white/[0.02] sm:grid"
                  >
                    {/* Product + date */}
                    <div className="mb-3 flex min-w-0 flex-col sm:mb-0 sm:justify-center">
                      <span className="truncate text-[13px] font-semibold text-white">{r.title}</span>
                      <span className="mt-0.5 text-[11px] text-[#555c6b]">{fmtDate(r.at)}</span>
                    </div>

                    {/* Cost cells */}
                    {COL_HEADERS.slice(1, 5).map((h) => (
                      <div key={h.key} className="flex items-center justify-between gap-1 sm:block sm:text-right">
                        <span className="text-[10px] text-[#555c6b] sm:hidden">{h.label}</span>
                        <span className="text-[12px] text-[#a0a8b8]">
                          {r.costs[h.key] ?? "—"}
                        </span>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex items-center justify-between gap-1 sm:block sm:text-right">
                      <span className="text-[10px] text-[#555c6b] sm:hidden">Total ARG</span>
                      <span
                        className={`text-[13px] font-bold ${r.totalMinUsd != null ? "text-[#18C3D6]" : "text-[#a0a8b8]"}`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {r.costs.total ?? "—"}
                      </span>
                    </div>

                    {/* Action */}
                    <div className="mt-3 sm:mt-0 sm:flex sm:items-center sm:justify-end">
                      <Link
                        href={
                          r.kind === "operation"
                            ? `/app/operaciones/${r.operationId}/operation`
                            : `/cotizaciones/${r.quoteId}`
                        }
                        className="text-[12px] font-medium text-[#18C3D6] opacity-0 transition group-hover:opacity-100 hover:underline sm:opacity-0"
                      >
                        Ver →
                      </Link>
                      {/* Mobile fallback */}
                      <Link
                        href={
                          r.kind === "operation"
                            ? `/app/operaciones/${r.operationId}/operation`
                            : `/cotizaciones/${r.quoteId}`
                        }
                        className="text-[12px] font-medium text-[#18C3D6] sm:hidden hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            <p className="mt-3 text-[11px] text-[#3a404d]">
              Los rangos reflejan variabilidad de flete, tipo de cambio y honorarios al momento de la cotización. Se afina con datos documentales.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
