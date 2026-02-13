import { getArsPerUsd } from "@/lib/fx/arsPerUsd";

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

function estimateFobFromText(text: string): number | null {
  // If user mentions a unit price, capture it as FOB-ish baseline.
  const t = text.replaceAll(".", "").replaceAll(",", ".");
  const m =
    t.match(/(?:usd|\$)\s*([0-9]+(?:\.[0-9]+)?)/i) ??
    t.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:usd|dolares|dólares)/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
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
    impuestosInternosMinUsd: number;
    impuestosInternosMaxUsd: number;
    impuestosTotalMinUsd: number;
    impuestosTotalMaxUsd: number;
    gestionMinUsd: number;
    gestionMaxUsd: number;
    honorariosMinUsd: number;
    honorariosMaxUsd: number;
    depositoPortuarioMinUsd: number;
    depositoPortuarioMaxUsd: number;
    transporteNacionalMinUsd: number;
    transporteNacionalMaxUsd: number;
    transferenciaIntlMinUsd: number;
    transferenciaIntlMaxUsd: number;
    totalMinUsd: number;
    totalMaxUsd: number;
  };
  assumptions?: Array<{
    id: string;
    label: string;
    value: string;
    source: "pcram" | "user" | "scraper" | "estimate";
    tone?: "muted" | "primary" | "gold" | "success";
  }>;
  quality?: number; // 0..100
}> {
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

  const explicitRange =
    inputs.product.price?.type === "range" &&
    inputs.product.price.currency === "USD" &&
    typeof inputs.product.price.min === "number" &&
    typeof inputs.product.price.max === "number" &&
    Number.isFinite(inputs.product.price.min) &&
    Number.isFinite(inputs.product.price.max) &&
    inputs.product.price.min > 0 &&
    inputs.product.price.max > 0
      ? { min: inputs.product.price.min, max: inputs.product.price.max }
      : null;

  const fobGuess =
    (explicitRange ? (explicitRange.min + explicitRange.max) / 2 : undefined) ??
    inputs.product.fobUsd ??
    estimateFobFromText(inputs.rawUserText) ??
    120; // default unit FOB

  const fobUnitMin = explicitRange ? explicitRange.min : fobGuess;
  const fobUnitMax = explicitRange ? explicitRange.max : fobGuess;

  // Heuristics: landed cost composition (unit-level estimate)
  // We'll return ranges to avoid false precision.
  const fleteUnitMin = clamp(fobUnitMin * 0.18, 45, 650);
  const fleteUnitMax = clamp(fobUnitMax * 0.42, 95, 1400);

  const shippingProfile = String((inputs.product.raw as any)?.shippingProfile ?? "").toLowerCase();
  const freightFactor =
    shippingProfile === "light"
      ? { min: 0.75, max: 0.85 }
      : shippingProfile === "heavy"
        ? { min: 1.15, max: 1.35 }
        : { min: 1, max: 1 };

  const fleteUnitMin2 = clamp(fleteUnitMin * freightFactor.min, 45, 900);
  const fleteUnitMax2 = clamp(fleteUnitMax * freightFactor.max, 95, 2400);

  const fobTotalMin = fobUnitMin * qty;
  const fobTotalMax = fobUnitMax * qty;
  const fobTotal = fobGuess * qty;
  const fleteMin = fleteUnitMin2 * qty;
  const fleteMax = fleteUnitMax2 * qty;

  const cifMin = fobTotalMin + fleteMin;
  const cifMax = fobTotalMax + fleteMax;

  const pcram = (inputs.product.raw as any)?.pcram as
    | { taxes?: Record<string, number>; internalTaxes?: any }
    | undefined;

  const pcramTaxes = pcram?.taxes ?? undefined;
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
  const seguroMin = fobTotalMin * insuranceRate;
  const seguroMax = fobTotalMax * insuranceRate;

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
  let internosMin = 0;
  let internosMax = 0;

  if (pcramTaxes) {
    const teRate = pct("TE") ?? 0.03;
    const dieRate = pct("DIE") ?? pct("AEC") ?? 0.14;
    const ivaRate = pct("IVA") ?? 0.21;
    const ivaAdicRate = pct("IVA ADIC") ?? 0.2;

    teMin = cifMin2 * teRate;
    teMax = cifMax2 * teRate;

    derechosMin = cifMin2 * dieRate;
    derechosMax = cifMax2 * dieRate;

    const baseIvaMin = cifMin2 + teMin + derechosMin;
    const baseIvaMax = cifMax2 + teMax + derechosMax;

    ivaMin = baseIvaMin * ivaRate;
    ivaMax = baseIvaMax * ivaRate;

    ivaAdicMin = baseIvaMin * ivaAdicRate;
    ivaAdicMax = baseIvaMax * ivaAdicRate;

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

    impuestosMin = teMin + derechosMin + ivaMin + ivaAdicMin + internosMin;
    impuestosMax = teMax + derechosMax + ivaMax + ivaAdicMax + internosMax;

    impuestosDetail =
      internal?.tiers?.length
        ? "Estimación usando tasas oficiales (PCRAM) cuando disponibles, incluyendo Impuestos Internos cuando aplican por umbrales."
        : "Estimación usando tasas oficiales (PCRAM) cuando disponibles.";
  } else {
    // Taxes: simplified heuristic when we don't have official rates.
    const dutyRateMin = ncm ? 0.08 : 0.12;
    const dutyRateMax = ncm ? 0.18 : 0.28;

    derechosMin = cifMin * dutyRateMin;
    derechosMax = cifMax * dutyRateMax;

    // VAT-like layer over CIF+duty (simplified)
    ivaMin = (cifMin + derechosMin) * 0.21;
    ivaMax = (cifMax + derechosMax) * 0.31; // incl. additional/perceptions estimate

    impuestosMin = derechosMin + ivaMin;
    impuestosMax = derechosMax + ivaMax;

    impuestosDetail =
      "Estimación preliminar. Se afina con datos técnicos del producto, origen y documentación.";
  }

  // Local/operational costs in destination (USD). Your PDFs include these explicitly.
  // We estimate them conservatively when we don't have real CBM/peso.
  const hsDigits = String(ncmMeta?.hsHeading ?? "").replace(/\D/g, "");
  const hsNum = hsDigits && /^\d{4}$/.test(hsDigits) ? Number(hsDigits) : null;
  const titleNorm = title.toLowerCase();
  const isIndustrialMachinery =
    (typeof hsNum === "number" && hsNum >= 8400 && hsNum <= 8999) ||
    /\b(maquin|machine|industrial|cnc|cortad|cortadora|sierra|stone|piedra)\b/i.test(titleNorm);

  // Defaults tuned to match real-world “presupuestos armados”.
  const honorariosMin = isIndustrialMachinery ? 700 : 350;
  const honorariosMax = isIndustrialMachinery ? 700 : 700;

  const depositoMin = isIndustrialMachinery ? 1500 : 450;
  const depositoMax = isIndustrialMachinery ? 1500 : 1800;

  const transporteNacMin = isIndustrialMachinery ? 600 : 200;
  const transporteNacMax = isIndustrialMachinery ? 600 : 1000;

  const transferenciaMin = isIndustrialMachinery ? 350 : 120;
  const transferenciaMax = isIndustrialMachinery ? 350 : 600;

  const gestionMin =
    honorariosMin + depositoMin + transporteNacMin + transferenciaMin;
  const gestionMax =
    honorariosMax + depositoMax + transporteNacMax + transferenciaMax;

  const totalMin = cifMin + impuestosMin + gestionMin;
  const totalMax = cifMax + impuestosMax + gestionMax;

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
      value: ncm ? `NCM ${ncm}` : "Sin clasificar aún",
      source: ncm ? "scraper" : "estimate",
      tone: ncm ? "gold" : "muted",
    },
    {
      id: "taxMode",
      label: "Impuestos",
      value: pcramTaxes
        ? "Tasas de PCRAM cuando disponibles"
        : "Estimación (sin tasas oficiales aplicadas)",
      source: pcramTaxes ? "pcram" : "estimate",
      tone: pcramTaxes ? "success" : "muted",
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
      id: "freight",
      label: "Flete marítimo",
      value:
        shippingProfile === "light"
          ? "Estimado (perfil liviano)"
          : shippingProfile === "heavy"
            ? "Estimado (perfil pesado)"
            : "Estimado (perfil medio)",
      source: "estimate",
      tone: "muted",
    },
    {
      id: "ops",
      label: "Operativos locales",
      value: isIndustrialMachinery
        ? "Defaults industriales (puerto + transporte + transferencia)"
        : "Defaults (puerto + transporte + transferencia)",
      source: "estimate",
      tone: "muted",
    },
  ];

  const quality = (() => {
    let q = 28;
    if (typeof inputs.product.fobUsd === "number") q += 18;
    if (typeof inputs.product.quantity === "number") q += 10;
    if (ncm) q += 18;
    if (pcramTaxes) q += 18;
    if (origin !== "Origen a confirmar") q += 8;
    if (shippingProfile === "light" || shippingProfile === "heavy") q += 6;
    // If we detected industrial machinery, we at least applied more realistic ops defaults.
    if (isIndustrialMachinery) q += 6;
    return Math.max(0, Math.min(100, q));
  })();

  // Nota: NCM/clasificación aduanera se mantiene interna (se usa para impuestos),
  // pero no se menciona ni se imprime en el chat.

  const explanation = [
    `Listo. Esta es una **estimación** para: **${title}**.`,
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
      value: moneyRange(round2(fleteMin), round2(fleteMax)),
      detail:
        qty === 1
          ? "Estimación marítima por unidad. Depende de peso/volumen y ruta."
          : `Estimación marítima total para ${qty} unidades (depende de CBM/peso).`,
    },
    {
      label: "Impuestos argentinos",
      value: moneyRange(round2(impuestosMin), round2(impuestosMax)),
      detail: impuestosDetail,
    },
    {
      label: "Gestión / despacho",
      value: moneyRange(gestionMin, gestionMax),
      detail:
        isIndustrialMachinery
          ? "Incluye honorarios, depósito/puerto, transporte nacional y transferencia internacional."
          : "Incluye honorarios, documental y operativos típicos (depósito/puerto, transporte local, transferencia).",
    },
    {
      label: "Total puesto en Argentina",
      value: moneyRange(round2(totalMin), round2(totalMax)),
      detail: "Rango para evitar falsa precisión. Se afina con peso/volumen y datos técnicos.",
      highlight: true,
    },
    {
      label: "Tiempos estimados",
      value: "Marítimo: 35–55 días",
      detail: "Incluye origen, consolidación, tránsito y aduana (rango típico).",
    },
  ];

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
      impuestosInternosMinUsd: round2(internosMin),
      impuestosInternosMaxUsd: round2(internosMax),
      impuestosTotalMinUsd: round2(impuestosMin),
      impuestosTotalMaxUsd: round2(impuestosMax),
      gestionMinUsd: round2(gestionMin),
      gestionMaxUsd: round2(gestionMax),
      honorariosMinUsd: round2(honorariosMin),
      honorariosMaxUsd: round2(honorariosMax),
      depositoPortuarioMinUsd: round2(depositoMin),
      depositoPortuarioMaxUsd: round2(depositoMax),
      transporteNacionalMinUsd: round2(transporteNacMin),
      transporteNacionalMaxUsd: round2(transporteNacMax),
      transferenciaIntlMinUsd: round2(transferenciaMin),
      transferenciaIntlMaxUsd: round2(transferenciaMax),
      totalMinUsd: round2(totalMin),
      totalMaxUsd: round2(totalMax),
    },
    assumptions,
    quality,
  };
}

