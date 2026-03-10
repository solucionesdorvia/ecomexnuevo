import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AnalysisResponse } from "@/components/analysis/flowTypes";

export function ProductSnapshot({ data }: { data: AnalysisResponse | null }) {
  return (
    <Card>
      <CardHeader eyebrow="PRODUCTO" title="Product detected" icon="inventory_2" />
      <CardContent className="space-y-2 text-sm">
        <div className="font-bold text-strong">{data?.productPreview?.title ?? "Pendiente de análisis"}</div>
        <div className="text-muted">
          {data?.productPreview?.origin ? `Origen: ${data.productPreview.origin}` : "Origen no detectado"}
        </div>
        <div className="text-muted">
          {data?.productPreview?.sourceUrl ? data.productPreview.sourceUrl : "Sin URL fuente"}
        </div>
      </CardContent>
    </Card>
  );
}
