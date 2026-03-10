import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function PdfPreviewPanel({ href }: { href: string }) {
  return (
    <Card>
      <CardHeader eyebrow="PDF" title="Pdf preview" icon="picture_as_pdf" />
      <CardContent className="space-y-3">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-xl border border-subtle bg-[var(--surface)] px-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted hover:text-strong"
        >
          Abrir vista previa
        </a>
      </CardContent>
    </Card>
  );
}
