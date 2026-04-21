import ClasificarNcmClient from "./ClasificarNcmClient";

export const metadata = {
  title: "Clasificación NCM — E-COMEX",
  description: "Clasificá tu producto y obtené la posición arancelaria NCM.",
};

export default function ClasificarNcmPage() {
  return <ClasificarNcmClient />;
}
