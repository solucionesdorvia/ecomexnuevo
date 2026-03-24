import ClasificadorClient from "./ClasificadorClient";

export const metadata = {
  title: "Clasificador NCM — E-COMEX",
  description: "Clasificá tu producto y obtené la posición arancelaria NCM estimada al instante.",
};

export default function ClasificadorPage() {
  return <ClasificadorClient />;
}
