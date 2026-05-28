import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import CotizadorPublicoClient from "./CotizadorPublicoClient";

export const metadata: Metadata = {
  title: "Agente IA cotizador — E-COMEX",
  description:
    "Cotizá gratis cuánto sale importar a Argentina. NCM, aranceles, flete, impuestos y landed cost en minutos. Sin registro.",
};

export default function CotizadorPage() {
  return (
    <div
      className="flex h-[100dvh] flex-col bg-[#07111A]"
      style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}
    >
      {/* Minimal navbar */}
      <nav className="shrink-0 border-b border-white/[0.06] bg-[#07111A]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5">
          <Link href="/" aria-label="E-COMEX — Inicio">
            <Image
              src="/brand/ecomex-logo.png"
              alt="E-COMEX"
              width={90}
              height={18}
              className="h-[18px] w-auto brightness-0 invert"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/account/login?next=%2Fcotizador"
              className="text-[13px] text-[#a7b3c2] transition-colors hover:text-white"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/account/register?next=%2Fcotizador"
              className="rounded-lg bg-[#18C3D6] px-3.5 py-1.5 text-[13px] font-semibold text-[#030d18] transition-colors hover:bg-[#0ea5b9]"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Chat area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CotizadorPublicoClient />
      </main>
    </div>
  );
}
