import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { AnalysisResponse } from "@/components/analysis/flowTypes";

export function LogisticsTimeline({ data }: { data: AnalysisResponse | null }) {
  const t = data?.analysis?.timing;
  const steps = [
    { title: "Carga origen", eta: "Día 0-3" },
    { title: "Tránsito internacional", eta: t?.minDays && t?.maxDays ? `${t.minDays}-${t.maxDays} días` : "Pendiente" },
    { title: "Nacionalización y entrega", eta: "Día +3-7" },
  ];

  return (
    <Card>
      <CardHeader eyebrow="LOGISTICA" title="Timing / logistics" icon="directions_boat" />
      <CardContent className="space-y-2">
        {steps.map((s) => (
          <div key={s.title} className="flex items-center justify-between rounded-xl border border-subtle bg-[var(--surface)] px-3 py-2 text-xs">
            <span className="text-muted">{s.title}</span>
            <span className="font-bold text-strong">{s.eta}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
