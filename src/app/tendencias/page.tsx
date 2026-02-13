import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SealVerified } from "@/components/ui/SealVerified";
import { AppShell } from "@/components/shell/AppShell";
import { TendenciasClient, type Signal } from "@/app/tendencias/ui/TendenciasClient";

export const runtime = "nodejs";

export default function TendenciasPage() {
  const signals: Signal[] = [
    {
      id: "solar",
      icon: "solar_power",
      title: "Paneles solares monocristalinos",
      rubro: "Energía renovable",
      sub: "Energía renovable • Tier 1",
      trend: "+45.2%",
      impact: "alto",
      impactArea: "costo",
      reason:
        "Demanda sostenida + costos FOB estabilizados. Ideal para cotizar con intervención y documentación.",
      recommendation: "recomendado",
    },
    {
      id: "lfp",
      icon: "battery_charging_full",
      title: "Baterías de litio LFP",
      rubro: "Energía renovable",
      sub: "Almacenamiento • Industria",
      trend: "+38.7%",
      impact: "alto",
      impactArea: "riesgo",
      reason:
        "Alta rotación. Validar requisitos por química, potencia y uso (seguridad).",
      recommendation: "alta",
    },
    {
      id: "arm",
      icon: "memory",
      title: "Microcontroladores ARM",
      rubro: "Tecnología & IT",
      sub: "Electrónica • Componentes",
      trend: "+22.1%",
      impact: "medio",
      impactArea: "costo",
      reason:
        "Buen ratio valor/peso. El total depende de clasificación y tu condición fiscal.",
      recommendation: "rotacion",
    },
    {
      id: "textil",
      icon: "checkroom",
      title: "Indumentaria técnica (poly/nylon)",
      rubro: "Textil & calzado",
      sub: "Textil • Alta dispersión de NCM",
      trend: "+16.4%",
      impact: "medio",
      impactArea: "riesgo",
      reason:
        "La clasificación y la composición cambian tributos. Cotizar con ficha técnica reduce sorpresas.",
      recommendation: "alta",
    },
    {
      id: "agro",
      icon: "agriculture",
      title: "Repuestos de maquinaria agrícola",
      rubro: "Agroindustria",
      sub: "Agro • Repuestos/consumo",
      trend: "+12.9%",
      impact: "bajo",
      impactArea: "timing",
      reason:
        "Buena salida estacional. El timing de compra impacta disponibilidad y plazos de producción.",
      recommendation: "rotacion",
    },
  ];

  return (
    <AppShell
      active="tendencias"
      title="Señales"
      subtitle="Radar de oportunidades"
      right={
        <div className="flex items-center gap-2">
          <Badge tone="success" icon="sensors">
            En vivo
          </Badge>
          <SealVerified />
          <ButtonLink href="/chat" variant="primary">
            Cotizar
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </ButtonLink>
        </div>
      }
      maxWidth="1280px"
    >
      <SectionHeader
        eyebrow="SEÑALES"
        title="Señales del mercado"
        subtitle="Módulos orientativos con “Razón IA” e impacto. Explorá y después cotizá."
        icon="trending_up"
      />

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge tone="muted" icon="calendar_today">
          Últimos 30 días
        </Badge>
        <Badge tone="primary" icon="download">
          Descargar reporte (demo)
        </Badge>
      </div>

      <TendenciasClient signals={signals} />
    </AppShell>
  );
}

