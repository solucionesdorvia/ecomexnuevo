import ClasificarNcmClient from "./ClasificarNcmClient";

export const metadata = {
  title: "Laboratorio NCM — E-COMEX",
  description: "Probá el clasificador NCM (texto) con salida detallada y JSON.",
};

export default function ClasificarNcmPage() {
  return <ClasificarNcmClient />;
}
