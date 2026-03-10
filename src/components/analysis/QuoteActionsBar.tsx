import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function QuoteActionsBar({
  pdfHref,
  onSave,
}: {
  pdfHref: string;
  onSave?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ButtonLink href={pdfHref} variant="secondary" className="h-10">
        <Icon name="download" size={16} className="text-current" />
        Exportar PDF
      </ButtonLink>
      <Button variant="primary" className="h-10" onClick={onSave}>
        <Icon name="save" size={16} className="text-current" />
        Guardar
      </Button>
      <ButtonLink href="/cotizaciones" variant="subtle" className="h-10">
        <Icon name="receipt_long" size={16} className="text-current" />
        Ver cotizaciones
      </ButtonLink>
    </div>
  );
}
