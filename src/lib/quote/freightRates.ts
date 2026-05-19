/** Tasas de flete reales provistas por el encargado de comercio exterior. */

const IVA = 0.21;

// ── Aéreo ────────────────────────────────────────────────────────────────────

export const AIR_RATES = {
  USA_FCA: {
    awbFlat: 40,
    airTransferPerKg: 0.15,
    airTransferMinUsd: 50,
    freightPerKg: 3.5,
    destination: {
      corteGuia: 220 * (1 + IVA), // 266.20
      handling: 50 * (1 + IVA),   //  60.50
    },
  },
  CHINA_FOB: {
    freightPerKg: 9,
    destination: {
      corteGuia: 220 * (1 + IVA),
      handling: 50 * (1 + IVA),
    },
  },
} as const;

// ── Almacenaje (fiscal / depósito destino) ───────────────────────────────────

export const ALMACENAJE_RATES = {
  airFlat: 250,           // USD fijo por envío aéreo (promedio)
  fcl20: 1500,            // USD fijo por contenedor 20'
  fcl40: 1800,            // USD fijo por contenedor 40'
  lclFlat: 1500,          // USD fijo por embarque LCL
} as const;

// ── Marítimo FCL ─────────────────────────────────────────────────────────────

export const FCL_RATES = {
  CHINA: {
    flete20: 5300,
    flete40: 5500,
    destination: 890 * (1 + IVA), // 1076.90
  },
  EUROPE: {
    flete20: 550,
    flete40: 650,
    destination: 890 * (1 + IVA),
  },
} as const;

// ── Marítimo LCL (por T/M3 — el mayor entre toneladas y m3) ─────────────────

export const LCL_RATES = {
  CHINA: {
    freightPerTM3: 50,
    destination: { handling: 50, desconsolidacionPerTM3: 25 },
  },
  EUROPE: {
    freightPerTM3Eur: 20, // EUR — se convierte a USD con EUR_USD_APPROX
    destination: { handling: 50, desconsolidacionPerTM3: 25 },
  },
  USA: {
    freightPerTM3: 30,
    destination: { handling: 50, desconsolidacionPerTM3: 25 },
  },
} as const;

export const EUR_USD_APPROX = 1.1;

// ── Zona de origen ───────────────────────────────────────────────────────────

export type OriginZone = "CHINA" | "USA" | "EUROPE" | "OTHER";

export function detectOriginZone(origin: string): OriginZone {
  const o = origin.toLowerCase();
  if (/chin|shenzhen|guangzhou|yiwu|hangzhou|shanghai|hong.?kong|taiw/.test(o))
    return "CHINA";
  if (/usa|estados unidos|eeuu|ee\.?uu|new york|miami|los angeles|california|florida|united states/.test(o))
    return "USA";
  if (/europa|europe|aleman|german|espa[ñn]|spain|italia|italy|france|francia|holand|nether|belg|portug|uk|reino unido/.test(o))
    return "EUROPE";
  return "OTHER";
}

// ── Estimación de peso y volumen por NCM / nombre ────────────────────────────

export type UnitDimensions = { kg: number; m3: number };

export function estimateUnitDimensions(ncm?: string, title?: string): UnitDimensions {
  const heading = ncm ? parseInt(ncm.replace(/\D/g, "").slice(0, 4), 10) : NaN;
  const t = (title ?? "").toLowerCase();

  // Electrónica / tecnología
  if (heading === 8471 || /laptop|notebook|macbook|computer/.test(t))  return { kg: 2.0, m3: 0.006 };
  if (heading === 8517 || /iphone|smartphone|celular|phone/.test(t))   return { kg: 0.2, m3: 0.0006 };
  if (heading === 8518 || /auricular|headphone|earphone/.test(t))      return { kg: 0.3, m3: 0.002 };
  if (heading === 8528 || /televisor|monitor|tv\b/.test(t))            return { kg: 5.0, m3: 0.04 };
  if (heading === 8516 || /cargador|charger|usb/.test(t))              return { kg: 0.3, m3: 0.001 };
  if (heading >= 8501 && heading <= 8543)                              return { kg: 1.0, m3: 0.003 };

  // Textil / indumentaria
  if ((heading >= 6101 && heading <= 6117) || /remera|camiseta|t.?shirt/.test(t))  return { kg: 0.25, m3: 0.001 };
  if ((heading >= 6201 && heading <= 6217) || /campera|jacket|abrigo/.test(t))     return { kg: 0.5, m3: 0.002 };
  if (heading >= 6101 && heading <= 6311)                                           return { kg: 0.35, m3: 0.0015 };

  // Calzado
  if (heading >= 6401 && heading <= 6405) return { kg: 0.6, m3: 0.003 };

  // Maquinaria industrial
  if ((heading >= 8401 && heading <= 8479) || /maquin|machine|industrial|cnc|sierra|cortad|stone|piedra/.test(t))
    return { kg: 80, m3: 0.3 };

  // Vehículos / autopartes
  if (heading >= 8701 && heading <= 8716) return { kg: 150, m3: 0.8 };
  if (heading >= 8701 && heading <= 8799) return { kg: 5, m3: 0.02 };

  // Muebles
  if (heading >= 9401 && heading <= 9406) return { kg: 12, m3: 0.2 };

  // Juguetes / deportes
  if (heading >= 9501 && heading <= 9508) return { kg: 0.5, m3: 0.005 };
  if (heading >= 9506 && heading <= 9508) return { kg: 1.0, m3: 0.008 };

  // Cosméticos / higiene
  if (heading >= 3301 && heading <= 3307) return { kg: 0.25, m3: 0.0005 };

  // Plásticos / cauchos
  if (heading >= 3901 && heading <= 3999) return { kg: 1.0, m3: 0.001 };

  // Herramientas
  if (heading >= 8201 && heading <= 8215) return { kg: 1.5, m3: 0.003 };

  // Default por palabras clave
  if (/silla|chair/.test(t))   return { kg: 8, m3: 0.15 };
  if (/mesa|table/.test(t))    return { kg: 20, m3: 0.4 };
  if (/bicicleta|bicycle/.test(t)) return { kg: 12, m3: 0.25 };

  return { kg: 1.0, m3: 0.003 };
}

// ── Modo de envío ────────────────────────────────────────────────────────────

export type ShippingMode = "air_usa" | "air_china" | "lcl_china" | "lcl_europe" | "lcl_usa" | "fcl20_china" | "fcl20_europe";

export function selectShippingMode(zone: OriginZone, totalKg: number): ShippingMode {
  // USA: air para envíos ligeros (≤30 kg), marítimo LCL para cargas mayores
  if (zone === "USA" && totalKg <= 30) return "air_usa";
  if (zone === "USA") return "lcl_usa";
  if (zone === "EUROPE") return "lcl_europe";
  // China: air si es liviano y pequeño, maritimo si es volumen
  if (zone === "CHINA" && totalKg <= 30) return "air_china";
  if (zone === "CHINA") return "lcl_china";
  // Otros orígenes: usar tarifas China como proxy
  if (totalKg <= 30) return "air_china";
  return "lcl_china";
}

// ── Cálculo de flete real ────────────────────────────────────────────────────

export type FreightResult = {
  mode: ShippingMode;
  totalUsd: number;
  almacenajeUsd: number;
  label: string;
  detail: string;
  estimatedKg: number;
};

export function calcFreightCost(
  zone: OriginZone,
  totalKg: number,
  totalM3: number,
  mode?: ShippingMode
): FreightResult {
  const m = mode ?? selectShippingMode(zone, totalKg);

  // T/M3: el mayor entre toneladas y m3
  const tM3 = Math.max(totalKg / 1000, totalM3);

  const alm = ALMACENAJE_RATES;

  switch (m) {
    case "air_usa": {
      const r = AIR_RATES.USA_FCA;
      const airTransfer = Math.max(r.airTransferMinUsd, totalKg * r.airTransferPerKg);
      const flete = r.awbFlat + airTransfer + totalKg * r.freightPerKg + r.destination.corteGuia + r.destination.handling;
      return {
        mode: m,
        totalUsd: Math.round(flete) + alm.airFlat,
        almacenajeUsd: alm.airFlat,
        label: "Aéreo — EE.UU. (FCA)",
        detail: `AWB $${r.awbFlat} + Air Transfer $${Math.round(airTransfer)} + flete $${Math.round(totalKg * r.freightPerKg)} (${Math.round(totalKg)} kg × USD ${r.freightPerKg}/kg) + destino $${Math.round(r.destination.corteGuia + r.destination.handling)} + almacenaje $${alm.airFlat}`,
        estimatedKg: totalKg,
      };
    }
    case "air_china": {
      const r = AIR_RATES.CHINA_FOB;
      const flete = totalKg * r.freightPerKg;
      const dest = r.destination.corteGuia + r.destination.handling;
      return {
        mode: m,
        totalUsd: Math.round(flete + dest) + alm.airFlat,
        almacenajeUsd: alm.airFlat,
        label: "Aéreo — China (FOB)",
        detail: `Flete $${Math.round(flete)} (${Math.round(totalKg)} kg × USD ${r.freightPerKg}/kg) + destino $${Math.round(dest)} + almacenaje $${alm.airFlat}`,
        estimatedKg: totalKg,
      };
    }
    case "lcl_china": {
      const r = LCL_RATES.CHINA;
      const tm3Charged = Math.max(tM3, 0.01);
      const flete = tm3Charged * r.freightPerTM3;
      const desconsolid = tm3Charged * r.destination.desconsolidacionPerTM3;
      const subtotal = flete + r.destination.handling + desconsolid;
      return {
        mode: m,
        totalUsd: Math.round(subtotal) + alm.lclFlat,
        almacenajeUsd: alm.lclFlat,
        label: "Marítimo LCL — China",
        detail: `Flete $${Math.round(flete)} (${tM3.toFixed(3)} T/M3 × USD ${r.freightPerTM3}) + handling $${r.destination.handling} + desconsolidación $${Math.round(desconsolid)} + almacenaje $${alm.lclFlat}`,
        estimatedKg: totalKg,
      };
    }
    case "lcl_europe": {
      const r = LCL_RATES.EUROPE;
      const tm3Charged = Math.max(tM3, 0.01);
      const fleteEur = tm3Charged * r.freightPerTM3Eur;
      const fleteUsd = fleteEur * EUR_USD_APPROX;
      const desconsolid = tm3Charged * r.destination.desconsolidacionPerTM3;
      const subtotal = fleteUsd + r.destination.handling + desconsolid;
      return {
        mode: m,
        totalUsd: Math.round(subtotal) + alm.lclFlat,
        almacenajeUsd: alm.lclFlat,
        label: "Marítimo LCL — Europa",
        detail: `Flete EUR ${Math.round(fleteEur)} (≈ USD ${Math.round(fleteUsd)}) + handling $${r.destination.handling} + desconsolidación $${Math.round(desconsolid)} + almacenaje $${alm.lclFlat}`,
        estimatedKg: totalKg,
      };
    }
    case "lcl_usa": {
      const r = LCL_RATES.USA;
      const tm3Charged = Math.max(tM3, 0.01);
      const flete = tm3Charged * r.freightPerTM3;
      const desconsolid = tm3Charged * r.destination.desconsolidacionPerTM3;
      const subtotal = flete + r.destination.handling + desconsolid;
      return {
        mode: m,
        totalUsd: Math.round(subtotal) + alm.lclFlat,
        almacenajeUsd: alm.lclFlat,
        label: "Marítimo LCL — EE.UU.",
        detail: `Flete $${Math.round(flete)} (${tM3.toFixed(3)} T/M3 × USD ${r.freightPerTM3}) + handling $${r.destination.handling} + desconsolidación $${Math.round(desconsolid)} + almacenaje $${alm.lclFlat}`,
        estimatedKg: totalKg,
      };
    }
    case "fcl20_china": {
      const r = FCL_RATES.CHINA;
      const subtotal = r.flete20 + r.destination;
      return {
        mode: m,
        totalUsd: Math.round(subtotal) + alm.fcl20,
        almacenajeUsd: alm.fcl20,
        label: "Marítimo FCL 20' — China",
        detail: `Flete $${r.flete20} + gastos destino $${Math.round(r.destination)} + almacenaje $${alm.fcl20}`,
        estimatedKg: totalKg,
      };
    }
    case "fcl20_europe": {
      const r = FCL_RATES.EUROPE;
      const subtotal = r.flete20 + r.destination;
      return {
        mode: m,
        totalUsd: Math.round(subtotal) + alm.fcl20,
        almacenajeUsd: alm.fcl20,
        label: "Marítimo FCL 20' — Europa",
        detail: `Flete $${r.flete20} + gastos destino $${Math.round(r.destination)} + almacenaje $${alm.fcl20}`,
        estimatedKg: totalKg,
      };
    }
  }
}
