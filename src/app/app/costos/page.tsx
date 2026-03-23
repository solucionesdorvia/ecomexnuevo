import Link from "next/link";

const MOCK_BREAKDOWN = [
  { label: "FOB", value: "$2,400", pct: "35%" },
  { label: "Flete internacional", value: "$680", pct: "10%" },
  { label: "Seguro", value: "$120", pct: "2%" },
  { label: "Derechos de importación", value: "$960", pct: "14%" },
  { label: "Tasa estadística", value: "$96", pct: "1%" },
  { label: "IVA", value: "$840", pct: "12%" },
  { label: "IVA Adicional", value: "$420", pct: "6%" },
  { label: "Ganancias", value: "$360", pct: "5%" },
  { label: "IIBB", value: "$180", pct: "3%" },
  { label: "Gestión / despacho", value: "$450", pct: "7%" },
  { label: "Transporte nacional", value: "$200", pct: "3%" },
  { label: "Transferencia intl.", value: "$134", pct: "2%" },
];

export default function CostosPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>Costos</h1>
            <p className="mt-1 text-[14px] text-[#555c6b]">Desglose y estructura de costos de importación.</p>
          </div>
          <Link href="/app/nueva" className="rounded-lg bg-[#2b59ff] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#2348d4]">
            Simular operación
          </Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {[
            { label: "FOB Total", value: "$2,400", color: "text-white" },
            { label: "Impuestos AR", value: "$2,856", color: "text-white" },
            { label: "Gestión", value: "$784", color: "text-white" },
            { label: "Total landed", value: "$6,840", color: "text-[#d4a843]" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#555c6b]">{s.label}</p>
              <p className={`mt-2 text-[18px] font-bold ${s.color}`} style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Concepto</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">USD</th>
                <th className="px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">%</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BREAKDOWN.map((r) => (
                <tr key={r.label} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] text-[#b0b8c9]">{r.label}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-medium text-white">{r.value}</td>
                  <td className="px-4 py-3 text-right text-[13px] text-[#555c6b]">{r.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
