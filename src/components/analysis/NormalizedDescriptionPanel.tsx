import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function NormalizedDescriptionPanel({
  text,
  onChange,
}: {
  text?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <Card>
      <CardHeader eyebrow="DESCRIPCION" title="Normalized description" icon="summarize" />
      <CardContent>
        <textarea
          value={text ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="La descripción normalizada aparecerá aquí."
          className="min-h-[120px] w-full resize-none rounded-2xl border border-subtle bg-[var(--surface)] px-4 py-3 text-sm text-strong outline-none placeholder:text-muted/70 focus:border-[color:color-mix(in_oklab,var(--primary)_42%,white_8%)] focus:ring-2 focus:ring-[var(--ring)]"
        />
      </CardContent>
    </Card>
  );
}
