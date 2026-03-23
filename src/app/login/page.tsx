import LoginClient from "./LoginClient";

export const metadata = { title: "Iniciar sesión — E-COMEX" };

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#07111A] px-4 sm:px-6" style={{ fontFamily: "var(--font-body)" }}>
      <LoginClient />
    </div>
  );
}
