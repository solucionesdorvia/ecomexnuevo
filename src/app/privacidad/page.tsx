import Link from "next/link";
import Image from "next/image";

export const runtime = "nodejs";
export const metadata = {
  title: "Política de Privacidad — E-COMEX",
  description: "Cómo E-COMEX recolecta, usa y protege tus datos personales.",
};

const UPDATED = "Junio de 2026";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#07111A] text-white" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07111A]/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-[860px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={100} height={24} className="h-5 w-auto brightness-0 invert opacity-90" />
          </Link>
          <Link href="/terminos" className="text-[13px] text-[#94a3b8] transition-colors hover:text-white">Términos</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-5 py-12 lg:px-8">
        <h1 className="text-[28px] font-extrabold tracking-tight text-white">Política de Privacidad</h1>
        <p className="mt-2 text-[13px] text-[#5a6577]">Última actualización: {UPDATED}</p>

        <div className="mt-8 space-y-7 text-[14px] leading-relaxed text-[#aab4c2]">
          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">1. Responsable de los datos</h2>
            <p>
              Los datos personales son tratados por <strong>〈Razón social — ej. E-COMEX S.A.S.〉</strong>, CUIT 〈XX-XXXXXXXX-X〉,
              con domicilio en 〈Domicilio〉, Buenos Aires, Argentina. Para cualquier consulta sobre tus datos podés
              escribir a <a href="mailto:info@e-comex.com.ar" className="text-[#18C3D6] hover:underline">info@e-comex.com.ar</a>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">2. Qué datos recolectamos</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>De cuenta:</strong> email y contraseña (almacenada cifrada, nunca en texto plano).</li>
              <li><strong>De perfil de importador:</strong> CUIT, condición fiscal, provincia y datos comerciales que cargues.</li>
              <li><strong>De uso:</strong> productos consultados, cotizaciones y documentos que subís (facturas, fichas).</li>
              <li><strong>Técnicos:</strong> dirección IP y datos del navegador, con fines estadísticos y de seguridad.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">3. Para qué los usamos</h2>
            <p>
              Para prestar el servicio (clasificar productos, calcular cotizaciones de importación, gestionar tu cuenta),
              comunicarnos con vos sobre tus operaciones y mejorar la plataforma. No vendemos tus datos a terceros.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">4. Con quién los compartimos</h2>
            <p>
              Solo con proveedores que nos permiten operar (alojamiento, base de datos, envío de emails y servicios de IA
              para clasificación), que tratan los datos por nuestra cuenta y bajo confidencialidad. No se realizan
              transferencias con otros fines.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">5. Tus derechos (Ley 25.326)</h2>
            <p>
              De acuerdo con la Ley de Protección de Datos Personales N.º 25.326, podés solicitar el acceso, rectificación,
              actualización o supresión de tus datos escribiendo a <a href="mailto:info@e-comex.com.ar" className="text-[#18C3D6] hover:underline">info@e-comex.com.ar</a>.
              La Agencia de Acceso a la Información Pública es el órgano de control de la norma.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">6. Cookies</h2>
            <p>
              Usamos cookies propias necesarias para mantener tu sesión iniciada y, eventualmente, cookies de terceros con
              fines estadísticos. Podés bloquearlas desde tu navegador, aunque algunas funciones podrían dejar de
              funcionar correctamente.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">7. Seguridad y conservación</h2>
            <p>
              Aplicamos medidas técnicas razonables para proteger tus datos. Los conservamos mientras tengas una cuenta
              activa o sea necesario para cumplir obligaciones legales.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-[16px] font-bold text-white">8. Cambios</h2>
            <p>Podemos actualizar esta política; publicaremos la nueva versión en esta misma página con su fecha.</p>
          </section>
        </div>

        <div className="mt-10 border-t border-white/[0.06] pt-6 text-[13px]">
          <Link href="/" className="text-[#18C3D6] hover:underline">← Volver al inicio</Link>
        </div>
      </main>
    </div>
  );
}
