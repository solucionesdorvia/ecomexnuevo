import Link from "next/link";
import Image from "next/image";

export const runtime = "nodejs";
export const metadata = {
  title: "Términos y Condiciones — E-COMEX",
  description: "Condiciones de uso de la plataforma E-COMEX.",
};

const UPDATED = "Junio de 2026";

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[#07111A] text-white" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07111A]/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-[860px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={100} height={24} className="h-5 w-auto brightness-0 invert opacity-90" />
          </Link>
          <Link href="/privacidad" className="text-[13px] text-[#94a3b8] transition-colors hover:text-white">Privacidad</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12 lg:px-8">
        <h1 className="text-[28px] font-extrabold tracking-tight text-white">Términos y Condiciones</h1>
        <p className="mt-2 text-[13px] text-[#5a6577]">Última actualización: {UPDATED}</p>

        <div className="mt-8 space-y-7 text-[14px] leading-relaxed text-[#aab4c2]">
          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">1. Aceptación</h2>
            <p>
              Al usar la plataforma E-COMEX, operada por <strong>〈Razón social〉</strong> (CUIT 〈XX-XXXXXXXX-X〉),
              aceptás estos Términos. Si no estás de acuerdo, no utilices el servicio.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">2. Qué es el servicio</h2>
            <p>
              E-COMEX es una herramienta de apoyo para clasificación de mercaderías (NCM) y estimación de costos de
              importación a la Argentina. Es una ayuda a la decisión, no un servicio de despacho aduanero ni asesoramiento
              legal, contable o impositivo.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">3. Naturaleza estimativa de las cotizaciones</h2>
            <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-[#e7d9b0]">
              <strong>Importante:</strong> las cotizaciones, posiciones arancelarias (NCM), alícuotas e impuestos que
              muestra la plataforma son <strong>estimaciones orientativas</strong>. Pueden variar según la clasificación
              definitiva, el régimen aplicable, intervenciones, el tipo de cambio y la normativa vigente al momento del
              despacho. La clasificación y los tributos finales se confirman con un despachante de aduana del equipo de
              E-COMEX, junto con tu contador. E-COMEX no garantiza exactitud y no es responsable por decisiones tomadas en
              base a estas estimaciones.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">4. Uso de la cuenta</h2>
            <p>
              Sos responsable de la confidencialidad de tu contraseña y de la actividad de tu cuenta. Debés brindar
              información veraz y mantenerla actualizada.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">5. Limitación de responsabilidad</h2>
            <p>
              En la máxima medida permitida por la ley, E-COMEX no responde por daños indirectos, lucro cesante ni
              perjuicios derivados del uso o la imposibilidad de uso del servicio, ni por diferencias entre las
              estimaciones y los valores efectivamente liquidados por la Aduana.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">6. Propiedad intelectual</h2>
            <p>El software, la marca y los contenidos de E-COMEX son de su titular. No está permitido copiarlos ni revenderlos sin autorización.</p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">7. Ley aplicable</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina. Ante cualquier controversia, las partes se
              someten a los tribunales ordinarios de 〈Ciudad / jurisdicción〉.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">8. Contacto</h2>
            <p>Consultas: <a href="mailto:info@e-comex.com.ar" className="text-[#18C3D6] hover:underline">info@e-comex.com.ar</a>.</p>
          </section>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 text-[13px]">
          <Link href="/" className="text-[#18C3D6] hover:underline">← Volver al inicio</Link>
        </div>
      </main>
    </div>
  );
}
