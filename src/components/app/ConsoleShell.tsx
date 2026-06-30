import { getSessionUser } from "@/lib/auth/session";
import AppShellClient from "@/components/app/AppShellClient";

/**
 * Envuelve una página en el MISMO chrome del console /app (sidebar + topbar),
 * para unificar la navegación fuera de /app (ej. /cotizaciones, /tendencias).
 *
 * Es un wrapper por-página (no un layout de segmento) a propósito: así las
 * páginas que deben verse como /app lo adoptan explícitamente y otras bajo el
 * mismo segmento (ej. la justificación imprimible) quedan SIN chrome.
 *
 * Server component: resuelve la sesión para que el sidebar muestre el rol real.
 */
export default async function ConsoleShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <AppShellClient userEmail={user?.email} userRole={user?.role}>
      {children}
    </AppShellClient>
  );
}
