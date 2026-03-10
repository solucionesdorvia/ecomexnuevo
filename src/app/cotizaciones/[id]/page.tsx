import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ProductSnapshot } from "@/components/analysis/ProductSnapshot";
import { NcmClassificationPanel } from "@/components/analysis/NcmClassificationPanel";
import { RequirementsPanel } from "@/components/analysis/RequirementsPanel";
import { QuoteBreakdownPanel } from "@/components/analysis/QuoteBreakdownPanel";
import { LogisticsTimeline } from "@/components/analysis/LogisticsTimeline";
import { PdfPreviewPanel } from "@/components/analysis/PdfPreviewPanel";
import { NormalizedDescriptionPanel } from "@/components/analysis/NormalizedDescriptionPanel";
import { QuoteActionsBar } from "@/components/analysis/QuoteActionsBar";
import type { AnalysisResponse } from "@/components/analysis/flowTypes";

export const runtime = "nodejs";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await prisma.quote.findUnique({ where: { id } }).catch(() => null);
  if (!q) return notFound();

  const quoteJson: any = q.quoteJson ?? {};
  const product: any = q.productJson ?? {};
  const analysisLike: AnalysisResponse = {
    productPreview: {
      title: product?.title ?? product?.displayTitle ?? q.userText,
      sourceUrl: q.sourceUrl ?? product?.url,
      origin: product?.origin,
      category: product?.category,
      quantity: product?.quantity,
    },
    ncm: product?.ncm,
    cards: Array.isArray(quoteJson?.cards) ? quoteJson.cards : [],
    breakdown: quoteJson?.breakdown,
    analysis: {
      ncm: product?.ncm,
      normalizedTitle: product?.displayTitle ?? product?.title,
      pcram: product?.raw?.pcram
        ? { interventions: Array.isArray(product.raw.pcram?.interventions) ? product.raw.pcram.interventions : [] }
        : undefined,
      timing: { minDays: 35, maxDays: 55, route: "maritime" },
      totals:
        typeof q.totalMinUsd === "number" && typeof q.totalMaxUsd === "number"
          ? { totalMinUsd: q.totalMinUsd, totalMaxUsd: q.totalMaxUsd }
          : undefined,
    },
  };

  return (
    <AppShell
      active="cotizaciones"
      title="Detalle de cotización"
      subtitle={`ID ${q.id.slice(0, 8)} · ${new Date(q.createdAt).toLocaleString()}`}
      right={<Badge tone="primary" icon="description">Quote Detail</Badge>}
      maxWidth="1320px"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/cotizaciones" className="text-xs font-bold uppercase tracking-[0.14em] text-muted hover:text-strong">
            Volver a cotizaciones
          </Link>
          <Badge tone="muted" icon="schedule">{String(q.stage ?? "quoted")}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ProductSnapshot data={analysisLike} />
          <NormalizedDescriptionPanel text={analysisLike.analysis?.normalizedTitle ?? q.userText} />
          <NcmClassificationPanel data={analysisLike} />
          <RequirementsPanel data={analysisLike} />
          <QuoteBreakdownPanel data={analysisLike} />
          <LogisticsTimeline data={analysisLike} />
          <PdfPreviewPanel href={`/api/quote/pdf?id=${encodeURIComponent(q.id)}`} />
          <Card>
            <CardHeader eyebrow="ACCIONES" title="Quote actions" icon="checklist" />
            <CardContent>
              <QuoteActionsBar pdfHref={`/api/quote/pdf?id=${encodeURIComponent(q.id)}`} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader eyebrow="HISTORIAL" title="Timeline de decisión" icon="history" />
          <CardContent className="space-y-2 text-sm text-muted">
            <div>Creada: {new Date(q.createdAt).toLocaleString()}</div>
            <div>Última actualización: {new Date(q.updatedAt).toLocaleString()}</div>
            <div>Estado: {String(q.stage ?? "quoted")}</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
