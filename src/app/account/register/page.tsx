import Link from "next/link";
import AuthForm from "../ui/AuthForm";

export const runtime = "nodejs";
export const metadata = { title: "Crear cuenta — E-COMEX" };

export default function RegisterPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const nextPath =
    typeof searchParams?.next === "string" && searchParams.next.startsWith("/")
      ? searchParams.next
      : undefined;
  return (
    <div className="min-h-screen bg-[#07111A] text-white" style={{ fontFamily: "var(--font-body, 'Inter', sans-serif)" }}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#07111A]/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-[1200px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" />
          </Link>
          <Link
            href="/cotizador"
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-[13px] font-medium text-[#94a3b8] transition-colors hover:text-white"
          >
            Cotizá gratis →
          </Link>
        </div>
      </header>

      <main className="flex min-h-[calc(100dvh-56px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <AuthForm
            title="Crear cuenta"
            endpoint="/api/auth/register"
            submitLabel="Crear cuenta"
            alternateHref={nextPath ? `/account/login?next=${encodeURIComponent(nextPath)}` : "/account/login"}
            alternateLabel="Ya tengo cuenta"
            redirectTo={nextPath}
          />
        </div>
      </main>
    </div>
  );
}
