import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { OperatorBudgetClient } from "@/app/interno/ui/OperatorBudgetClient";

export const runtime = "nodejs";

export default async function OperadorPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/account/login");

  return (
    <AppShell
      active="operador"
      title="Operator Console"
      subtitle="Excel + fotos -> borrador automático -> ajuste manual con trazabilidad"
      right={<Badge tone="primary" icon="lock">Internal</Badge>}
      maxWidth="1320px"
    >
      <OperatorBudgetClient />
    </AppShell>
  );
}

