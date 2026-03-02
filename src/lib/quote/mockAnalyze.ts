import type { Quote, QuoteCost, ScrapeResult } from "@/lib/quote/types";

type AnalyzeInput = {
  input: string;
  quantity: number;
};

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80",
];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function nextShipment(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function buildCosts(unitPrice: number, quantity: number): QuoteCost {
  const fobUsd = unitPrice * quantity;
  const freightUsd = Math.max(280, fobUsd * 0.14);
  const insuranceUsd = fobUsd * 0.015;
  const importDutyUsd = fobUsd * 0.18;
  const estadisticaUsd = fobUsd * 0.03;
  const ivaUsd = (fobUsd + freightUsd + insuranceUsd + importDutyUsd) * 0.21;
  const dispatchFeesUsd = 240;
  const inlandLogisticsUsd = 180;
  const bankFeesUsd = 95;
  const totalUsd =
    fobUsd +
    freightUsd +
    insuranceUsd +
    importDutyUsd +
    estadisticaUsd +
    ivaUsd +
    dispatchFeesUsd +
    inlandLogisticsUsd +
    bankFeesUsd;

  return {
    quantity,
    fobUsd,
    freightUsd,
    insuranceUsd,
    importDutyUsd,
    estadisticaUsd,
    ivaUsd,
    dispatchFeesUsd,
    inlandLogisticsUsd,
    bankFeesUsd,
    totalUsd,
  };
}

export async function analyzeProduct({ input, quantity }: AnalyzeInput): Promise<Quote> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const cleanInput = input.trim();
  const looksLikeUrl = /^https?:\/\//i.test(cleanInput);
  const inferredTitle = looksLikeUrl
    ? "Smart Industrial Label Printer 4-inch Thermal"
    : cleanInput || "Producto técnico sin título";

  const scrape: ScrapeResult = {
    title: inferredTitle,
    description:
      "Impresora térmica industrial para etiquetado logístico. Resolución 300dpi, conectividad USB/LAN y chasis reforzado para operación continua.",
    images: SAMPLE_IMAGES,
    sourceUrl: looksLikeUrl ? cleanInput : "https://supplier.example.com/product/industrial-printer",
    currency: "USD",
    unitPrice: Number(randomBetween(58, 76).toFixed(2)),
    supplier: "Shenzhen North Harbor Tech Co.",
    originCountry: "China",
  };

  const costs = buildCosts(scrape.unitPrice, Math.max(1, quantity || 120));
  const ncmConfidence = Number(randomBetween(0.78, 0.94).toFixed(2));

  return {
    id: `mock-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "draft",
    rubro: "Equipamiento industrial ligero",
    customer: "Cuenta demo",
    scrape,
    normalizedDescription:
      "Impresora térmica industrial para etiquetas autoadhesivas de logística y trazabilidad, alimentación 220V, uso comercial continuo.",
    ncm: {
      ncm: "8443.32.99",
      confidence: ncmConfidence,
      candidates: [
        { ncm: "8443.32.99", label: "Impresoras de códigos / etiquetas", confidence: ncmConfidence },
        { ncm: "8471.60.90", label: "Periféricos de salida de datos", confidence: 0.58 },
        { ncm: "8479.89.99", label: "Máquinas y aparatos no especificados", confidence: 0.31 },
      ],
    },
    regulations: [
      { id: "r1", title: "Revisión de etiquetado comercial en castellano", status: "required" },
      { id: "r2", title: "Validación de compatibilidad eléctrica y seguridad", status: "review" },
      { id: "r3", title: "Declaración técnica de uso industrial", status: "recommended" },
    ],
    costs,
    timing: {
      etaRangeDays: [37, 52],
      route: "Yantian -> Buenos Aires + despacho local",
      riskLevel: "medium",
      riskNotes: [
        "Posible demora por consolidación de bulto fuera de estándar.",
        "NCM con buena confianza, pero requiere validación documental final.",
      ],
      nextShipmentDate: nextShipment(9),
      containerOccupancy: 64,
    },
    reportSummary:
      "El producto es viable para importación con riesgo controlado. El principal driver del total es la carga tributaria + flete consolidado; conviene cerrar especificaciones técnicas para elevar confianza NCM antes de emitir cotización formal.",
  };
}

