import RegisterClient from "./RegisterClient";

export const metadata = { title: "Crear cuenta — E-COMEX" };

export default function RegisterPage() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-[#07111A] px-4 py-8 pt-safe pb-safe sm:px-6"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <RegisterClient />
    </div>
  );
}
