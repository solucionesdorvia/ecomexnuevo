/* eslint-disable @typescript-eslint/no-explicit-any */
// Import quote calculator — dynamic product JSON shapes require any casts.
import { getArsPerUsd } from "@/lib/fx/arsPerUsd";
import { detectOriginZone, estimateUnitDimensions, calcFreightCost, chargeableAirKg, ShippingMode, OriginZone } from "./freightRates";
import { hydrateFreightConfig, getFreightConfig, FREIGHT_IVA } from "./freightRatesConfig";
import { hydrateImportExpenses, computeImportExpenses } from "./importExpensesConfig";
import { getOfficialTariff, getSiblingTariffs } from "@/lib/ncm/tariffRates";

/** De dónde salió el derecho de importación (DIE) aplicado. */
type DieSource = "pcram_live" | "official_offline" | "generic_default";

/** Umbral (en puntos %) para considerar que la subpartida hermana cambia "mucho" el arancel. */
const SIBLING_DIVERGENCE_PP = 10;

/**
 * Derecho de importación por defecto cuando no hay dato real de PCRAM.
 * Autos de pasajeros (8703) y ómnibus (8702) pagan 35% (excepción nacional de
 * vehículos, dato público verificable). El resto mantiene el 14% genérico.
 */
function defaultDieRate(ncm?: string): number {
  const head = ncm ? parseInt(ncm.replace(/\D/g, "").slice(0, 4), 10) : NaN;
  if (head === 8702 || head === 8703) return 0.35;
  return 0.14;
}

/**
 * DIE OFICIAL del nomenclador offline (data/ncm/index.json) para un NCM.
 * Es la fuente de respaldo cuando PCRAM no responde: NO es un valor inventado,
 * es la alícuota oficial de la posición. Devuelve fracción (0.14) o null si el
 * índice no tiene esa posición. Evita caer al genérico / "a confirmar".
 */
function officialDieRate(ncm?: string): number | null {
  if (!ncm) return null;
  const die = getOfficialTariff(ncm)?.diePct;
  if (typeof die !== "number" || !Number.isFinite(die)) return null;
  return die / 100;
}

/**
 * Resuelve el DIE final teniendo en cuenta las subpartidas HERMANAS del heading.
 * Si dentro de la misma partida (4 díg.) el arancel varía mucho (ej. 8419.31=14%
 * vs 8419.39=35%), lo marca como "divergencia" para avisar al usuario. Además, si
 * el dato NO vino de PCRAM en vivo (es decir, la subpartida exacta es menos segura)
 * y hay una hermana más cara, costea con la más alta — CONSERVADOR: nunca subcotiza.
 * Si vino de PCRAM (código exacto + tasa vigente), respeta esa tasa pero igual avisa.
 */
function resolveDieWithSiblings(
  ncm: string | undefined,
  baseRate: number,
  source: DieSource
): { rate: number; source: DieSource; divergence: { minPct: number; maxPct: number } | null } {
  if (!ncm) return { rate: baseRate, source, divergence: null };
  const sibs = getSiblingTariffs(ncm);
  if (sibs.length < 2) return { rate: baseRate, source, divergence: null };
  const dies = sibs.map((s) => s.diePct);
  const minPct = Math.min(...dies);
  const maxPct = Math.max(...dies);
  const divergence = maxPct - minPct >= SIBLING_DIVERGENCE_PP ? { minPct, maxPct } : null;
  let rate = baseRate;
  if (divergence && source !== "pcram_live" && maxPct / 100 > baseRate) {
    rate = maxPct / 100; // conservador: la subpartida más cara del heading
  }
  return { rate, source, divergence };
}
import { assessImportRegime, formatRegimeForExplanation, type RegimeAssessment } from "./regime";

/**
 * Detecta si el precio podría NO estar en USD (el motor asume USD/unidad). Solo
 * dispara con monedas inequívocamente extranjeras o pesos — NO con "$" suelto
 * (ambiguo en AR) ni cuando ya se menciona USD/dólares. Devuelve la moneda detectada.
 */
function detectNonUsdPrice(userText: string): string | null {
  const t = (userText || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/\b(usd|u\$s|us\$|dolar|dolares|d[oó]lar)\b/.test(t)) return null; // precio ya en USD
  if (/\b(yuan|yuanes|cny|rmb|renminbi)\b/.test(t)) return "yuanes (CNY)";
  if (/(€|\beur\b|\beuros?\b)/.test(t)) return "euros (EUR)";
  if (/\b(reales?|brl)\b/.test(t)) return "reales (BRL)";
  if (/\b(pesos?\s*(argentinos?)?|ars)\b/.test(t)) return "pesos (ARS)";
  return null;
}

/** Detecta si el usuario mencionó explícitamente un modo de transporte. */
function detectUserShippingMode(userText: string, zone: OriginZone): ShippingMode | undefined {
  const t = userText.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const wantsAir = /\b(aereo|aerea|avion|aero|airfreight|air\s*freight|por\s*aire|via\s*aerea)\b/.test(t);
  const wantsFcl = /\b(fcl|full\s*container|contenedor\s*completo)\b/.test(t);
  const wantsSea = /\b(maritimo|maritima|barco|buque|navio|sea\s*freight|ocean\s*freight|lcl|maritim)\b/.test(t);

  if (wantsAir) {
    if (zone === "CHINA") return "air_china";
    return "air_usa"; // USA y EUROPE usan misma tabla aérea
  }
  if (wantsFcl) {
    if (zone === "EUROPE") return "fcl20_europe";
    return "fcl20_china"; // China y resto
  }
  if (wantsSea) {
    if (zone === "EUROPE") return "lcl_europe";
    if (zone === "USA") return "lcl_usa";
    return "lcl_china";
  }
  return undefined; // sin preferencia explícita → auto-selección
}

export type QuoteCard = {
  label:
    | "Producto"
    | "Flete internacional"
    | "Impuestos argentinos"
    | "Gestión / despacho"
    | "Total puesto en Argentina"
    | "Tiempos estimados";
  value: string;
  detail?: string;
  highlight?: boolean;
};

type ScrapedProduct = {
  title?: string;
  description?: string;
  origin?: string;
  category?: string;
  ncm?: string;
  fobUsd?: number;
  quantity?: number;
  weightKgPerUnit?: number;
  currency?: string;
  price?: {
    type: "single" | "range" | "unknown";
    min: number | null;
    max: number | null;
    currency: string;
    unit: string;
  };
  supplier?: string;
  url?: string;
  raw?: Record<string, unknown>;
};

type Inputs =
  | {
      mode: "quote";
      product: ScrapedProduct;
      rawUserText: string;
      /** Bien de capital → IVA 10,5% (y IVA adic 10% en reventa). */
      bienDeCapital?: boolean;
      /** Exención explícita de Tasa Estadística (bien de capital sin producción nacional, Mercosur, etc.). */
      exentoTasaEstadistica?: boolean;
      /** Destino: uso propio (bien de uso → exime percepciones) o reventa (las aplica). */
      destino?: "uso_propio" | "reventa";
      /** Perfil fiscal → recuperabilidad (RI recupera IVA + percepciones). */
      perfilImportador?: "responsable_inscripto" | "monotributo" | "persona_fisica" | "sociedad";
      /** Alícuota IIBB ya resuelta por provincia (%). */
      iibbPct?: number;
    }
  | {
      mode: "budget";
      budgetText: string;
    };

function moneyRange(min: number, max: number) {
  const f = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return `${f(min)} – ${f(max)}`;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function parseBudgetUsd(text: string): number | null {
  const t = text.replaceAll(".", "").replaceAll(",", ".");
  const m =
    t.match(/(?:usd|\$)\s*([0-9]+(?:\.[0-9]+)?)/i) ??
    t.match(/([0-9]{2,})(?:\s*(?:usd|dolares|dólares))?/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}


function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Tasa a % exacta (sin redondear a entero): 10,5% / 12,6%. Solo limpia ruido flotante. */
function ratePct(rate: number) {
  return Math.round(rate * 1_000_000) / 10_000;
}

export async function calcImportQuote(inputs: Inputs): Promise<{
  cards: QuoteCard[];
  explanation: string;
  totalMinUsd?: number;
  totalMaxUsd?: number;
  breakdown?: {
    qty: number;
    fobTotalUsd: number;
    fobTotalMinUsd?: number;
    fobTotalMaxUsd?: number;
    fobUnitMinUsd?: number;
    fobUnitMaxUsd?: number;
    fleteMinUsd: number;
    fleteMaxUsd: number;
    fleteMode: string;
    seguroMinUsd: number;
    seguroMaxUsd: number;
    cifMinUsd: number;
    cifMaxUsd: number;
    cifPlusInsuranceMinUsd: number;
    cifPlusInsuranceMaxUsd: number;
    tasaEstadisticaMinUsd: number;
    tasaEstadisticaMaxUsd: number;
    derechosImportacionMinUsd: number;
    derechosImportacionMaxUsd: number;
    ivaMinUsd: number;
    ivaMaxUsd: number;
    ivaAdicionalMinUsd: number;
    ivaAdicionalMaxUsd: number;
    gananciasMinUsd: number;
    gananciasMaxUsd: number;
    iibbMinUsd: number;
    iibbMaxUsd: number;
    impuestosInternosMinUsd: number;
    impuestosInternosMaxUsd: number;
    impuestosTotalMinUsd: number;
    impuestosTotalMaxUsd: number;
    gestionMinUsd: number;
    gestionMaxUsd: number;
    honorariosMinUsd: number;
    honorariosMaxUsd: number;
    arancelSimUsd: number;
    gastosImportacionUsd: number;
    gastosImportacionLines: Array<{ label: string; amountUsd: number }>;
    recuperableMinUsd: number;
    recuperableMaxUsd: number;
    costoRealMinUsd: number;
    costoRealMaxUsd: number;
    esResponsableInscripto: boolean;
    esReventa: boolean;
    depositoPortuarioMinUsd: number;
    depositoPortuarioMaxUsd: number;
    transporteNacionalMinUsd: number;
    transporteNacionalMaxUsd: number;
    transferenciaIntlMinUsd: number;
    transferenciaIntlMaxUsd: number;
    totalMinUsd: number;
    totalMaxUsd: number;
    /** Tasas reales de PCRAM — usadas en el PDF y en la vista web */
    derechosRatePct: number;
    teRatePct: number;
    ivaRatePct: number;
    ivaAdicRatePct: number;
    /** Líneas de impuestos individuales con monto y tasa */
    taxLines: Array<{ label: string; ratePct: number | null; amountUsd: number }>;
    /** Fuente real del DIE aplicado: PCRAM en vivo, nomenclador offline, o genérico. */
    dieSource?: "pcram_live" | "official_offline" | "generic_default";
    /** Si la subpartida del heading tiene aranceles dispares (min/max % del DIE). */
    siblingTariffDivergence?: { minPct: number; maxPct: number } | null;
    /** true solo si el arancel viene de una fuente real (PCRAM o nomenclador). Si es
     *  false, el número es una estimación y NO hay que mostrarlo como firme. */
    arancelConfiable?: boolean;
  };
  assumptions?: Array<{
    id: string;
    label: string;
    value: string;
    source: "pcram" | "user" | "scraper" | "estimate";
    tone?: "muted" | "primary" | "gold" | "success";
  }>;
  quality?: number; // 0..100
  /** Avisos fuertes para el usuario cuando el número NO es confiable (sin clasificar,
   *  arancel genérico, antidumping sin cuantificar, moneda dudosa, etc.). */
  warnings?: string[];
  /** Régimen recomendado (Courier vs General) — Fase 2. */
  regime?: RegimeAssessment;
}> {
  // Carga tarifas de flete y gastos de importación vigentes (defaults ⊕ overrides admin).
  await Promise.all([hydrateFreightConfig(), hydrateImportExpenses()]);

  if (inputs.mode === "budget") {
    const budget = parseBudgetUsd(inputs.budgetText);
    const b = budget ?? 5000;

    const maxFob = clamp(b * 0.35, 800, 20000); // heuristic: landed costs eat a big part
    const suggest = [
      "accesorios electrónicos livianos (sin baterías sueltas)",
      "hogar / organización (plásticos, siliconas, pequeños utensilios)",
      "textil simple (sin marca) con talleaje estándar",
      "herramientas manuales y consumibles industriales",
    ];

    const explanation = [
      `Con un presupuesto de ${money(b)} (estimado), lo más “importable” suele ser producto **liviano**, **de valor medio** y con **demanda clara**.`,
      "",
      `Para que el total puesto en Argentina entre, normalmente conviene apuntar a un FOB total de ~${moneyRange(
        round2(maxFob * 0.85),
        round2(maxFob * 1.05)
      )} dependiendo de peso/volumen y régimen impositivo.`,
      "",
      "Opciones típicamente viables (a validar por clasificación aduanera y documentación):",
      `- ${suggest.slice(0, 3).join("\n- ")}`,
      "",
      "Si me decís:",
      "- presupuesto exacto (USD)",
      "- categoría (o 3 ejemplos de productos)",
      "- provincia de destino",
      "te devuelvo 2–3 alternativas con números más finos.",
    ].join("\n");

    const cards: QuoteCard[] = [
      {
        label: "Producto",
        value: moneyRange(round2(maxFob * 0.85), round2(maxFob * 1.05)),
        detail: "FOB total objetivo para entrar en tu presupuesto (estimación).",
      },
      {
        label: "Flete internacional",
        value: moneyRange(round2(b * 0.08), round2(b * 0.18)),
        detail: "Depende sobre todo de peso/volumen, ruta y consolidación marítima.",
      },
      {
        label: "Impuestos argentinos",
        value: moneyRange(round2(b * 0.22), round2(b * 0.42)),
        detail:
          "Dependen de la clasificación aduanera, origen, valor CIF y tu situación fiscal (percepciones).",
      },
      {
        label: "Gestión / despacho",
        value: moneyRange(220, 650),
        detail: "Honorarios, documental, y costos operativos típicos.",
      },
      {
        label: "Total puesto en Argentina",
        value: moneyRange(round2(b * 0.92), round2(b * 1.05)),
        detail: "Objetivo: que el total final quede dentro de tu presupuesto.",
        highlight: true,
      },
      {
        label: "Tiempos estimados",
        value: "Marítimo: 35–55 días",
        detail: "Incluye origen, consolidación, tránsito y aduana (rango típico).",
      },
    ];

    return { cards, explanation, totalMinUsd: round2(b * 0.92), totalMaxUsd: round2(b * 1.05) };
  }

  const title = inputs.product.title?.trim() || "Producto a definir";
  const origin = inputs.product.origin?.trim() || "Origen a confirmar";
  const ncm = inputs.product.ncm?.trim(); // interno: no se expone al usuario

  const qtyRaw = inputs.product.quantity;
  const qty =
    typeof qtyRaw === "number" && Number.isFinite(qtyRaw)
      ? Math.max(1, Math.floor(qtyRaw))
      : 1;

  const priceCurrency = String(inputs.product.price?.currency ?? "").toUpperCase();
  const hasRawRange =
    inputs.product.price?.type === "range" &&
    typeof inputs.product.price.min === "number" &&
    typeof inputs.product.price.max === "number" &&
    Number.isFinite(inputs.product.price.min) &&
    Number.isFinite(inputs.product.price.max) &&
    inputs.product.price.min > 0 &&
    inputs.product.price.max > 0;

  let explicitRange: { min: number; max: number } | null = null;
  if (hasRawRange && priceCurrency === "USD") {
    explicitRange = { min: inputs.product.price!.min!, max: inputs.product.price!.max! };
  } else if (hasRawRange && (priceCurrency === "ARS" || priceCurrency === "AR$")) {
    const fxArsPerUsd = await getArsPerUsd().catch(() => null);
    if (typeof fxArsPerUsd === "number" && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0) {
      explicitRange = {
        min: round2(inputs.product.price!.min! / fxArsPerUsd),
        max: round2(inputs.product.price!.max! / fxArsPerUsd),
      };
    }
  }

  const fobUsdNormalized = async () => {
    const raw = inputs.product.fobUsd;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null;
    const cur = String(inputs.product.currency ?? "").toUpperCase();
    // If currency is absent or already USD, keep value as-is.
    if (!cur || cur === "USD" || cur === "US$" || cur === "U$S") return raw;
    if (cur === "ARS" || cur === "AR$") {
      const fxArsPerUsd = await getArsPerUsd().catch(() => null);
      if (typeof fxArsPerUsd === "number" && Number.isFinite(fxArsPerUsd) && fxArsPerUsd > 0) {
        return round2(raw / fxArsPerUsd);
      }
    }
    return null;
  };

  const fobUsdFromProduct = await fobUsdNormalized();

  const fobGuess =
    (explicitRange ? (explicitRange.min + explicitRange.max) / 2 : undefined) ??
    fobUsdFromProduct ??
    null;

  if (fobGuess === null) {
    throw new Error("NO_PRICE: no se proporcionó precio unitario.");
  }

  const fobUnitMin = explicitRange ? explicitRange.min : fobGuess;
  const fobUnitMax = explicitRange ? explicitRange.max : fobGuess;

  const fobTotalMin = fobUnitMin * qty;
  const fobTotalMax = fobUnitMax * qty;
  const fobTotal = fobGuess * qty;

  // Freight: real rates from freight table
  const zone = detectOriginZone(origin);
  const unitDim = estimateUnitDimensions(ncm, title);
  const userWeightKg = typeof inputs.product.weightKgPerUnit === "number" && inputs.product.weightKgPerUnit > 0
    ? inputs.product.weightKgPerUnit
    : null;
  const totalKg = userWeightKg != null ? userWeightKg * qty : unitDim.kg * qty;

  // Fase 3: dimensiones reales (L×A×H de la ficha técnica, Fase 0.c) si están disponibles.
  // Si no, se estima el volumen por NCM escalado por el peso real (comportamiento previo).
  const dimsCm = (inputs.product.raw as any)?.dimensionsCm as
    | { length?: number; width?: number; height?: number }
    | undefined;
  const hasRealDims =
    !!dimsCm &&
    [dimsCm.length, dimsCm.width, dimsCm.height].every((v) => typeof v === "number" && (v as number) > 0);
  let totalM3: number;
  if (hasRealDims) {
    const unitM3Real = (dimsCm!.length! * dimsCm!.width! * dimsCm!.height!) / 1_000_000; // cm³ → m³
    totalM3 = unitM3Real * qty;
  } else {
    const m3Scale = userWeightKg != null && unitDim.kg > 0 ? userWeightKg / unitDim.kg : 1;
    totalM3 = unitDim.m3 * qty * m3Scale;
  }

  // ── Régimen recomendado (Courier vs General) ────────────────────────────────
  // Se evalúa ANTES del costeo porque el régimen CAMBIA la estructura de costo:
  // el courier es puerta a puerta y NO paga despachante / terminal portuaria /
  // depósito fiscal / SIM (eso es del despacho general), reemplaza derechos/IVA/
  // percepciones por un ÚNICO impuesto sobre el FOB, y su flete es por kg todo-incluido.
  const interventions = (inputs.product.raw as any)?.pcram?.interventions as string[] | undefined;
  // Para el courier usamos el peso FACTURABLE (mayor entre real y volumétrico): el
  // courier cobra por volumen, así que una carga voluminosa (ej. un aire de 0,55 m³)
  // NO es un paquete de courier aunque pese < 50 kg — debe ir por marítimo.
  const chargeableWeightKg = chargeableAirKg(totalKg, totalM3);
  const regime = assessImportRegime({
    fobTotalUsd: fobTotalMax,
    totalWeightKg: chargeableWeightKg,
    interventions,
    weightEstimated: userWeightKg == null,
  });
  const isCourier = regime.code === "courier";

  const userMode = detectUserShippingMode(inputs.rawUserText ?? "", zone);
  const freight = calcFreightCost(zone, totalKg, totalM3, userMode);

  // Vehículos (autos/buses/camiones, cap. 8701-8705) → RORO (por volumen, con mínimo)
  // en lugar del flete contenedor. Tarifas editables en /app/configuracion/fletes.
  const headForVeh = ncm ? parseInt(ncm.replace(/\D/g, "").slice(0, 4), 10) : NaN;
  const isVehicleForFreight =
    (Number.isFinite(headForVeh) && headForVeh >= 8701 && headForVeh <= 8705) ||
    /\b(auto|autos|automovil|autom[oó]vil|veh[ií]culo|coche|camioneta|pickup|pick.?up|suv|furg[oó]n|utilitario|omnibus|ómnibus|colectivo|micro|autob[uú]s|camion|cami[oó]n)\b/i.test(
      title.toLowerCase()
    );
  let fleteMin = freight.totalUsd;
  let fleteMax = freight.totalUsd;
  let fleteModeLabelOverride: string | undefined;
  if (isVehicleForFreight) {
    const fc = getFreightConfig();
    // Autos de pasajeros (8703 / "auto","camioneta","pickup","suv"): hasta 2 entran
    // en un contenedor de 40'. 3-4 autos → 2 contenedores, etc. (1 cada 2 autos).
    const isCarType =
      headForVeh === 8703 ||
      /\b(auto|autos|automovil|autom[oó]vil|coche|camioneta|pickup|pick.?up|suv)\b/i.test(title.toLowerCase());
    if (isCarType) {
      const containers = Math.max(1, Math.ceil(qty / 2));
      const fcl40 = zone === "EUROPE" ? fc.fclEurope40 : fc.fclChina40; // USA/otros → tarifa China
      const destPerContainer = fc.fclDestNet * (1 + FREIGHT_IVA);
      const carFreight = round2(containers * (fcl40 + destPerContainer));
      fleteMin = carFreight;
      fleteMax = carFreight;
      fleteModeLabelOverride = `Marítimo FCL 40' (${containers} cont. · ${qty} ${qty === 1 ? "auto" : "autos"})`;
    } else {
      // Buses, camiones y sobredimensionado (no entran en contenedor) → RORO.
      const roro = Math.max(fc.fleteVehiculoMinUsd, fc.roroMinimo, fc.roroPorM3 * (totalM3 > 0 ? totalM3 : 0));
      if (roro > 0) {
        fleteMin = round2(roro);
        fleteMax = round2(roro);
        fleteModeLabelOverride = "RORO (vehículo)";
      }
    }
  }

  // Courier: el flete es puerta a puerta por kg FACTURABLE (mayor entre real y
  // volumétrico) a la tarifa real del operador, editable en /app/configuracion/fletes.
  // Es todo-incluido → reemplaza el flete contenedor/aéreo común y deja sin efecto
  // los gastos de despacho. El % de impuesto único se aplica más abajo sobre el FOB.
  let courierTaxRatePct: number | null = null;
  if (isCourier) {
    const fc = getFreightConfig();
    const perKg =
      zone === "USA"
        ? fc.courierUsaPerKg
        : zone === "EUROPE"
          ? fc.courierEuropePerKg
          : fc.courierChinaPerKg; // China y resto del mundo a tarifa China
    const cKg = chargeableAirKg(totalKg, totalM3);
    const courierFreight = round2(perKg * cKg);
    fleteMin = courierFreight;
    fleteMax = courierFreight;
    fleteModeLabelOverride = "Courier (puerta a puerta)";
    courierTaxRatePct = fc.courierTaxPct;
  }

  const cifMin = fobTotalMin + fleteMin;
  const cifMax = fobTotalMax + fleteMax;

  const pcram = (inputs.product.raw as any)?.pcram as
    | { taxes?: Record<string, number>; internalTaxes?: any }
    | undefined;

  const pcramTaxes = pcram?.taxes ?? undefined;
  // Antigüedad de las tasas PCRAM (Fase 1.3): si el dato es de hace mucho o quedó
  // "stale" (PCRAM caído y se usó el último conocido), lo avisamos y bajamos quality.
  const pcramStale = Boolean((inputs.product.raw as any)?.pcramStale);
  const pcramAsOf = (inputs.product.raw as any)?.pcramAsOf as string | undefined;
  const pcramDaysAgo =
    pcramAsOf && !Number.isNaN(new Date(pcramAsOf).getTime())
      ? Math.max(0, Math.floor((Date.now() - new Date(pcramAsOf).getTime()) / 86_400_000))
      : null;
  const ncmMeta = (inputs.product.raw as any)?.ncmMeta as { hsHeading?: string } | undefined;

  const pct = (key: string) => {
    const v = pcramTaxes?.[key];
    return typeof v === "number" && Number.isFinite(v) ? v / 100 : undefined;
  };

  // If we have PCRAM taxes, use a more structured tax calc (still best-effort).
  let impuestosMin: number;
  let impuestosMax: number;
  let impuestosDetail: string;

  // Insurance: default to 1% of FOB (common in real quotes); can be overridden.
  const insuranceRate = (() => {
    const n = Number(process.env.INSURANCE_RATE ?? "0.01");
    if (!Number.isFinite(n) || n <= 0 || n >= 0.2) return 0.01;
    return n;
  })();
  // Courier puerta a puerta: el seguro va incluido en la tarifa todo-incluido del operador.
  const seguroMin = isCourier ? 0 : fobTotalMin * insuranceRate;
  const seguroMax = isCourier ? 0 : fobTotalMax * insuranceRate;

  const cifMin2 = cifMin + seguroMin;
  const cifMax2 = cifMax + seguroMax;
  let teMin = 0;
  let teMax = 0;
  let derechosMin = 0;
  let derechosMax = 0;
  let ivaMin = 0;
  let ivaMax = 0;
  let ivaAdicMin = 0;
  let ivaAdicMax = 0;
  let gananciasMin = 0;
  let gananciasMax = 0;
  let iibbMin = 0;
  let iibbMax = 0;
  let internosMin = 0;
  let internosMax = 0;
  let antidumpingMin = 0;
  let antidumpingMax = 0;
  let antidumpingRatePct: number | null = null;
  // Hay antidumping vigente pero sin % cuantificable (valor específico / FOB mínimo).
  let antidumpingUnquantified = false;

  // Tasas reales — se populan desde PCRAM; defaults orientativos si no hay datos
  let derechosRatePct = 14;
  let teRatePct = 3;
  let ivaRatePct = 21;
  let ivaAdicRatePct = 20;
  let taxLines: Array<{ label: string; ratePct: number | null; amountUsd: number }> = [];

  // ── Régimen fiscal (investigado en ARCA/CDA) ────────────────────────────────
  // Bien de capital → IVA 10,5%. Tasa estadística 0% solo si está exenta.
  // Percepciones (IVA adic, Ganancias, IIBB): se EXIMEN si es uso propio (bien de
  // uso); en reventa se aplican. Recuperabilidad: solo Responsable Inscripto.
  const bienDeCapital = inputs.mode === "quote" && Boolean(inputs.bienDeCapital);
  const exentoTE = inputs.mode === "quote" && Boolean(inputs.exentoTasaEstadistica);
  const esReventa = inputs.mode === "quote" ? inputs.destino !== "uso_propio" : true;
  const perfilImportador = inputs.mode === "quote" ? inputs.perfilImportador : undefined;
  const esRI = perfilImportador === "responsable_inscripto";
  const iibbPctInput = inputs.mode === "quote" && typeof inputs.iibbPct === "number" ? inputs.iibbPct : 0;
  // Tasas de percepción resueltas por destino:
  const ivaAdicResolved = esReventa ? (bienDeCapital ? 0.1 : 0.2) : 0;
  const gananciasResolved = esReventa ? 0.06 : 0;
  const iibbResolved = esReventa ? Math.max(0, iibbPctInput) / 100 : 0;
  const ivaResolved = bienDeCapital ? 0.105 : 0.21;

  // Red de seguridad de moneda: el motor asume FOB en USD; si el texto sugiere otra
  // moneda, avisamos (no auto-convertimos para no inventar un tipo de cambio).
  const nonUsdCurrencyHint = inputs.mode === "quote" ? detectNonUsdPrice(inputs.rawUserText ?? "") : null;

  // Traza de la fuente real del arancel + divergencia de subpartida hermana.
  let dieSource: DieSource = "generic_default";
  let siblingDivergence: { minPct: number; maxPct: number } | null = null;

  if (pcramTaxes) {
    // Si PCRAM trae el dato real de la posición, MANDA (la plataforma "sabe" sola
    // el IVA 10,5% de bienes de capital, la TE exenta, etc.). El toggle es respaldo.
    const teRate = exentoTE ? 0 : (pct("TE") ?? 0.03);
    const pcramDie = pct("DIE") ?? pct("AEC");
    const offDie = pcramDie == null ? officialDieRate(ncm) : null;
    const baseDie = pcramDie ?? offDie ?? defaultDieRate(ncm);
    const die0 = resolveDieWithSiblings(
      ncm,
      baseDie,
      pcramDie != null ? "pcram_live" : offDie != null ? "official_offline" : "generic_default"
    );
    const dieRate = die0.rate;
    dieSource = die0.source;
    siblingDivergence = die0.divergence;
    // 1.4: si hay PCRAM live y el índice offline difiere ≥5pp, el offline está
    // posiblemente desactualizado. PCRAM manda; solo dejamos rastro para alertar.
    if (pcramDie != null && ncm) {
      const off = officialDieRate(ncm);
      if (off != null && Math.abs(off - pcramDie) >= 0.05) {
        console.warn(
          `[quote] arancel divergente ${ncm}: PCRAM ${(pcramDie * 100).toFixed(1)}% vs offline ${(off * 100).toFixed(1)}% — índice offline posiblemente desactualizado`
        );
      }
    }
    // Bien de capital → IVA 10,5% (lo declara el importador; PCRAM trae la tasa general
    // de la posición). El toggle MANDA: aplica 10,5%, salvo que PCRAM traiga una aún menor
    // (ej. exento). Sin toggle, usa la tasa de PCRAM o el default.
    const pcramIva = pct("IVA");
    const ivaRate = bienDeCapital ? Math.min(0.105, pcramIva ?? 0.21) : (pcramIva ?? ivaResolved);
    // IVA adicional acompaña al IVA: 10% si IVA reducido, 20% si general (solo reventa).
    const ivaAdicRate = esReventa ? (ivaRate <= 0.11 ? 0.1 : 0.2) : 0;
    const gananciasRate = gananciasResolved;
    const iibbRate = iibbResolved;

    // Guardar tasas reales para el PDF y la vista web
    derechosRatePct = ratePct(dieRate);
    teRatePct = ratePct(teRate);
    ivaRatePct = ratePct(ivaRate);
    ivaAdicRatePct = ratePct(ivaAdicRate);

    teMin = cifMin2 * teRate;
    teMax = cifMax2 * teRate;

    derechosMin = cifMin2 * dieRate;
    derechosMax = cifMax2 * dieRate;

    // Derechos antidumping / compensatorios / salvaguardia. Riesgo #1 de sub-costeo
    // (productos chinos: calzado, neumáticos, bicis, herramientas…). PCRAM los trae
    // en taxesExtra como % ad valorem; si vienen como valor específico o "FOB mínimo"
    // no hay % → se avisa sin número en vez de esconderlo. Base = valor en aduana (CIF).
    {
      const extra = (pcram as unknown as { taxesExtra?: Record<string, number> })?.taxesExtra;
      const interventionsList =
        (pcram as unknown as { interventions?: string[] })?.interventions ?? [];
      const adRe = /antidump|compensator|salvaguard/i;
      let adRate = 0;
      if (extra) {
        for (const [label, v] of Object.entries(extra)) {
          if (adRe.test(label) && Number.isFinite(v) && v > 0) adRate += v / 100;
        }
      }
      if (adRate > 0) {
        antidumpingRatePct = ratePct(adRate);
        antidumpingMin = cifMin2 * adRate;
        antidumpingMax = cifMax2 * adRate;
      } else if (interventionsList.some((i) => adRe.test(i))) {
        antidumpingUnquantified = true;
      }
    }

    // El antidumping integra la base imponible del IVA (es un tributo a la importación).
    const baseIvaMin = cifMin2 + teMin + derechosMin + antidumpingMin;
    const baseIvaMax = cifMax2 + teMax + derechosMax + antidumpingMax;

    ivaMin = baseIvaMin * ivaRate;
    ivaMax = baseIvaMax * ivaRate;

    ivaAdicMin = baseIvaMin * ivaAdicRate;
    ivaAdicMax = baseIvaMax * ivaAdicRate;

    // Perceptions/withholdings (cash-out impact; applicability depends on taxpayer profile).
    // Best-effort: apply over the same base as IVA (common in practice for these approximations).
    if (gananciasRate > 0) {
      gananciasMin = baseIvaMin * gananciasRate;
      gananciasMax = baseIvaMax * gananciasRate;
    }
    if (iibbRate > 0) {
      iibbMin = baseIvaMin * iibbRate;
      iibbMax = baseIvaMax * iibbRate;
    }

    const internal = (pcram as any)?.internalTaxes as
      | {
          tiers?: Array<{
            minArsExclusive?: number;
            maxArsInclusive?: number;
            ratePct?: number;
          }>;
        }
      | undefined;
    if (internal?.tiers?.length) {
      const fx = await getArsPerUsd();
      if (Number.isFinite(fx) && fx > 0) {
        const baseMinArs = cifMin2 * fx;
        const baseMaxArs = cifMax2 * fx;
        const pickRate = (baseArs: number) => {
          for (const tier of internal.tiers ?? []) {
            const minEx = typeof tier.minArsExclusive === "number" ? tier.minArsExclusive : -Infinity;
            const maxIn = typeof tier.maxArsInclusive === "number" ? tier.maxArsInclusive : Infinity;
            if (baseArs > minEx && baseArs <= maxIn) {
              const r = typeof tier.ratePct === "number" ? tier.ratePct : 0;
              return r / 100;
            }
          }
          return 0;
        };
        const rMin = pickRate(baseMinArs);
        const rMax = pickRate(baseMaxArs);
        internosMin = cifMin2 * rMin;
        internosMax = cifMax2 * rMax;
      }
    }

    impuestosMin = teMin + derechosMin + antidumpingMin + ivaMin + ivaAdicMin + gananciasMin + iibbMin + internosMin;
    impuestosMax = teMax + derechosMax + antidumpingMax + ivaMax + ivaAdicMax + gananciasMax + iibbMax + internosMax;

    // Líneas individuales de impuestos (para PDF y web)
    taxLines = [
      ...(teMin > 0 ? [{ label: "Tasa de Estadistica", ratePct: teRatePct, amountUsd: round2(teMin) }] : []),
      ...(derechosMin > 0 ? [{ label: "Derechos", ratePct: derechosRatePct, amountUsd: round2(derechosMin) }] : []),
      ...(antidumpingMin > 0 ? [{ label: "Derechos antidumping", ratePct: antidumpingRatePct, amountUsd: round2(antidumpingMin) }] : []),
      ...(ivaMin > 0 ? [{ label: "IVA", ratePct: ivaRatePct, amountUsd: round2(ivaMin) }] : []),
      ...(ivaAdicMin > 0 ? [{ label: "IVA Adicional", ratePct: ivaAdicRatePct, amountUsd: round2(ivaAdicMin) }] : []),
      ...(gananciasMin > 0 ? [{ label: "Impuesto a las Ganancias", ratePct: ratePct(gananciasRate), amountUsd: round2(gananciasMin) }] : []),
      ...(iibbMin > 0 ? [{ label: "IIBB", ratePct: ratePct(iibbRate), amountUsd: round2(iibbMin) }] : []),
      ...(internosMin > 0 ? [{ label: "Impuestos Internos", ratePct: null, amountUsd: round2(internosMin) }] : []),
    ];

    impuestosDetail = [
      internal?.tiers?.length
        ? "Estimación usando tasas oficiales (PCRAM) cuando disponibles, incluyendo Impuestos Internos cuando aplican por umbrales."
        : "Estimación usando tasas oficiales (PCRAM) cuando disponibles.",
      esReventa
        ? (esRI
            ? "Incluye percepciones (IVA adic., Ganancias, IIBB) por reventa; como sos Responsable Inscripto se recuperan (IVA crédito + percepciones pago a cuenta) — mirá el costo real abajo."
            : "Incluye percepciones (IVA adic., Ganancias, IIBB) por reventa; su aplicabilidad exacta depende de tu situación fiscal.")
        : "Por ser uso propio (bien de uso) NO pagás las percepciones (IVA adic., Ganancias ni IIBB) que sí aplican en reventa — un ahorro importante frente a la tasa de lista.",
    ]
      .filter(Boolean)
      .join(" ");
  } else {
    // Sin PCRAM en vivo: usar el DIE OFICIAL del nomenclador offline (real, no
    // inventado). Solo si el índice no tiene la posición caemos al genérico.
    const officialDie = officialDieRate(ncm);
    const die0 = resolveDieWithSiblings(
      ncm,
      officialDie ?? defaultDieRate(ncm),
      officialDie != null ? "official_offline" : "generic_default"
    );
    const dieRateEst   = die0.rate;   // oficial offline → genérico (conservador si hay divergencia)
    dieSource = die0.source;
    siblingDivergence = die0.divergence;
    const teRateEst    = exentoTE ? 0 : 0.03;
    const ivaRateEst   = ivaResolved;
    const ivaAdicRateEst = ivaAdicResolved;

    derechosRatePct = ratePct(dieRateEst);
    teRatePct       = ratePct(teRateEst);
    ivaRatePct      = ratePct(ivaRateEst);
    ivaAdicRatePct  = ratePct(ivaAdicRateEst);

    teMin      = cifMin2 * teRateEst;
    teMax      = cifMax2 * teRateEst;
    derechosMin = cifMin2 * dieRateEst;
    derechosMax = cifMax2 * dieRateEst;

    const baseIvaMin = cifMin2 + teMin + derechosMin;
    const baseIvaMax = cifMax2 + teMax + derechosMax;

    ivaMin     = baseIvaMin * ivaRateEst;
    ivaMax     = baseIvaMax * ivaRateEst;
    ivaAdicMin = baseIvaMin * ivaAdicRateEst;
    ivaAdicMax = baseIvaMax * ivaAdicRateEst;
    if (gananciasResolved > 0) {
      gananciasMin = baseIvaMin * gananciasResolved;
      gananciasMax = baseIvaMax * gananciasResolved;
    }
    if (iibbResolved > 0) {
      iibbMin = baseIvaMin * iibbResolved;
      iibbMax = baseIvaMax * iibbResolved;
    }

    impuestosMin = teMin + derechosMin + ivaMin + ivaAdicMin + gananciasMin + iibbMin;
    impuestosMax = teMax + derechosMax + ivaMax + ivaAdicMax + gananciasMax + iibbMax;
    impuestosDetail = esReventa
      ? (esRI
          ? "Incluye percepciones (IVA adic., Ganancias, IIBB) por reventa. Como sos Responsable Inscripto, el IVA es crédito fiscal y las percepciones son pago a cuenta: se recuperan — mirá el costo real abajo."
          : "Incluye percepciones (IVA adic., Ganancias, IIBB) por reventa. Se ajusta con la clasificación definitiva.")
      : "Por ser uso propio (bien de uso) NO pagás las percepciones (IVA adic., Ganancias ni IIBB) que sí aplican en reventa — un ahorro importante frente a la tasa de lista.";

    taxLines = [
      { label: "Tasa de Estadística",     ratePct: teRatePct,       amountUsd: round2(teMin) },
      { label: "Derechos (estimado)",      ratePct: derechosRatePct, amountUsd: round2(derechosMin) },
      { label: "IVA",                      ratePct: ivaRatePct,      amountUsd: round2(ivaMin) },
      ...(ivaAdicMin > 0 ? [{ label: "IVA Adicional", ratePct: ivaAdicRatePct, amountUsd: round2(ivaAdicMin) }] : []),
      ...(gananciasMin > 0 ? [{ label: "Impuesto a las Ganancias", ratePct: ratePct(gananciasResolved), amountUsd: round2(gananciasMin) }] : []),
      ...(iibbMin > 0 ? [{ label: "II.BB.", ratePct: ratePct(iibbResolved), amountUsd: round2(iibbMin) }] : []),
    ];
  }

  // ── Courier: impuesto ÚNICO sobre el FOB (régimen simplificado) ──────────────
  // Reemplaza derechos / TE / IVA / IVA adic. / Ganancias / IIBB / internos por un
  // único % sobre el FOB (tarifa real del operador courier). Cero todas las
  // componentes del despacho general para que la recuperabilidad y los desgloses
  // queden coherentes: el courier NO genera crédito fiscal recuperable.
  if (isCourier) {
    const cRate = (courierTaxRatePct ?? 50) / 100;
    teMin = 0; teMax = 0;
    derechosMin = 0; derechosMax = 0;
    antidumpingMin = 0; antidumpingMax = 0; antidumpingRatePct = null; antidumpingUnquantified = false;
    ivaMin = 0; ivaMax = 0;
    ivaAdicMin = 0; ivaAdicMax = 0;
    gananciasMin = 0; gananciasMax = 0;
    iibbMin = 0; iibbMax = 0;
    internosMin = 0; internosMax = 0;
    impuestosMin = round2(fobTotalMin * cRate);
    impuestosMax = round2(fobTotalMax * cRate);
    impuestosDetail =
      `Régimen Courier (puerta a puerta): impuesto único de ${ratePct(cRate)}% sobre el valor FOB que reemplaza derechos, IVA y percepciones del despacho general. No paga despachante, terminal portuaria, depósito fiscal ni SIM.`;
    taxLines = [
      { label: `Impuesto Courier (${ratePct(cRate)}% FOB)`, ratePct: ratePct(cRate), amountUsd: round2(fobTotalMin * cRate) },
    ];
  }

  // Local/operational costs in destination (USD). Your PDFs include these explicitly.
  // We estimate them conservatively when we don't have real CBM/peso.
  const hsDigits = String(ncmMeta?.hsHeading ?? "").replace(/\D/g, "");
  const hsNum = hsDigits && /^\d{4}$/.test(hsDigits) ? Number(hsDigits) : null;
  const titleNorm = title.toLowerCase();
  const isIndustrialMachinery =
    (typeof hsNum === "number" && hsNum >= 8400 && hsNum <= 8999) ||
    /\b(maquin|machine|industrial|cnc|cortad|cortadora|sierra|stone|piedra)\b/i.test(titleNorm);

  // Fase 3: vehículos suelen requerir transporte especial (RORO / Flat Rack / Open Top).
  const ncmHeadVeh = ncm ? parseInt(ncm.replace(/\D/g, "").slice(0, 4), 10) : NaN;
  const isVehicle =
    (Number.isFinite(ncmHeadVeh) && ncmHeadVeh >= 8701 && ncmHeadVeh <= 8716) ||
    /\b(auto|automovil|vehiculo|camion|camioneta|autoelevador|tractor|motocicleta|chasis)\b/i.test(titleNorm);

  // Etiqueta amigable del modo de transporte seleccionado.
  const freightModeLabel =
    fleteModeLabelOverride ??
    (freight.mode.startsWith("air")
      ? "Aéreo"
      : freight.mode.startsWith("fcl")
        ? "Marítimo FCL"
        : "Marítimo LCL");
  // Peso facturable legible: 1 decimal para cargas chicas (evita mostrar "0 kg").
  const fmtChargeableKg =
    freight.estimatedKg < 10 ? freight.estimatedKg.toFixed(1) : String(Math.round(freight.estimatedKg));

  // Tasas reales de gestión/despacho (provistas por el encargado de CE).
  // Honorarios: 1% del valor FOB total. Mínimo USD 300 en despacho general; en
  // courier (operación más simple, puerta a puerta) el mínimo es USD 50.
  const ARANCEL_SIM = 10;
  const honorariosFloor = isCourier ? 50 : 300;
  const honorariosMin = Math.max(honorariosFloor, round2(fobTotalMin * 0.01));
  const honorariosMax = Math.max(honorariosFloor, round2(fobTotalMax * 0.01));

  // Bloque de gastos de importación (agencia, terminal, fiscal, etc. + IVA servicios).
  // Para vehículos (cap. 87) suma AVAC/CIVAC y DNRPA.
  const isVehicleNcm = (() => {
    const h = ncm ? parseInt(ncm.replace(/\D/g, "").slice(0, 4), 10) : NaN;
    return h >= 8701 && h <= 8716;
  })();
  // El régimen (Courier vs General) ya se evaluó arriba (antes del costeo) porque
  // cambia la estructura: el courier es puerta a puerta y NO paga despachante /
  // terminal portuaria / depósito fiscal / SIM (eso es del despacho general).
  const importExpensesAll = computeImportExpenses(isVehicleNcm);
  const gastosImportacionLines = isCourier ? [] : importExpensesAll.lines;
  const gastosImportacionUsd = isCourier ? 0 : importExpensesAll.totalUsd;
  const arancelSim = isCourier ? 0 : ARANCEL_SIM;

  const depositoMin = 0;
  const depositoMax = 0;
  const transporteNacMin = 0;
  const transporteNacMax = 0;
  const transferenciaMin = 0;
  const transferenciaMax = 0;

  const gestionMin = honorariosMin + arancelSim + gastosImportacionUsd;
  const gestionMax = honorariosMax + arancelSim + gastosImportacionUsd;

  // CIF + seguro (cifMin2/cifMax2) ya incluye el seguro que también es base imponible.
  const totalMin = cifMin2 + impuestosMin + gestionMin;
  const totalMax = cifMax2 + impuestosMax + gestionMax;

  // Recuperabilidad: para Responsable Inscripto, el IVA es crédito fiscal y las
  // percepciones (IVA adic, Ganancias, IIBB) son pago a cuenta → recuperables.
  // También el IVA de los servicios del despacho (0 en courier). "Costo real" = total − recuperable.
  const ivaServiciosUsd = gastosImportacionLines
    .filter((l) => /IVA sobre servicios/i.test(l.label))
    .reduce((a, l) => a + l.amountUsd, 0);
  const recuperableMin = esRI
    ? ivaMin + ivaAdicMin + gananciasMin + iibbMin + ivaServiciosUsd
    : 0;
  const recuperableMax = esRI
    ? ivaMax + ivaAdicMax + gananciasMax + iibbMax + ivaServiciosUsd
    : 0;
  const costoRealMin = totalMin - recuperableMin;
  const costoRealMax = totalMax - recuperableMax;

  const assumptions: Array<{
    id: string;
    label: string;
    value: string;
    source: "pcram" | "user" | "scraper" | "estimate";
    tone?: "muted" | "primary" | "gold" | "success";
  }> = [
    {
      id: "ncm",
      label: "Clasificación",
      value: ncm
        ? `Pos. ${ncm.replace(/\D/g, "").slice(0, 4)}`
        : "Sin clasificar — arancel a confirmar (puede ser mayor)",
      source: ncm ? "scraper" : "estimate",
      tone: ncm ? "gold" : "muted",
    },
    {
      id: "taxMode",
      label: "Impuestos",
      value:
        dieSource === "pcram_live"
          ? pcramStale
            ? `Arancel de PCRAM (dato de hace ${pcramDaysAgo ?? "varios"} días — reintentá para refrescar)`
            : "Arancel oficial de PCRAM (en vivo)"
          : dieSource === "official_offline"
            ? "Arancel oficial del nomenclador"
            : "Estimación general (arancel a confirmar)",
      source: dieSource === "generic_default" ? "estimate" : "pcram",
      tone: dieSource === "generic_default" || pcramStale ? "muted" : "success",
    },
    ...(siblingDivergence
      ? [
          {
            id: "subpartida",
            label: "Subpartida",
            value: `Dentro de esta partida el arancel varía entre ${siblingDivergence.minPct}% y ${siblingDivergence.maxPct}% según la subpartida exacta${dieSource !== "pcram_live" ? " — usamos la más alta por prudencia" : ""}. La subpartida la confirmamos con un despachante del equipo de E-COMEX.`,
            source: "estimate" as const,
            tone: "muted" as const,
          },
        ]
      : []),
    ...(antidumpingRatePct != null && antidumpingRatePct > 0
      ? [
          {
            id: "antidumping",
            label: "Antidumping",
            value: `Esta posición tiene derechos antidumping del ${antidumpingRatePct}% (incluidos en el total). Confirmá el alcance con un despachante del equipo de E-COMEX.`,
            source: "pcram" as const,
            tone: "gold" as const,
          },
        ]
      : antidumpingUnquantified
        ? [
            {
              id: "antidumping",
              label: "Antidumping",
              value:
                "Esta posición tiene una medida antidumping vigente que puede aplicarse como valor específico o FOB mínimo: el costo real puede ser bastante mayor al estimado. Confirmalo con un despachante del equipo de E-COMEX antes de operar.",
              source: "estimate" as const,
              tone: "gold" as const,
            },
          ]
        : []),
    ...(nonUsdCurrencyHint
      ? [
          {
            id: "moneda",
            label: "Moneda del precio",
            value: `Mencionaste ${nonUsdCurrencyHint} pero el cálculo asume el FOB en USD. Si el precio está en otra moneda, convertilo a dólares antes de cotizar — el total cambiaría bastante.`,
            source: "estimate" as const,
            tone: "gold" as const,
          },
        ]
      : []),
    {
      id: "regime",
      label: "Régimen recomendado",
      value: regime.code === "courier" ? "Courier (envíos de entrega rápida)" : "Importación general",
      source: "estimate",
      tone: regime.code === "courier" ? "success" : "primary",
    },
    {
      id: "origin",
      label: "Origen",
      value: origin,
      source: origin !== "Origen a confirmar" ? "user" : "estimate",
      tone: origin !== "Origen a confirmar" ? "primary" : "muted",
    },
    {
      id: "insurance",
      label: "Seguro",
      value: `${Math.round(insuranceRate * 1000) / 10}% sobre FOB`,
      source: "estimate",
      tone: "muted",
    },
    {
      id: "dims",
      label: "Dimensiones",
      value: hasRealDims ? "Ficha técnica (L×A×H reales)" : "Estimadas por categoría",
      source: hasRealDims ? "scraper" : "estimate",
      tone: hasRealDims ? "success" : "muted",
    },
    {
      id: "freight",
      label: "Flete",
      value: `${freightModeLabel} · ${fmtChargeableKg} kg facturable`,
      source: "estimate",
      tone: "primary",
    },
    ...(isVehicle
      ? [
          {
            id: "vehiculo",
            label: "Transporte especial",
            value: "Vehículo: puede requerir RORO / Flat Rack (cotización de flete específica).",
            source: "estimate" as const,
            tone: "muted" as const,
          },
        ]
      : []),
    {
      id: "ops",
      label: "Gestión",
      value: "Honorarios 1% FOB (mín. USD 300) + Gastos operativos USD 200 + Arancel SIM USD 10",
      source: "user",
      tone: "success",
    },
  ];

  // ── Confiabilidad del arancel: que el número NUNCA engañe ───────────────────
  // El arancel es confiable SOLO si vino de una fuente real (PCRAM en vivo o el
  // nomenclador oficial) y hay NCM. "generic_default" = lo estimamos → avisamos
  // fuerte y bajamos la confianza, en vez de mostrar un número con cara de firme.
  const arancelConfiable = dieSource !== "generic_default" && !!ncm;
  const warnings: string[] = [];
  if (!ncm) {
    warnings.push(
      "No pudimos identificar la posición arancelaria (NCM) del producto. El arancel y los impuestos de abajo son una ESTIMACIÓN general y el costo final puede variar mucho. Detallá más el producto (qué es, material, marca/modelo, uso) o reintentá en unos minutos."
    );
  } else if (dieSource === "generic_default") {
    warnings.push(
      "Todavía no tenemos el arancel oficial de esta posición. El derecho de importación es una estimación general; confirmá la clasificación con un despachante de E-COMEX antes de operar."
    );
  }
  if (antidumpingUnquantified) {
    warnings.push(
      "Esta posición podría tener derechos antidumping con valor mínimo/específico que no pudimos cuantificar. El costo real puede ser bastante mayor al estimado."
    );
  }
  if (nonUsdCurrencyHint) {
    warnings.push(
      "El precio podría estar en otra moneda (no USD). Verificá el FOB: si no es en dólares, el total no es correcto."
    );
  }

  const quality = (() => {
    let q = 28;
    if (typeof inputs.product.fobUsd === "number") q += 18;
    if (typeof inputs.product.quantity === "number") q += 10;
    if (ncm) q += 18;
    if (pcramTaxes) q += 18;
    if (origin !== "Origen a confirmar") q += 8;
    if (zone !== "OTHER") q += 6;
    if (isIndustrialMachinery) q += 6;
    if (pcramStale) q -= 12;            // tasas PCRAM viejas → menos confianza
    if (siblingDivergence) q -= 8;      // subpartida sensible al arancel
    if (antidumpingUnquantified) q -= 15; // antidumping sin % → el costo real puede ser mucho mayor
    if (nonUsdCurrencyHint) q -= 10;     // precio quizá en otra moneda → total sospechoso
    q = Math.max(0, Math.min(100, q));
    // Tope duro si el arancel no es confiable: nunca proyectar alta confianza
    // sobre una estimación (sin NCM ≤ 30, arancel genérico ≤ 40).
    if (!arancelConfiable) q = Math.min(q, ncm ? 40 : 30);
    return q;
  })();

  // Nota: NCM/clasificación aduanera se mantiene interna (se usa para impuestos),
  // pero no se menciona ni se imprime en el chat.

  const explanation = [
    `Esta es una **estimación** para: **${title}**.`,
    "",
    `- **Cantidad**: ${qty} ${qty === 1 ? "unidad" : "unidades"}`,
    `- **FOB unitario**: ${
      explicitRange
        ? moneyRange(round2(explicitRange.min), round2(explicitRange.max))
        : money(round2(fobGuess))
    }`,
    `- **Origen**: ${origin}`,
    "",
    "**Claves**:",
    formatRegimeForExplanation(regime),
    `- **Impuestos**: ${pcramTaxes ? "calculados con tasas de PCRAM cuando están disponibles" : "estimados (sin tasas oficiales para este caso aún)"}; se ajustan con datos técnicos + origen.`,
    "- **Variables**: flete marítimo (CBM/peso), operativos locales (puerto/transporte/transferencia) y tu situación fiscal.",
    "- **Para afinar**: ficha técnica del producto + país de origen + peso/volumen real.",
    "",
    "Mirá el **desglose en las tarjetas** (incluye el NCM si está disponible).",
  ].join("\n");

  const cards: QuoteCard[] = [
    {
      label: "Producto",
      value: explicitRange
        ? moneyRange(round2(fobTotalMin), round2(fobTotalMax))
        : moneyRange(round2(fobTotal * 0.9), round2(fobTotal * 1.1)),
      detail:
        qty === 1
          ? explicitRange
            ? "Rango FOB detectado en el proveedor."
            : "FOB estimado por unidad."
          : explicitRange
            ? `Rango FOB total para ${qty} unidades (unitario: ${moneyRange(
                round2(fobUnitMin),
                round2(fobUnitMax)
              )}).`
            : `FOB total para ${qty} unidades (unitario: ${money(round2(fobGuess))}).`,
    },
    {
      label: "Flete internacional",
      // El valor DEBE ser el flete final usado en el total (incluye override RORO de
      // vehículos / courier puerta a puerta), no el cálculo marítimo/aéreo previo.
      value: money(round2(fleteMin)),
      detail: `${freightModeLabel}. Se confirma con peso/volumen real y la tarifa del operador.`,
    },
    {
      label: "Impuestos argentinos",
      value: moneyRange(round2(impuestosMin), round2(impuestosMax)),
      detail: impuestosDetail,
    },
    {
      label: "Gestión / despacho",
      value: moneyRange(round2(gestionMin), round2(gestionMax)),
      detail: isCourier
        ? `Honorarios E-COMEX (1% FOB = ${money(round2((honorariosMin + honorariosMax) / 2))}). Por régimen Courier (puerta a puerta) no se cobran despachante, terminal portuaria ni depósito fiscal.`
        : `Honorarios E-COMEX (1% FOB = ${money(round2((honorariosMin + honorariosMax) / 2))}) + arancel SIM + gastos de importación (${money(gastosImportacionUsd)}: agencia, terminal, fiscal, etc.).`,
    },
    {
      label: "Total puesto en Argentina",
      value: moneyRange(round2(totalMin), round2(totalMax)),
      detail: "Rango para evitar falsa precisión. Se afina con peso/volumen y datos técnicos.",
      highlight: true,
    },
    {
      label: "Tiempos estimados",
      value: freight.mode.startsWith("air") ? "Aéreo: 7–14 días" : "Marítimo: 35–55 días",
      detail: "Incluye origen, consolidación, tránsito y aduana (rango típico).",
    },
  ];

  // ── Blindaje final de la cotización ──────────────────────────────────────
  // Una cotización SIEMPRE sale completa y con números reales, o no sale: mejor
  // un error claro (que el front muestra como "no se pudo cotizar") que un número
  // roto (NaN/Infinity), negativo o incoherente. Cubre fallas de config/FX/tasas.
  {
    const components: Array<[string, number]> = [
      ["FOB", fobTotalMin],
      ["flete", fleteMin],
      ["seguro", seguroMin],
      ["CIF", cifMin2],
      ["impuestos", impuestosMin],
      ["gestión/despacho", gestionMin],
      ["total", totalMin],
      ["total máx", totalMax],
    ];
    for (const [name, v] of components) {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        throw new Error(`QUOTE_INVALID: componente "${name}" inválido (${v}).`);
      }
    }
    // El total no puede ser menor que la mercadería + el flete (jamás más barato).
    if (totalMin + 0.01 < fobTotalMin + fleteMin) {
      throw new Error(`QUOTE_INVALID: total (${round2(totalMin)}) menor que FOB+flete (${round2(fobTotalMin + fleteMin)}).`);
    }
    // Coherencia contable: el total = CIF(+seguro) + impuestos + gestión (tolerancia de redondeo).
    const recomputed = cifMin2 + impuestosMin + gestionMin;
    if (Math.abs(recomputed - totalMin) > 1) {
      throw new Error(`QUOTE_INVALID: total incoherente (${round2(totalMin)} ≠ suma ${round2(recomputed)}).`);
    }
  }

  return {
    cards,
    explanation,
    totalMinUsd: round2(totalMin),
    totalMaxUsd: round2(totalMax),
    breakdown: {
      qty,
      fobTotalUsd: round2(fobTotal),
      ...(explicitRange
        ? {
            fobTotalMinUsd: round2(fobTotalMin),
            fobTotalMaxUsd: round2(fobTotalMax),
            fobUnitMinUsd: round2(fobUnitMin),
            fobUnitMaxUsd: round2(fobUnitMax),
          }
        : {}),
      fleteMinUsd: round2(fleteMin),
      fleteMaxUsd: round2(fleteMax),
      fleteMode: freightModeLabel,
      seguroMinUsd: round2(seguroMin),
      seguroMaxUsd: round2(seguroMax),
      cifMinUsd: round2(cifMin),
      cifMaxUsd: round2(cifMax),
      cifPlusInsuranceMinUsd: round2(cifMin2),
      cifPlusInsuranceMaxUsd: round2(cifMax2),
      tasaEstadisticaMinUsd: round2(teMin),
      tasaEstadisticaMaxUsd: round2(teMax),
      derechosImportacionMinUsd: round2(derechosMin),
      derechosImportacionMaxUsd: round2(derechosMax),
      ivaMinUsd: round2(ivaMin),
      ivaMaxUsd: round2(ivaMax),
      ivaAdicionalMinUsd: round2(ivaAdicMin),
      ivaAdicionalMaxUsd: round2(ivaAdicMax),
      gananciasMinUsd: round2(gananciasMin),
      gananciasMaxUsd: round2(gananciasMax),
      iibbMinUsd: round2(iibbMin),
      iibbMaxUsd: round2(iibbMax),
      impuestosInternosMinUsd: round2(internosMin),
      impuestosInternosMaxUsd: round2(internosMax),
      impuestosTotalMinUsd: round2(impuestosMin),
      impuestosTotalMaxUsd: round2(impuestosMax),
      gestionMinUsd: round2(gestionMin),
      gestionMaxUsd: round2(gestionMax),
      honorariosMinUsd: round2(honorariosMin),
      honorariosMaxUsd: round2(honorariosMax),
      arancelSimUsd: arancelSim,
      gastosImportacionUsd: round2(gastosImportacionUsd),
      gastosImportacionLines,
      recuperableMinUsd: round2(recuperableMin),
      recuperableMaxUsd: round2(recuperableMax),
      costoRealMinUsd: round2(costoRealMin),
      costoRealMaxUsd: round2(costoRealMax),
      esResponsableInscripto: esRI,
      esReventa,
      depositoPortuarioMinUsd: round2(depositoMin),
      depositoPortuarioMaxUsd: round2(depositoMax),
      transporteNacionalMinUsd: round2(transporteNacMin),
      transporteNacionalMaxUsd: round2(transporteNacMax),
      transferenciaIntlMinUsd: round2(transferenciaMin),
      transferenciaIntlMaxUsd: round2(transferenciaMax),
      totalMinUsd: round2(totalMin),
      totalMaxUsd: round2(totalMax),
      derechosRatePct,
      teRatePct,
      ivaRatePct,
      ivaAdicRatePct,
      taxLines,
      dieSource,
      siblingTariffDivergence: siblingDivergence,
      arancelConfiable,
    },
    assumptions,
    quality,
    warnings,
    regime,
  };
}

