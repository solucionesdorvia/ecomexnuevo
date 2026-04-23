import { getSessionUser } from "@/lib/auth/session";
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
  const user = await getSessionUser();
  const isOperator = user?.role === "operator" || user?.role === "admin";
  return (
    <NuevaOperacionClient
      initialNcm={firstParam(sp.ncm)}
      initialProducto={firstParam(sp.producto)}
      isOperator={isOperator}
    />
  );
}
