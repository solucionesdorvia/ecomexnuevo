import type { Metadata } from "next";
import { VerticalLanding, type Vertical } from "@/app/ui/VerticalLanding";

const v: Vertical = {
  slug: "maquinaria",
  nav: "Maquinaria",
  eyebrow: "Importación de maquinaria e industria",
  titulo: "Traé maquinaria industrial con el costo claro desde el día cero",
  intro:
    "Máquinas, líneas de producción y repuestos. Aprovechá el tratamiento de bien de capital, resolvé intervenciones y flete, y conocé el costo total antes de operar.",
  chips: ["Bien de capital — IVA 10,5%", "Intervenciones y partes", "Flete FCL / flat rack"],
  puntosTitulo: "Qué resolvemos en una importación de maquinaria",
  puntos: [
    {
      t: "Clasificación de la máquina y sus partes",
      d: "La posición correcta para la máquina completa y para repuestos y accesorios, que muchas veces van aparte.",
    },
    {
      t: "Tratamiento de bien de capital",
      d: "Cuando corresponde, IVA reducido (10,5%) y percepciones acordes, bien declarado desde el principio.",
    },
    {
      t: "Intervenciones previas",
      d: "Gestionamos los organismos que apliquen a tu equipo según su tipo, para que no frene en aduana.",
    },
    {
      t: "Flete y despacho especial",
      d: "Contenedor, flat rack u open top según dimensiones, y despacho coordinado hasta planta.",
    },
  ],
};

export const metadata: Metadata = {
  title: "Importar maquinaria industrial a Argentina — E-COMEX",
  description:
    "Importá máquinas, líneas de producción y repuestos con el costo total claro: bien de capital, intervenciones, flete especial y despacho resueltos por un especialista.",
  alternates: { canonical: "/maquinaria" },
};

export default function Page() {
  return <VerticalLanding v={v} />;
}
