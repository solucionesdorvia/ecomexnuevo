import type { QuoteRow } from "@/app/cotizaciones/ui/CotizacionesClient";

function usd(n: number | null | undefined) {
  if (typeof n !== "number") return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function CompareQuotes({ rows }: { rows: QuoteRow[] }) {
  if (!rows.length) return null;

  return (
    <section className="compare-surface">
      <header className="compare-head">
        <h3>Comparación lateral</h3>
        <p>Analizá diferencias de NCM, total, estado y rubro en una sola vista.</p>
      </header>
      <div className="compare-grid">
        {rows.map((row) => (
          <article key={row.id} className="compare-col">
            <p className="compare-col-eyebrow">{row.status.toUpperCase()}</p>
            <h4>{row.productTitle || row.userText || "Cotización"}</h4>
            <ul>
              <li>
                <span>Total</span>
                <strong>{usd(row.totalMaxUsd ?? row.totalMinUsd)}</strong>
              </li>
              <li>
                <span>NCM</span>
                <strong>{row.ncm || "A confirmar"}</strong>
              </li>
              <li>
                <span>Rubro</span>
                <strong>{row.rubro || "General"}</strong>
              </li>
              <li>
                <span>Fecha</span>
                <strong>{new Date(row.createdAt).toLocaleDateString("es-AR")}</strong>
              </li>
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

