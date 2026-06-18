import Link from "next/link";
import Image from "next/image";
import ForgotForm from "../ui/ForgotForm";

export const runtime = "nodejs";
export const metadata = { title: "Restablecer contraseña — E-COMEX" };

export default function ForgotPage() {
  return (
    <div className="min-h-screen bg-[#07111A] text-white" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07111A]/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-[1200px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/brand/ecomex-logo.png" alt="E-COMEX" width={100} height={24} className="h-5 w-auto brightness-0 invert opacity-90" />
          </Link>
          <Link
            href="/account/login"
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] font-medium text-[#94a3b8] transition-colors hover:text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100dvh-56px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <ForgotForm />
        </div>
      </main>
    </div>
  );
}
