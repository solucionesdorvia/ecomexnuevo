import NuevaOperacionClient from "./NuevaOperacionClient";

export const metadata = { title: "Nueva operación — E-COMEX" };

function firstParam(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && v[0]) return v[0];
  return undefined;
}

export default async function NuevaOperacionPage({
  searchParams,
}: {
  searchParams: Promise<{ ncm?: string | string[]; producto?: string | string[] }>;
}) {
  const sp = await searchParams;
  return (
    <NuevaOperacionClient initialNcm={firstParam(sp.ncm)} initialProducto={firstParam(sp.producto)} />
  );
}
