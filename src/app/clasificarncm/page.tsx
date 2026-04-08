import ClasificarNcmClient from "./ClasificarNcmClient";

export const metadata = {
  title: "Clasificación NCM conversacional — E-COMEX",
  description:
    "Analista técnico para posición arancelaria NCM: preguntas, refinamiento y confianza.",
};

export default function ClasificarNcmPage() {
  return <ClasificarNcmClient />;
}
