import type { Metadata } from "next";
import Link from "next/link";
import CotizadorPublicoClient from "./CotizadorPublicoClient";

export const metadata: Metadata = {
  title: "Calculadora de importaciones gratis — E-COMEX",
  description:
    "Calculá gratis cuánto sale importar a Argentina. NCM, aranceles, flete, impuestos y landed cost en minutos. Sin registro.",
};

const NAV_BG = "#07111A";
const BORDER = "rgba(255,255,255,0.06)";
const CYAN = "#18C3D6";

export default function CotizadorPage() {
  return (
    <div
      style={{
        background: NAV_BG,
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-body, 'Inter', sans-serif)",
      }}
    >
      {/* Minimal navbar */}
      <nav
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: `${NAV_BG}e6`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 20px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/">
            <img
              src="/brand/ecomex-logo.png"
              alt="E-COMEX"
              style={{ height: 18, filter: "brightness(0) invert(1)" }}
            />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                color: "#A7B3C2",
                textDecoration: "none",
              }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: CYAN,
                borderRadius: 8,
                padding: "6px 14px",
                textDecoration: "none",
              }}
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Chat area */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <CotizadorPublicoClient />
      </main>
    </div>
  );
}
