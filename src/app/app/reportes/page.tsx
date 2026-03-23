const MOCK_REPORTS = [
  { name: "Cotización - Componentes electrónicos", type: "Cotización", date: "15 Mar 2026", total: "$6,840" },
  { name: "Presupuesto - Maquinaria industrial", type: "Presupuesto", date: "12 Mar 2026", total: "$24,500" },
  { name: "Cotización - Textiles Turquía", type: "Cotización", date: "08 Mar 2026", total: "$3,200" },
  { name: "Cotización - Autopartes Brasil", type: "Cotización", date: "28 Feb 2026", total: "$12,100" },
];

export default function ReportesPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        <h1 className="text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>Reportes</h1>
        <p className="mt-1 text-[14px] text-[#555c6b]">Historial de análisis y reportes exportados.</p>

        <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Reporte</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Tipo</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {MOCK_REPORTS.map((r) => (
                <tr key={r.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3"><span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#b0b8c9]">{r.type}</span></td>
                  <td className="px-4 py-3 text-[13px] text-[#555c6b]">{r.date}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-[#d4a843]">{r.total}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-[12px] text-[#2b59ff] hover:text-white">PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
