import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function OperatorAdjustmentsPanel({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader eyebrow="OPERADOR" title="Operator adjustments" icon="tune" />
      <CardContent>{children}</CardContent>
    </Card>
  );
}
