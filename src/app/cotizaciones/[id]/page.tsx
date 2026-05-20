/* eslint-disable @typescript-eslint/no-explicit-any */
// Prisma JSON fields (productJson, quoteJson) have deeply nested dynamic shapes — any casts are intentional.
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { AppShell } from "@/components/shell/AppShell";
import {
  ReporteAnalisisClient,
  type AgencyTone,
  type ReporteAnalisisData,
} from "./ReporteAnalisisClient";

export const runtime = "nodejs";

/* ───────────────────────── Helpers de derive ───────────────────────── */

const DEFAULT_WHATSAPP =
  process.env.NEXT_PUBLIC_ECOMEX_WHATSAPP?.replace(/\D/g, "") || "5491153530536";

function safeStr(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length ? s : "";
}

function pickFirst<T>(...vals: Array<T | null | undefined>): T | undefined {
  for (const v of vals) if (v != null) return v;
  return undefined;
}

function buildReportCode(id: string): string {
  // "id" suele venir como CUID/UUID. Tomamos un slug visible y estable.
  const cleaned = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const head = cleaned.slice(0, 4) || "0000";
  const tail = cleaned.slice(-2) || "CN";
  return `#COMEX-${head}-${tail}`;
}

function deriveTitle(product: any, fallback: string): string {
  return (
    safeStr(product?.displayTitle) ||
    safeStr(product?.title) ||
    safeStr(product?.raw?.urlAnalysis?.title) ||
    safeStr(product?.raw?.pcram?.title) ||
    safeStr(fallback) ||
    "Operación de importación"
  );
}

function deriveImageUrl(product: any): string | null {
  const candidates: Array<unknown> = [
    product?.raw?.operatorImageDataUrl,
    product?.imageUrl,
    Array.isArray(product?.images) ? product.images[0] : null,
    Array.isArray(product?.imageUrls) ? product.imageUrls[0] : null,
    Array.isArray(product?.raw?.images) ? product.raw.images[0] : null,
    product?.raw?.imageUrl,
  ];
  for (const c of candidates) {
    const s = typeof c === "string" ? c.trim() : "";
    if (s) return s;
  }
  return null;
}

function deriveNcm(product: any): { code: string; description: string } {
  const raw =
    safeStr(product?.ncm) ||
    safeStr(product?.raw?.ncm) ||
    safeStr(product?.raw?.ncmMeta?.ncm);
  const code = raw && raw !== "9999.99.99" ? raw : "—";
  const description =
    safeStr(product?.raw?.pcram?.title) ||
    safeStr(product?.raw?.ncmMeta?.description) ||
    "Clasificación aduanera estimada por IA. Debe ser validada por un despachante de aduana matriculado.";
  return { code, description };
}

/* ── Detectar organismos a partir de los strings de interventions ── */

const AGENCY_PATTERNS: Array<{
  re: RegExp;
  name: string;
  tone: AgencyTone;
}> = [
  { re: /\bAFIP\b|\baduan/i, name: "AFIP", tone: "blue" },
  { re: /\bSENASA\b|\b(zoo|fito)sanitar/i, name: "SENASA", tone: "green" },
  { re: /\bENACOM\b|\bcomunicacion(es)?\b/i, name: "ENACOM", tone: "violet" },
  { re: /\bANMAT\b|\b(medicamento|alimento|cosmetico)/i, name: "ANMAT", tone: "blue" },
  { re: /\bINTI\b/i, name: "INTI", tone: "gold" },
  { re: /\bINV\b|\bvinos?\b/i, name: "INV", tone: "violet" },
  { re: /\bSEDRONAR\b|\bestupefacient/i, name: "SEDRONAR", tone: "blue" },
  { re: /\bRENAR\b|\barmas?\b|\bmunici/i, name: "RENAR", tone: "blue" },
  { re: /\bIGJ\b/i, name: "IGJ", tone: "cyan" },
];

function deriveAgencyTags(
  interventions: string[]
): Array<{ name: string; tone: AgencyTone }> {
  const found = new Map<string, AgencyTone>();
  for (const text of interventions) {
    for (const p of AGENCY_PATTERNS) {
      if (p.re.test(text)) found.set(p.name, p.tone);
    }
  }
  // Toda importación pasa por AFIP/Aduana — la garantizamos visible.
  if (!found.has("AFIP")) found.set("AFIP", "blue");
  return Array.from(found.entries()).map(([name, tone]) => ({ name, tone }));
}

/* ── Mapear strings de interventions a tarjetas de requisitos ── */

type ReqAccent = "amber" | "blue" | "green" | "violet" | "muted";

function classifyRequirement(text: string): {
  title: string;
  description: string;
  icon: string;
  accent: ReqAccent;
} {
  const lower = text.toLowerCase();

  // Heurística para sacar un título corto + descripción.
  const compact = text.replace(/\s+/g, " ").trim();
  // Si el texto es largo, partimos por el primer ":" o "—" o "-".
  let title = compact;
  let description = compact;
  const splitMatch = compact.match(/^([^:—\-]{3,80})\s*[:—\-]\s*(.+)$/);
  if (splitMatch) {
    title = splitMatch[1].trim();
    description = splitMatch[2].trim();
  } else if (compact.length > 60) {
    title = compact.slice(0, 56).replace(/\s+\S*$/, "") + "…";
    description = compact;
  }

  if (/licenc|automatic|no.?automatic|lna|la\b/i.test(lower)) {
    return {
      title,
      description,
      icon: "warning",
      accent: "amber",
    };
  }
  if (/certific|seguridad|ensayo|norm|res(\s|\.)/i.test(lower)) {
    return {
      title,
      description,
      icon: "verified_user",
      accent: "blue",
    };
  }
  if (/madera|nimf|fitosan|embalaje|pallet/i.test(lower)) {
    return {
      title,
      description,
      icon: "agriculture",
      accent: "green",
    };
  }
  if (/sanitar|alimento|medicament|salud/i.test(lower)) {
    return {
      title,
      description,
      icon: "verified",
      accent: "blue",
    };
  }
  if (/comunic|telecom|frecuenc|radio/i.test(lower)) {
    return {
      title,
      description,
      icon: "wifi",
      accent: "violet",
    };
  }
  return { title, description, icon: "description", accent: "muted" };
}

function deriveRequirements(
  interventions: string[]
): ReporteAnalisisData["requirements"] {
  const dedup = Array.from(
    new Set(interventions.map((s) => s.trim()).filter(Boolean))
  );
  return dedup.slice(0, 6).map(classifyRequirement);
}

/* ── Estructura impositiva (porcentajes) ── */

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function deriveTaxStructure(
  product: any
): { taxes: ReporteAnalisisData["taxes"]; total: number | null } {
  const taxes = product?.raw?.pcram?.taxes ?? null;

  // Defaults Argentina (genéricos cuando no tenemos datos del NCM).
  const die = num(taxes?.DIE) ?? num(taxes?.AEC) ?? null;
  const te = num(taxes?.TE) ?? null;
  const iva = num(taxes?.IVA) ?? null;
  const ivaAdic = num(taxes?.["IVA ADIC"]) ?? null;
  const ganancias = num(taxes?.GANANCIAS) ?? null;
  const iibb = num(taxes?.IIBB) ?? null;

  const rows: ReporteAnalisisData["taxes"] = [];
  // AEC / DIE (derechos de importación)
  rows.push({ label: "AEC / DIE", pct: die ?? 35 });
  // Tasa Estadística
  rows.push({ label: "Tasa Estadística (TE)", pct: te ?? 3 });
  // IVA general
  rows.push({ label: "IVA (General)", pct: iva ?? 21 });
  // IVA adicional
  rows.push({ label: "IVA Adicional", pct: ivaAdic ?? 20 });
  // Ganancias / IIBB sólo si vienen del PCRAM (no son siempre aplicables)
  if (ganancias != null && ganancias > 0) {
    rows.push({ label: "Impuesto a las Ganancias", pct: ganancias });
  }
  if (iibb != null && iibb > 0) {
    rows.push({ label: "II.BB.", pct: iibb });
  }

  const total = rows.reduce<number>((acc, r) => acc + (r.pct ?? 0), 0);
  return { taxes: rows, total: Number.isFinite(total) ? total : null };
}

/* ───────────────────────── Page (server) ───────────────────────── */

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? null;
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;

  const quote = await prisma.quote
    .findUnique({ where: { id } })
    .catch(() => null);
  if (!quote) return notFound();

  // Mismo criterio que /api/quote/pdf y /api/quotes/[id]/decision:
  // - usuario logueado dueño, o
  // - quote sin userId pero con anonId que matchea la cookie
  const allowedByUser = Boolean(auth?.sub && quote.userId && quote.userId === auth.sub);
  const allowedByAnon = Boolean(!quote.userId && anonId && quote.anonId === anonId);
  if (!allowedByUser && !allowedByAnon) return notFound();

  const product = (quote.productJson ?? {}) as any;
  const quoteJson = (quote.quoteJson ?? {}) as any;

  const title = deriveTitle(product, quote.userText);
  const imageUrl = deriveImageUrl(product);
  const ncm = deriveNcm(product);
  const interventions: string[] = Array.isArray(product?.raw?.pcram?.interventions)
    ? product.raw.pcram.interventions
    : [];
  const agencyTags = deriveAgencyTags(interventions);
  const requirements = deriveRequirements(interventions);
  const { taxes, total: taxTotalPct } = deriveTaxStructure(product);

  // Costo arribado: priorizamos breakdown.totalMaxUsd (el más conservador / cercano a "todo incluido"),
  // sino totalMinUsd, sino totales del quote.
  const arrivedUsd =
    pickFirst<number>(
      typeof quoteJson?.breakdown?.totalMaxUsd === "number"
        ? quoteJson.breakdown.totalMaxUsd
        : null,
      typeof quote.totalMaxUsd === "number" ? quote.totalMaxUsd : null,
      typeof quoteJson?.breakdown?.totalMinUsd === "number"
        ? quoteJson.breakdown.totalMinUsd
        : null,
      typeof quote.totalMinUsd === "number" ? quote.totalMinUsd : null
    ) ?? null;

  const mode: "quote" | "budget" = quote.mode === "budget" ? "budget" : "quote";
  const pdfHref = `/api/quote/pdf?id=${encodeURIComponent(quote.id)}&mode=${mode}`;
  const whatsappHref = `https://wa.me/${DEFAULT_WHATSAPP}?text=${encodeURIComponent(
    `Hola E-COMEX, quería hablar sobre el reporte ${buildReportCode(quote.id)} (${title}).`
  )}`;

  const data: ReporteAnalisisData = {
    id: quote.id,
    reportCode: buildReportCode(quote.id),
    mode,
    stage: String(quote.stage ?? "quoted"),
    createdAtISO: new Date(quote.createdAt).toISOString(),
    pdfHref,
    whatsappHref,
    product: {
      title,
      subtitle: "Análisis Inteligente de Factibilidad de Importación generado por IA",
      imageUrl,
    },
    ncm,
    agencyTags,
    cost: {
      arrivedUsd,
      label: "Costo Estimado Arribado",
    },
    requirements,
    taxes,
    taxTotalPct,
  };

  return (
    <AppShell active="cotizaciones" maxWidth="1280px">
      <ReporteAnalisisClient data={data} />
    </AppShell>
  );
}
