import type { Metadata } from "next";
import { VerticalLanding, type Vertical } from "@/app/ui/VerticalLanding";

const v: Vertical = {
  slug: "bienes-de-capital",
  nav: "Bienes de capital",
  eyebrow: "Importación de bienes de capital",
  titulo: "Bienes de capital, con los beneficios fiscales que te corresponden",
  intro:
    "Equipos e instalaciones para producir. Aprovechá el IVA reducido y las exenciones cuando aplican, con la operación bien encuadrada y el costo real a la vista.",
  chips: ["IVA 10,5%", "Tasa estadística exenta si aplica", "Encuadre correcto"],
  puntosTitulo: "Qué resolvemos en una importación de bienes de capital",
  puntos: [
    {
      t: "Encuadre como bien de capital",
      d: "Verificamos que tu equipo califique y quede bien declarado, que es lo que habilita los beneficios.",
    },
    {
      t: "Beneficios fiscales",
      d: "IVA reducido (10,5%) y percepciones reducidas en reventa cuando corresponde a tu perfil.",
    },
    {
      t: "Exención de tasa estadística",
      d: "Cuando el bien de capital cumple las condiciones (sin producción nacional, Mercosur, RIGI).",
    },
    {
      t: "Régimen, licencias y despacho",
      d: "Resolvemos las intervenciones y el despacho de punta a punta, con el costo total claro.",
    },
  ],
};

export const metadata: Metadata = {
  title: "Importar bienes de capital a Argentina — E-COMEX",
  description:
    "Importá equipos e instalaciones con los beneficios que te corresponden: IVA reducido, exención de tasa estadística cuando aplica y la operación bien encuadrada.",
  alternates: { canonical: "/bienes-de-capital" },
};

export default function Page() {
  return <VerticalLanding v={v} />;
}
