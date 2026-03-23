const MOCK_DOCS = [
  { name: "Cotización - Shenzhen Yifang.pdf", type: "PDF", op: "Componentes electrónicos", date: "15 Mar 2026", size: "245 KB" },
  { name: "Factura proforma #4821.pdf", type: "PDF", op: "Maquinaria industrial", date: "12 Mar 2026", size: "180 KB" },
  { name: "Presupuesto operador.xlsx", type: "XLSX", op: "Textiles Turquía", date: "08 Mar 2026", size: "92 KB" },
  { name: "Producto - Golf Cart.jpg", type: "Imagen", op: "Vehículos eléctricos", date: "05 Mar 2026", size: "1.2 MB" },
  { name: "Reporte E-COMEX - Autopartes.pdf", type: "PDF", op: "Autopartes Brasil", date: "28 Feb 2026", size: "320 KB" },
];

export default function DocumentosPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>Documentos</h1>
            <p className="mt-1 text-[14px] text-[#555c6b]">Repositorio de documentos asociados a operaciones.</p>
          </div>
          <button type="button" className="rounded-lg border border-white/[0.04] px-4 py-2 text-[13px] text-[#555c6b] hover:text-white">
            Subir documento
          </button>
        </div>

        <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Archivo</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Tipo</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Operación</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Fecha</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Tamaño</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DOCS.map((d) => (
                <tr key={d.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] font-medium text-white">{d.name}</td>
                  <td className="px-4 py-3"><span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-[#b0b8c9]">{d.type}</span></td>
                  <td className="px-4 py-3 text-[13px] text-[#555c6b]">{d.op}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555c6b]">{d.date}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555c6b]">{d.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
