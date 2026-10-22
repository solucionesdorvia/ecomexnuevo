import type { Metadata } from "next";
import { VerticalLanding, type Vertical } from "@/app/ui/VerticalLanding";

const v: Vertical = {
  slug: "vehiculos",
  nav: "Vehículos",
  eyebrow: "Importación de vehículos y flotas",
  titulo: "Importá vehículos y flotas sin sorpresas en el costo",
  intro:
    "Autos, utilitarios, camiones y flotas completas. Clasificación, licencias, régimen y logística resueltos por un especialista, con el costo total claro antes de comprometer la compra.",
  chips: ["Nuevos y usados", "Licencias y homologación", "RORO o contenedor"],
  puntosTitulo: "Qué resolvemos en una importación de vehículos",
  puntos: [
    {
      t: "Clasificación del vehículo",
      d: "Posición arancelaria correcta según tipo, uso y condición (nuevo o usado), con el arancel que corresponde.",
    },
    {
      t: "Licencias y certificaciones",
      d: "Gestionamos las intervenciones y homologaciones previas para que la unidad pueda nacionalizarse sin trabas.",
    },
    {
      t: "Régimen y aranceles reales",
      d: "Derechos, tasas e impuestos calculados sobre tu operación concreta, no sobre un estimado genérico.",
    },
    {
      t: "Logística y despacho",
      d: "Elegimos la vía (RORO, contenedor o flat rack) y coordinamos el despacho hasta la entrega.",
    },
  ],
};

export const metadata: Metadata = {
  title: "Importar vehículos y flotas a Argentina — E-COMEX",
  description:
    "Importá autos, utilitarios, camiones y flotas con el costo total claro: clasificación, licencias, aranceles y logística resueltos por un especialista.",
  alternates: { canonical: "/vehiculos" },
};

export default function Page() {
  return <VerticalLanding v={v} />;
}
