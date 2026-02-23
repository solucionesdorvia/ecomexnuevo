import * as XLSX from "xlsx";

export type ParsedBudget = {
  // Key figures used in the PDF
  totalToShowUsd: number | null; // Parametros!H20
  ivaUsd: number | null; // Parametros!H24
  totalToPayUsd: number | null; // H20 + H24
  totalTributosUsd: number | null; // from label "Total Tributos en Dolares" when present

  // Costs used in the PDF
  fobUsd: number | null; // EXW/FOB total
  fleteUsd: number | null;
  seguroUsd: number | null;
  honorariosUsd: number | null;
  depositoUsd: number | null;
  transporteNacionalUsd: number | null;
  transferenciaIntlUsd: number | null;
  arancelSimUsd: number | null;

  taxLines: Array<{ label: string; amountUsd: number }>;

  // Optional: line items table (from Derechos)
  items: Array<{
    item: string;
    quantity: number | null;
    fobItemUsd: number | null;
    costoFinalItemUsd: number | null;
    costoUnitarioUsd: number | null;
  }>;

  // For audit/debug (keep formulas if present)
  formulas?: Record<string, string>;
};

function asNum(v: any): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v ?? "").trim();
  if (!s) return null;
  s = s
    .replace(/\s+/g, "")
    .replace(/^USD/i, "")
    .replaceAll("$", "");
  // es-AR: thousands "." and decimal ","
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // en-US style thousands commas
    s = s.replace(/,/g, "");
  }
  s = s.replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function sheetNameMap(wb: XLSX.WorkBook) {
  const m = new Map<string, string>();
  for (const n of wb.SheetNames) m.set(n.toLowerCase(), n);
  return m;
}

function cellValue(sheet: XLSX.WorkSheet, addr: string) {
  const c: any = (sheet as any)[addr];
  if (!c) return { v: null as any, f: null as string | null };
  return { v: c.v ?? null, f: typeof c.f === "string" ? c.f : null };
}

function findLabelValueInSheet(sheet: XLSX.WorkSheet, label: string) {
  const target = label.toLowerCase();
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell: any = (sheet as any)[addr];
      const text = typeof cell?.v === "string" ? cell.v.trim().toLowerCase() : "";
      if (text === target) {
        // best-effort: value is to the right
        for (let cc = c + 1; cc <= Math.min(range.e.c, c + 6); cc++) {
          const vAddr = XLSX.utils.encode_cell({ r, c: cc });
          const vCell: any = (sheet as any)[vAddr];
          if (vCell && vCell.v != null && String(vCell.v).trim() !== "") {
            return { addr: vAddr, value: vCell.v as any };
          }
        }
      }
    }
  }
  return null;
}

function findLabelValueAcrossSheets(
  wb: XLSX.WorkBook,
  sheetNames: string[],
  label: string
) {
  for (const s of sheetNames) {
    const sheet = wb.Sheets[s];
    if (!sheet) continue;
    const hit = findLabelValueInSheet(sheet, label);
    if (hit) return { sheetName: s, ...hit };
  }
  return null;
}

export function parseBudgetXlsx(bytes: Uint8Array): ParsedBudget {
  const wb = XLSX.read(bytes, { type: "array", cellFormula: true, cellText: false });
  const names = sheetNameMap(wb);

  const formulas: Record<string, string> = {};

  // Parametros fixed cells
  const parametrosName = names.get("parametros") || "Parametros";
  const parametros = wb.Sheets[parametrosName];
  if (!parametros) {
    return {
      totalToShowUsd: null,
      ivaUsd: null,
      totalToPayUsd: null,
      totalTributosUsd: null,
      fobUsd: null,
      fleteUsd: null,
      seguroUsd: null,
      honorariosUsd: null,
      depositoUsd: null,
      transporteNacionalUsd: null,
      transferenciaIntlUsd: null,
      arancelSimUsd: null,
      taxLines: [],
      items: [],
      formulas,
    };
  }

  const h20 = cellValue(parametros, "H20");
  const h24 = cellValue(parametros, "H24");
  if (h20.f) formulas[`${parametrosName}!H20`] = h20.f;
  if (h24.f) formulas[`${parametrosName}!H24`] = h24.f;

  const totalToShowUsd = asNum(h20.v);
  const ivaUsd = asNum(h24.v);
  const totalToPayUsd =
    totalToShowUsd != null && ivaUsd != null ? totalToShowUsd + ivaUsd : totalToShowUsd;

  const cargaDeDatosName =
    names.get("carga de datos") || names.get("carga de datos ") || "Carga de Datos";
  const preferredSheets = [cargaDeDatosName, parametrosName].filter(Boolean);

  const totalTributosHit = findLabelValueAcrossSheets(wb, preferredSheets, "Total Tributos en Dolares");
  const totalTributosUsd = totalTributosHit ? asNum(totalTributosHit.value) : null;

  const fobHit = findLabelValueAcrossSheets(wb, preferredSheets, "FOB UNITARIO") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "FOB");
  const fobUsd = fobHit ? asNum(fobHit.value) : null;

  const fleteHit =
    findLabelValueAcrossSheets(wb, preferredSheets, "Costo Logistica Int.") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Flete Internacional");
  const fleteUsd = fleteHit ? asNum(fleteHit.value) : null;

  const seguroHit =
    findLabelValueAcrossSheets(wb, preferredSheets, "Costo Seguro") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Seguro");
  const seguroUsd = seguroHit ? asNum(seguroHit.value) : null;

  const honorariosHit =
    findLabelValueAcrossSheets(wb, preferredSheets, "Costo Despachante") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Honorarios");
  const honorariosUsd = honorariosHit ? asNum(honorariosHit.value) : null;

  const depositoHit =
    findLabelValueAcrossSheets(wb, preferredSheets, "Gastos Terminal") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Costo Portuario") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Gastos de depósito y portuarios");
  const depositoUsd = depositoHit ? asNum(depositoHit.value) : null;

  const transporteHit =
    findLabelValueAcrossSheets(wb, preferredSheets, "Costo Logistica Nac.") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Camion CTN") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Transporte territorio nacional");
  const transporteNacionalUsd = transporteHit ? asNum(transporteHit.value) : null;

  const transferenciaHit =
    findLabelValueAcrossSheets(wb, preferredSheets, "Costo Bancario") ??
    findLabelValueAcrossSheets(wb, preferredSheets, "Gastos transferencia intl");
  const transferenciaIntlUsd = transferenciaHit ? asNum(transferenciaHit.value) : null;

  // Items from Derechos
  const derechosName = names.get("derechos") || "Derechos";
  const derechos = wb.Sheets[derechosName];
  const items: ParsedBudget["items"] = [];
  let arancelSimUsd: number | null = null;
  if (derechos) {
    const json = XLSX.utils.sheet_to_json(derechos, { header: 1, raw: true }) as any[][];
    if (Array.isArray(json) && json.length) {
      // Header row is usually row 1 in the HTML export. We'll find it by label.
      const headerIdx = json.findIndex((row) =>
        row?.some((c: any) => String(c || "").toLowerCase().includes("item"))
      );
      const start = headerIdx >= 0 ? headerIdx + 1 : 1;
      for (let i = start; i < json.length; i++) {
        const row = json[i] || [];
        const item = String(row[2] || "").trim();
        const qty = asNum(row[1]);
        const fob = asNum(row[10]);
        const costoFinal = asNum(row[12]);
        const costoUnit = asNum(row[0]);
        if (!item) continue;
        items.push({
          item,
          quantity: qty,
          fobItemUsd: fob,
          costoFinalItemUsd: costoFinal,
          costoUnitarioUsd: costoUnit,
        });
      }

      // Try find ARANCEL SIM somewhere in the sheet (label style exports).
      const arancelHit = findLabelValueInSheet(derechos, "ARANCEL SIM");
      arancelSimUsd = arancelHit ? asNum(arancelHit.value) : null;
    }
  }

  const taxLines: Array<{ label: string; amountUsd: number }> = [];
  const pushTax = (label: string) => {
    const hit = findLabelValueAcrossSheets(wb, [cargaDeDatosName], label);
    const amt = hit ? asNum(hit.value) : null;
    if (amt != null) taxLines.push({ label, amountUsd: amt });
  };
  // Labels as seen in the sheet export
  pushTax("Derechos");
  pushTax("Tasa de Estadistica");
  pushTax("IVA");
  pushTax("IVA Adicional");
  pushTax("Impuesto a las Ganancias");
  pushTax("IIBB");
  pushTax("Tasa SIM");

  return {
    totalToShowUsd,
    ivaUsd,
    totalToPayUsd,
    totalTributosUsd,
    fobUsd,
    fleteUsd,
    seguroUsd,
    honorariosUsd,
    depositoUsd,
    transporteNacionalUsd,
    transferenciaIntlUsd,
    arancelSimUsd,
    taxLines,
    items,
    formulas,
  };
}

