import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AnalysisResponse } from "@/components/analysis/flowTypes";

export function RequirementsPanel({ data }: { data: AnalysisResponse | null }) {
  const items = data?.analysis?.pcram?.interventions ?? [];
  return (
    <Card>
      <CardHeader eyebrow="REQUISITOS" title="Import requirements" icon="verified_user" />
      <CardContent className="space-y-2">
        {items.length ? (
          items.slice(0, 8).map((x, i) => (
            <div key={`${x}-${i}`} className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted">
              {x}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs text-muted">
            Sin requisitos cargados para esta clasificación.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
