type Card = { label: string; value: string; detail?: string; highlight?: boolean };

function fmtUsd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Resumen visual alineado con /app/operaciones/[id] (cards + breakdown opcional). */
export function QuoteCostBlocks({
  cards,
  breakdown,
  totalMinUsd,
  totalMaxUsd,
}: {
  cards: Card[];
  breakdown: Record<string, unknown> | null;
  totalMinUsd: number | null;
  totalMaxUsd: number | null;
}) {
  const bd = breakdown ?? {};
  const extraRows: { k: string; label: string }[] = [
    { k: "fobTotalUsd", label: "FOB total (USD)" },
    { k: "fleteMinUsd", label: "Flete intl. (min)" },
    { k: "fleteMaxUsd", label: "Flete intl. (max)" },
    { k: "seguroMinUsd", label: "Seguro (min)" },
    { k: "cifMinUsd", label: "CIF (min)" },
    { k: "derechosImportacionMinUsd", label: "Derechos import. (min)" },
    { k: "ivaMinUsd", label: "IVA (min)" },
    { k: "tasaEstadisticaMinUsd", label: "Tasa estadística (min)" },
    { k: "impuestosTotalMinUsd", label: "Impuestos totales (min)" },
    { k: "gestionMinUsd", label: "Gestión / despacho (min)" },
    { k: "totalMinUsd", label: "Total min (motor)" },
    { k: "totalMaxUsd", label: "Total max (motor)" },
  ];

  const numericRows = extraRows
    .map(({ k, label }) => {
      const v = bd[k];
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      return { label, value: fmtUsd(v) };
    })
    .filter((x): x is { label: string; value: string } => x != null);

  return (
    <div className="space-y-4">
      {cards.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Tarjetas de cotización</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {cards.map((c) => (
              <div
                key={c.label}
                className={`rounded-xl border p-4 ${
                  c.highlight ? "border-[#d4a843]/20 bg-[#d4a843]/[0.04]" : "border-white/[0.04] bg-[#0B1622]"
                }`}
              >
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">{c.label}</p>
                <p
                  className={`mt-1 text-[15px] font-bold ${c.highlight ? "text-[#d4a843]" : "text-white"}`}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.value}
                </p>
                {c.detail ? <p className="mt-1 text-[11px] text-[#555c6b]">{c.detail}</p> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {numericRows.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Desglose numérico (quoteJson)</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.04]">
            <table className="w-full min-w-[400px] text-left text-[13px]">
              <tbody>
                {numericRows.map((r) => (
                  <tr key={r.label} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2 text-[#b0b8c9]">{r.label}</td>
                    <td className="px-3 py-2 text-right font-medium text-white">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {totalMinUsd != null && totalMaxUsd != null ? (
        <p className="text-[12px] text-[#555c6b]">
          Rango total guardado:{" "}
          <span className="font-semibold text-[#d4a843]">
            {fmtUsd(totalMinUsd)} – {fmtUsd(totalMaxUsd)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
