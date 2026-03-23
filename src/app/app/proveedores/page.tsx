const MOCK_SUPPLIERS = [
  { name: "Shenzhen Yifang Tech Co.", country: "China", products: "Electrónica, componentes", ops: 12, lastOp: "Mar 2026" },
  { name: "Zhejiang Machinery Group", country: "China", products: "Maquinaria industrial", ops: 5, lastOp: "Feb 2026" },
  { name: "Istanbul Trade Partners", country: "Turquía", products: "Textiles, indumentaria", ops: 3, lastOp: "Ene 2026" },
  { name: "São Paulo Exportadora", country: "Brasil", products: "Autopartes", ops: 8, lastOp: "Mar 2026" },
  { name: "Milano Fashion SRL", country: "Italia", products: "Calzado, marroquinería", ops: 2, lastOp: "Dic 2025" },
];

export default function ProveedoresPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1000px]">
        <h1 className="text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>Proveedores</h1>
        <p className="mt-1 text-[14px] text-[#555c6b]">Directorio de proveedores internacionales.</p>

        <div className="mt-8 overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-white/[0.04] bg-[#0B1622]">
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Proveedor</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">País</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Productos</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Operaciones</th>
                <th className="px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Última</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SUPPLIERS.map((s) => (
                <tr key={s.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[13px] font-medium text-white">{s.name}</td>
                  <td className="px-4 py-3 text-[13px] text-[#b0b8c9]">{s.country}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555c6b]">{s.products}</td>
                  <td className="px-4 py-3 text-[13px] text-[#b0b8c9]">{s.ops}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555c6b]">{s.lastOp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
