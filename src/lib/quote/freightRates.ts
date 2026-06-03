/** Tasas de flete reales provistas por el encargado de comercio exterior. */

const IVA = 0.21;

// ── Aéreo ────────────────────────────────────────────────────────────────────

export const AIR_RATES = {
  USA_FCA: {
    awbFlat: 40,
    airTransferPerKg: 0.15,
    airTransferMinUsd: 50,
    freightPerKg: 250,
    destination: {
      corteGuia: 220 * (1 + IVA), // 266.20
      handling: 50 * (1 + IVA),   //  60.50
    },
  },
  CHINA_FOB: {
    freightPerKg: 250,
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
    flete20: 4000,
    flete40: 6000,
    destination: 890 * (1 + IVA), // 1076.90
  },
  EUROPE: {
    flete20: 2500,
    flete40: 3800,
    destination: 890 * (1 + IVA),
  },
} as const;

// ── Marítimo LCL (tarifa plana por embarque) ─────────────────────────────────

export const LCL_RATES = {
  CHINA: {
    fleteFlat: 1500,
    destination: { handling: 50 },
  },
  EUROPE: {
    fleteFlat: 1500,
    destination: { handling: 50 },
  },
  USA: {
    fleteFlat: 1500,
    destination: { handling: 50 },
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
  // Normalizar: minúsculas + quitar tildes para que "máquina" matchee "maquin", etc.
  const t = (title ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  // Electrónica / tecnología
  if (heading === 8471 || /laptop|notebook|macbook|computer/.test(t))  return { kg: 2.0, m3: 0.006 };
  if (heading === 8517 || /iphone|smartphone|celular|phone/.test(t))   return { kg: 0.2, m3: 0.0006 };
  if (heading === 8518 || /auricular|headphone|earphone/.test(t))      return { kg: 0.3, m3: 0.002 };
  if (heading === 8528 || /televisor|monitor|tv\b/.test(t))            return { kg: 12.0, m3: 0.12 };
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

// Factor IATA: 1 m³ = 167 kg de peso volumétrico (6.000 cm³/kg)
export const AIR_VOL_FACTOR = 167;
// Factor marítimo: 1 CBM = 1.000 kg (revenue ton estándar)
export const SEA_VOL_FACTOR = 1000;

export function selectShippingMode(zone: OriginZone, totalKg: number, totalM3 = 0): ShippingMode {
  // La gran mayoría de importaciones comerciales van por vía marítima.
  // Aéreo se selecciona automáticamente SOLO para envíos muy pequeños
  // que típicamente son muestras o repuestos urgentes.
  // Se usa el "peso cobrable" = max(peso real, peso volumétrico IATA).
  const AIR_AUTO_MAX_KG = 5;

  // Peso cobrable: el mayor entre peso real y peso volumétrico (criterio IATA)
  const volKgAir = totalM3 * AIR_VOL_FACTOR;
  const chargeableKg = Math.max(totalKg, volKgAir);

  if (zone === "USA") {
    return chargeableKg <= AIR_AUTO_MAX_KG ? "air_usa" : "lcl_usa";
  }
  if (zone === "EUROPE") return "lcl_europe"; // Europa siempre marítimo
  if (zone === "CHINA") {
    return chargeableKg <= AIR_AUTO_MAX_KG ? "air_china" : "lcl_china";
  }
  // Otros orígenes: marítimo como proxy de China
  return chargeableKg <= AIR_AUTO_MAX_KG ? "air_china" : "lcl_china";
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
  const m = mode ?? selectShippingMode(zone, totalKg, totalM3);

  const alm = ALMACENAJE_RATES;

  // Peso cobrable según modalidad
  const volKgAir = totalM3 * AIR_VOL_FACTOR;   // IATA: 1 m³ = 167 kg
  const volKgSea = totalM3 * SEA_VOL_FACTOR;   // Marítimo: 1 CBM = 1.000 kg

  switch (m) {
    case "air_usa": {
      const r = AIR_RATES.USA_FCA;
      const chargeableKg = Math.max(totalKg, volKgAir);
      const volNote = volKgAir > totalKg ? ` (peso vol. ${Math.round(volKgAir)} kg)` : "";
      const airTransfer = Math.max(r.airTransferMinUsd, chargeableKg * r.airTransferPerKg);
      const flete = r.awbFlat + airTransfer + chargeableKg * r.freightPerKg + r.destination.corteGuia + r.destination.handling;
      return {
        mode: m,
        totalUsd: Math.round(flete) + alm.airFlat,
        almacenajeUsd: alm.airFlat,
        label: "Flete internacional",
        detail: `AWB $${r.awbFlat} + Air Transfer $${Math.round(airTransfer)} + flete $${Math.round(chargeableKg * r.freightPerKg)} (${Math.round(chargeableKg)} kg${volNote} × USD ${r.freightPerKg}/kg) + destino $${Math.round(r.destination.corteGuia + r.destination.handling)} + almacenaje $${alm.airFlat}`,
        estimatedKg: chargeableKg,
      };
    }
    case "air_china": {
      const r = AIR_RATES.CHINA_FOB;
      const chargeableKg = Math.max(totalKg, volKgAir);
      const volNote = volKgAir > totalKg ? ` (peso vol. ${Math.round(volKgAir)} kg)` : "";
      const flete = chargeableKg * r.freightPerKg;
      const dest = r.destination.corteGuia + r.destination.handling;
      return {
        mode: m,
        totalUsd: Math.round(flete + dest) + alm.airFlat,
        almacenajeUsd: alm.airFlat,
        label: "Flete internacional",
        detail: `Flete $${Math.round(flete)} (${Math.round(chargeableKg)} kg${volNote} × USD ${r.freightPerKg}/kg) + destino $${Math.round(dest)} + almacenaje $${alm.airFlat}`,
        estimatedKg: chargeableKg,
      };
    }
    case "lcl_china": {
      const r = LCL_RATES.CHINA;
      const chargeableSea = Math.max(totalKg, volKgSea);
      const subtotal = r.fleteFlat + r.destination.handling;
      return {
        mode: m,
        totalUsd: subtotal + alm.lclFlat,
        almacenajeUsd: alm.lclFlat,
        label: "Flete internacional",
        detail: `Flete USD ${r.fleteFlat} (tarifa plana, carga cobrable ${Math.round(chargeableSea)} kg) + handling $${r.destination.handling} + almacenaje $${alm.lclFlat}`,
        estimatedKg: chargeableSea,
      };
    }
    case "lcl_europe": {
      const r = LCL_RATES.EUROPE;
      const chargeableSea = Math.max(totalKg, volKgSea);
      const subtotal = r.fleteFlat + r.destination.handling;
      return {
        mode: m,
        totalUsd: subtotal + alm.lclFlat,
        almacenajeUsd: alm.lclFlat,
        label: "Flete internacional",
        detail: `Flete USD ${r.fleteFlat} (tarifa plana, carga cobrable ${Math.round(chargeableSea)} kg) + handling $${r.destination.handling} + almacenaje $${alm.lclFlat}`,
        estimatedKg: chargeableSea,
      };
    }
    case "lcl_usa": {
      const r = LCL_RATES.USA;
      const chargeableSea = Math.max(totalKg, volKgSea);
      const subtotal = r.fleteFlat + r.destination.handling;
      return {
        mode: m,
        totalUsd: subtotal + alm.lclFlat,
        almacenajeUsd: alm.lclFlat,
        label: "Flete internacional",
        detail: `Flete USD ${r.fleteFlat} (tarifa plana, carga cobrable ${Math.round(chargeableSea)} kg) + handling $${r.destination.handling} + almacenaje $${alm.lclFlat}`,
        estimatedKg: chargeableSea,
      };
    }
    case "fcl20_china": {
      const r = FCL_RATES.CHINA;
      const subtotal = r.flete20 + r.destination;
      return {
        mode: m,
        totalUsd: Math.round(subtotal) + alm.fcl20,
        almacenajeUsd: alm.fcl20,
        label: "Flete internacional",
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
        label: "Flete internacional",
        detail: `Flete $${r.flete20} + gastos destino $${Math.round(r.destination)} + almacenaje $${alm.fcl20}`,
        estimatedKg: totalKg,
      };
    }
  }
}
