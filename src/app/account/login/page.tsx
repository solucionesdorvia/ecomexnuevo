import Link from "next/link";
import AuthForm from "../ui/AuthForm";

export const runtime = "nodejs";

export default function LoginPage() {
  return (
    <div className="min-h-screen app-background text-white">
      <header className="sticky top-0 z-50 border-b border-border-dark bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-3 md:px-10">
          <Link href="/" className="flex items-center gap-3 text-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <span className="material-symbols-outlined text-[18px]">
                rocket_launch
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              E‑COMEX
            </h2>
          </Link>
          <Link
            href="/chat"
            className="rounded-lg border border-border-dark bg-white/5 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            Ir al chat
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <AuthForm
          title="Iniciar sesión"
          endpoint="/api/auth/login"
          submitLabel="Entrar"
          alternateHref="/account/register"
          alternateLabel="Crear cuenta"
        />
      </main>
    </div>
  );
}

