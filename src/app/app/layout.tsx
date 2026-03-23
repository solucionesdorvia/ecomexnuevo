import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import AppShellClient from "@/components/app/AppShellClient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <AppShellClient userEmail={user.email} userRole={user.role}>
      {children}
    </AppShellClient>
  );
}
