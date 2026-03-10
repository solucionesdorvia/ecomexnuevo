import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AnalysisResponse } from "@/components/analysis/flowTypes";

export function NcmClassificationPanel({ data }: { data: AnalysisResponse | null }) {
  const ncm = data?.ncm ?? data?.analysis?.ncm ?? "A validar";
  const source = data?.analysis?.ncmMeta?.source ?? "n/a";
  const conf = data?.analysis?.ncmMeta?.confidence;

  return (
    <Card>
      <CardHeader eyebrow="NCM" title="NCM classification" icon="gavel" />
      <CardContent className="space-y-2 text-sm">
        <div className="text-lg font-black text-strong">{ncm}</div>
        <div className="text-muted">Fuente: {source}</div>
        <div className="text-muted">
          Confianza: {typeof conf === "number" ? `${Math.round(conf * 100)}%` : "Sin score"}
        </div>
      </CardContent>
    </Card>
  );
}
