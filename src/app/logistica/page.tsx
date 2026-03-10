import { AppShell } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

const mockDepartures = [
  { route: "Shanghai -> Buenos Aires", nextDate: "2026-03-18", availability: "Alta", container: "40HC" },
  { route: "Shenzhen -> Buenos Aires", nextDate: "2026-03-22", availability: "Media", container: "40HC" },
  { route: "Ningbo -> Buenos Aires", nextDate: "2026-03-27", availability: "Baja", container: "20GP" },
];

export default function LogisticaPage() {
  return (
    <AppShell
      active="tendencias"
      title="Logística y Embarques"
      subtitle="Salidas próximas, disponibilidad y estado de contenedores."
      right={<Badge tone="primary" icon="directions_boat">Live Slots</Badge>}
      maxWidth="1320px"
    >
      <div className="grid gap-4">
        {mockDepartures.map((d) => (
          <Card key={`${d.route}-${d.nextDate}`}>
            <CardHeader eyebrow="EMBARQUE" title={d.route} icon="inventory_2" />
            <CardContent className="grid gap-2 text-sm md:grid-cols-3">
              <div className="text-muted">Próxima salida: <span className="font-bold text-strong">{d.nextDate}</span></div>
              <div className="text-muted">Disponibilidad: <span className="font-bold text-strong">{d.availability}</span></div>
              <div className="text-muted">Contenedor: <span className="font-bold text-strong">{d.container}</span></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
