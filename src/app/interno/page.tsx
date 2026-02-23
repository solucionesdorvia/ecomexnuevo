import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/AppShell";
import { SealVerified } from "@/components/ui/SealVerified";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { OperatorBudgetClient } from "@/app/interno/ui/OperatorBudgetClient";

export const runtime = "nodejs";

export default async function InternoPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/account/login");

  return (
    <AppShell
      active="account"
      title="Interno"
      subtitle="Herramientas de operador"
      right={
        <div className="flex items-center gap-2">
          <SealVerified />
          <Badge tone="gold" icon="support_agent">
            {gate.user.role}
          </Badge>
        </div>
      }
      maxWidth="1100px"
    >
      <Card className="border-white/10 bg-white/5">
        <CardHeader
          eyebrow="OPERADOR"
          title="Generador de presupuestos"
          icon="description"
          right={<Badge tone="muted" icon="upload_file">XLSX + Foto</Badge>}
        />
        <CardContent>
          <OperatorBudgetClient />
        </CardContent>
      </Card>
    </AppShell>
  );
}

