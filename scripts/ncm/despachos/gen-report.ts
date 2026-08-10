/**
 * Genera un documento visual (HTML autocontenible) del catálogo de despachos,
 * para revisión humana antes de cargar a producción. Salida a scratchpad.
 *
 * Uso: npx tsx scripts/ncm/despachos/gen-report.ts <ruta-salida.html>
 */
import fs from "fs";
import path from "path";

type Tasas = Partial<Record<"die" | "te" | "iva" | "ivaAdic" | "ganancias" | "iibb", number>>;
type Entry = {
  op: string; producto: string; ncm: string | null; ncmSim?: string | null;
  origen?: string | null; estado?: string | null; fobUsd?: number | null;
  tasas?: Tasas | null; nota?: string;
};

const RUBROS: Record<string, string> = {
  "15": "Alimentos", "18": "Alimentos", "21": "Alimentos", "22": "Bebidas",
  "33": "Cosmética", "39": "Plásticos", "40": "Caucho", "42": "Marroquinería",
  "53": "Textil", "61": "Indumentaria", "62": "Indumentaria", "63": "Textil hogar",
  "64": "Calzado", "65": "Tocados", "68": "Abrasivos/piedra", "69": "Cerámica",
  "71": "Joyería", "73": "Metal", "74": "Metal", "76": "Metal",
  "84": "Máquinas", "85": "Eléctrico/electrónica", "86": "Ferroviario", "87": "Vehículos",
  "88": "Aeronáutica", "90": "Instrumentos", "91": "Relojería", "94": "Muebles/luminaria",
  "95": "Juguetes/deporte", "96": "Manufacturas varias",
};
const rubroOf = (ncm: string) => RUBROS[ncm.replace(/\D/g, "").slice(0, 2)] ?? "Otros";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function main() {
  const out = process.argv[2] || path.join(process.cwd(), "catalogo-despachos.html");
  const catalog = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data", "ncm", "despachos", "catalog.json"), "utf8")
  ) as { concretados?: Entry[]; soloCotizacion?: Entry[]; totalOps?: number };

  const rows = (catalog.concretados ?? [])
    .filter((e) => e.ncm)
    .map((e) => {
      const dubious = /valid|atenci[oó]n|revisar/i.test(e.nota ?? "");
      return {
        op: e.op,
        producto: e.producto,
        ncm: e.ncm as string,
        cap: (e.ncm as string).replace(/\D/g, "").slice(0, 2),
        rubro: rubroOf(e.ncm as string),
        origen: e.origen ?? "—",
        estado: e.estado ?? "—",
        die: e.tasas?.die ?? null,
        iva: e.tasas?.iva ?? null,
        fob: e.fobUsd ?? null,
        verified: !dubious,
        nota: e.nota ?? "",
      };
    })
    .sort((a, b) => a.rubro.localeCompare(b.rubro) || a.ncm.localeCompare(b.ncm));

  const rubros = [...new Set(rows.map((r) => r.rubro))].sort((a, b) =>
    rows.filter((r) => r.rubro === b).length - rows.filter((r) => r.rubro === a).length
  );
  const caps = new Set(rows.map((r) => r.cap)).size;
  const soloCot = (catalog.soloCotizacion ?? []).length;

  const rowsHtml = rows
    .map(
      (r) => `      <tr data-rubro="${esc(r.rubro)}" data-txt="${esc((r.producto + " " + r.ncm + " " + r.origen).toLowerCase())}">
        <td class="prod"><span class="op">${esc(r.op)}</span>${esc(r.producto)}${r.verified ? "" : ` <span class="chip warn">revisar</span>`}</td>
        <td class="mono ncm">${esc(r.ncm)}</td>
        <td class="rubro"><span class="dot" data-r="${esc(r.rubro)}"></span>${esc(r.rubro)}</td>
        <td>${esc(r.origen)}</td>
        <td>${r.estado === "USADO" ? '<span class="chip usado">usado</span>' : esc(r.estado?.toLowerCase?.() ?? r.estado)}</td>
        <td class="num">${r.die != null ? r.die + "%" : "—"}</td>
        <td class="num">${r.iva != null ? r.iva + "%" : "—"}</td>
        <td class="num">${r.fob != null ? "$" + r.fob.toLocaleString("es-AR") : "—"}</td>
      </tr>`
    )
    .join("\n");

  const chips = rubros
    .map((r) => `<button class="fchip" data-f="${esc(r)}">${esc(r)} <span>${rows.filter((x) => x.rubro === r).length}</span></button>`)
    .join("\n      ");

  const html = `<title>Catálogo NCM — despachos E-COMEX</title>
<style>
  :root{
    --bg:#f4f7f8; --panel:#ffffff; --panel-2:#eef3f5;
    --ink:#14212b; --muted:#566572; --faint:#8697a3;
    --line:rgba(20,33,43,.10); --line-2:rgba(20,33,43,.16);
    --accent:#0e7c8c; --accent-fill:#18c3d6; --accent-tint:rgba(24,195,214,.12);
    --ok:#1c9257; --ok-tint:rgba(28,146,87,.13);
    --warn:#a9721a; --warn-tint:rgba(197,140,40,.15);
    --usado:#5a5aa8; --usado-tint:rgba(90,90,168,.14);
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme:dark){
    :root{
      --bg:#0a1219; --panel:#101d27; --panel-2:#0c1720;
      --ink:#e8eef3; --muted:#93a4b1; --faint:#61717e;
      --line:rgba(255,255,255,.09); --line-2:rgba(255,255,255,.16);
      --accent:#3dd0e0; --accent-fill:#18c3d6; --accent-tint:rgba(24,195,214,.11);
      --ok:#41c483; --ok-tint:rgba(65,196,131,.13);
      --warn:#e0a94a; --warn-tint:rgba(224,169,74,.13);
      --usado:#9a9ae0; --usado-tint:rgba(154,154,224,.15);
    }
  }
  :root[data-theme="light"]{ --bg:#f4f7f8; --panel:#ffffff; --panel-2:#eef3f5; --ink:#14212b; --muted:#566572; --faint:#8697a3; --line:rgba(20,33,43,.10); --line-2:rgba(20,33,43,.16); --accent:#0e7c8c; --accent-fill:#18c3d6; --accent-tint:rgba(24,195,214,.12); --ok:#1c9257; --ok-tint:rgba(28,146,87,.13); --warn:#a9721a; --warn-tint:rgba(197,140,40,.15); --usado:#5a5aa8; --usado-tint:rgba(90,90,168,.14); }
  :root[data-theme="dark"]{ --bg:#0a1219; --panel:#101d27; --panel-2:#0c1720; --ink:#e8eef3; --muted:#93a4b1; --faint:#61717e; --line:rgba(255,255,255,.09); --line-2:rgba(255,255,255,.16); --accent:#3dd0e0; --accent-fill:#18c3d6; --accent-tint:rgba(24,195,214,.11); --ok:#41c483; --ok-tint:rgba(65,196,131,.13); --warn:#e0a94a; --warn-tint:rgba(224,169,74,.13); --usado:#9a9ae0; --usado-tint:rgba(154,154,224,.15); }

  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;line-height:1.5}
  .wrap{max-width:1100px;margin:0 auto;padding:clamp(1.1rem,3vw,2.6rem) clamp(.9rem,3vw,1.8rem) 4rem}

  .eyebrow{font-family:var(--mono);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);margin:0 0 .5rem}
  h1{font-size:clamp(1.5rem,3.6vw,2rem);line-height:1.08;letter-spacing:-.02em;font-weight:800;margin:0 0 .45rem;text-wrap:balance}
  .lede{font-size:1.02rem;color:var(--muted);margin:0;max-width:60ch}

  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:.7rem;margin:1.6rem 0}
  .stat{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:.85rem .95rem}
  .stat .n{font-size:1.7rem;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
  .stat.accent .n{color:var(--accent)} .stat.ok .n{color:var(--ok)}
  .stat .l{font-size:.78rem;color:var(--muted);margin-top:.1rem}

  .controls{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:1.3rem 0 .9rem}
  .search{flex:1 1 210px;min-width:180px;background:var(--panel);border:1px solid var(--line-2);border-radius:9px;padding:.5rem .75rem;color:var(--ink);font:inherit;font-size:.9rem}
  .search:focus{outline:2px solid var(--accent);outline-offset:1px}
  .fchip{background:var(--panel);border:1px solid var(--line-2);border-radius:999px;padding:.34rem .7rem;font:inherit;font-size:.82rem;color:var(--muted);cursor:pointer;display:inline-flex;gap:.35rem;align-items:center;transition:.12s}
  .fchip span{font-variant-numeric:tabular-nums;font-size:.74rem;color:var(--faint)}
  .fchip:hover{border-color:var(--accent)}
  .fchip[aria-pressed="true"]{background:var(--accent-tint);border-color:var(--accent);color:var(--ink)}
  .fchip[aria-pressed="true"] span{color:var(--accent)}

  .tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
  table{width:100%;border-collapse:collapse;font-size:.88rem;min-width:720px}
  thead th{position:sticky;top:0;background:var(--panel-2);text-align:left;font-size:.72rem;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:.6rem .8rem;border-bottom:1px solid var(--line-2);white-space:nowrap;z-index:1}
  tbody td{padding:.58rem .8rem;border-bottom:1px solid var(--line);vertical-align:top}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:hover{background:var(--panel-2)}
  .prod{font-weight:600;max-width:340px}
  .op{display:inline-block;font-family:var(--mono);font-size:.68rem;color:var(--faint);background:var(--panel-2);border:1px solid var(--line);border-radius:5px;padding:.02rem .3rem;margin-right:.45rem;vertical-align:1px}
  .mono{font-family:var(--mono)} .ncm{font-weight:600;color:var(--accent);white-space:nowrap}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .rubro{white-space:nowrap;color:var(--muted)}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-fill);margin-right:.4rem;vertical-align:0}
  .chip{font-size:.68rem;font-weight:700;padding:.05rem .4rem;border-radius:999px;white-space:nowrap}
  .chip.warn{background:var(--warn-tint);color:var(--warn)}
  .chip.usado{background:var(--usado-tint);color:var(--usado)}

  .empty{padding:2rem;text-align:center;color:var(--faint);display:none}
  .foot{margin-top:1.4rem;color:var(--faint);font-size:.82rem;display:flex;flex-wrap:wrap;gap:.4rem 1rem}
  .foot b{color:var(--muted);font-weight:600}
  @media (max-width:560px){ .prod{max-width:200px} }
</style>

<div class="wrap">
  <p class="eyebrow">E-COMEX · Catálogo verificado producto → NCM</p>
  <h1>Clasificaciones de tus despachos reales</h1>
  <p class="lede">Extraídas de despachos de importación oficializados por AFIP. Cada fila es una posición NCM que ya pasó aduana — con su origen, estado y tasas reales. Filtrá por rubro o buscá para revisar antes de cargarlas al motor de cotización.</p>

  <div class="stats">
    <div class="stat accent"><div class="n">${rows.length}</div><div class="l">productos con NCM validado</div></div>
    <div class="stat"><div class="n">${caps}</div><div class="l">capítulos NCM cubiertos</div></div>
    <div class="stat"><div class="n">${rubros.length}</div><div class="l">rubros</div></div>
    <div class="stat"><div class="n">${soloCot}</div><div class="l">solo cotización (excluidas)</div></div>
  </div>

  <div class="controls">
    <input class="search" type="search" placeholder="Buscar producto, NCM u origen…" aria-label="Buscar">
    <button class="fchip" data-f="__all" aria-pressed="true">Todos <span>${rows.length}</span></button>
    ${chips}
  </div>

  <div class="tablewrap">
    <table>
      <thead><tr>
        <th>Producto</th><th>NCM</th><th>Rubro</th><th>Origen</th><th>Estado</th><th>DIE</th><th>IVA</th><th>FOB</th>
      </tr></thead>
      <tbody id="tb">
${rowsHtml}
      </tbody>
    </table>
    <div class="empty" id="empty">Sin resultados para ese filtro.</div>
  </div>

  <div class="foot">
    <span><b>Fuente:</b> despachos de importación E-COMEX (Drive)</span>
    <span><b>Verificación:</b> oficializado por AFIP</span>
    <span><b>Nota:</b> las marcadas “revisar” tienen la clasificación a validar antes de darlas por oro</span>
  </div>
</div>

<script>
(function(){
  var tb=document.getElementById('tb'), rows=[].slice.call(tb.querySelectorAll('tr'));
  var chips=[].slice.call(document.querySelectorAll('.fchip'));
  var search=document.querySelector('.search'), empty=document.getElementById('empty');
  var activeF='__all';
  // color por rubro (tinte del punto)
  var palette=['#18c3d6','#1c9257','#a9721a','#5a5aa8','#c2506a','#2f8f7a','#7a6cd6','#b08a2a','#3d8bd0','#c96a3a','#4aa06a','#8a5ad6'];
  var seen={}, i=0;
  [].slice.call(document.querySelectorAll('.dot')).forEach(function(d){var r=d.getAttribute('data-r');if(!(r in seen)){seen[r]=palette[i++%palette.length];}d.style.background=seen[r];});
  function apply(){
    var q=(search.value||'').trim().toLowerCase(), n=0;
    rows.forEach(function(tr){
      var okF=activeF==='__all'||tr.getAttribute('data-rubro')===activeF;
      var okQ=!q||tr.getAttribute('data-txt').indexOf(q)>=0;
      var show=okF&&okQ; tr.style.display=show?'':'none'; if(show)n++;
    });
    empty.style.display=n?'none':'block';
  }
  chips.forEach(function(c){c.addEventListener('click',function(){chips.forEach(function(x){x.setAttribute('aria-pressed','false');});c.setAttribute('aria-pressed','true');activeF=c.getAttribute('data-f');apply();});});
  search.addEventListener('input',apply);
})();
</script>
`;

  fs.writeFileSync(out, html);
  console.log(`✔ Reporte escrito en ${out} (${rows.length} filas)`);
}

main();
