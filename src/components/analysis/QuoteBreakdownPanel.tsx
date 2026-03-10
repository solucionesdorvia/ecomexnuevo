import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AnalysisResponse } from "@/components/analysis/flowTypes";

function asMoney(v?: number) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function QuoteBreakdownPanel({ data }: { data: AnalysisResponse | null }) {
  const b = data?.breakdown;
  const totals = data?.analysis?.totals;
  return (
    <Card>
      <CardHeader eyebrow="COSTOS" title="Quote breakdown" icon="calculate" />
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted">
          FOB total: <span className="font-bold text-strong">{asMoney(b?.fobTotalUsd as number | undefined)}</span>
        </div>
        <div className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted">
          Flete:{" "}
          <span className="font-bold text-strong">
            {asMoney(b?.fleteMinUsd as number | undefined)} - {asMoney(b?.fleteMaxUsd as number | undefined)}
          </span>
        </div>
        <div className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted md:col-span-2">
          Total estimado:{" "}
          <span className="font-bold text-strong">
            {asMoney((b?.totalMinUsd as number | undefined) ?? totals?.totalMinUsd)} -{" "}
            {asMoney((b?.totalMaxUsd as number | undefined) ?? totals?.totalMaxUsd)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
