import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { parseBudgetXlsx } from "@/lib/operatorBudget/xlsxParse";
import { effectiveParsedFromStored } from "@/lib/operatorBudget/overrides";
import { generateQuotePdf } from "@/lib/pdf/quotePdf";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";

function dataUrlFromImage(bytes: Buffer, contentType: string) {
  const b64 = bytes.toString("base64");
  return `data:${contentType};base64,${b64}`;
}

export async function GET(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.status === 401 ? "Sin sesión." : "Sin permisos." },
      { status: gate.status }
    );
  }

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Falta id." }, { status: 400 });
  }

  const budget = await prisma.operatorBudget
    .findUnique({
      where: { id },
      select: {
        id: true,
        createdAt: true,
        rubro: true,
        productTitle: true,
        filename: true,
        xlsxBytes: true,
        imageBytes: true,
        imageType: true,
        parsedJson: true,
        createdByUserId: true,
      },
    })
    .catch(() => null);

  if (!budget) {
    return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  }

  // For now: only creator can access. (Can be relaxed later for admins.)
  if (gate.user.role !== "admin" && budget.createdByUserId !== gate.user.id) {
    return NextResponse.json({ ok: false, error: "Sin permisos." }, { status: 403 });
  }

  const parsed =
    budget.parsedJson && typeof budget.parsedJson === "object"
      ? effectiveParsedFromStored(budget.parsedJson as any).effective
      : parseBudgetXlsx(new Uint8Array(budget.xlsxBytes as any));
  const operatorImageDataUrl = dataUrlFromImage(
    Buffer.from(budget.imageBytes as any),
    budget.imageType
  );

  const quoteLike: any = {
    id: budget.id,
    createdAt: budget.createdAt,
    userText: `Presupuesto operador - ${budget.filename}`,
    mode: "budget",
    totalMinUsd: parsed.totalToShowUsd,
    totalMaxUsd: parsed.totalToShowUsd,
    productJson: {
      title: budget.productTitle || "Presupuesto",
      displayTitle: budget.productTitle || undefined,
      displayCategory: budget.rubro || undefined,
      raw: { operatorImageDataUrl },
      // images intentionally omitted; we use operator image
    },
    quoteJson: {
      // Minimal cards used by the PDF renderer (fallback path uses cards; HTML uses breakdown values too)
      cards: [
        { label: "Total puesto en Argentina", value: parsed.totalToShowUsd != null ? `$${parsed.totalToShowUsd.toFixed(2)} – $${parsed.totalToShowUsd.toFixed(2)}` : "—" },
      ],
      breakdown: {
        // We primarily need these for the HTML template sections we already have.
        totalMinUsd: parsed.totalToShowUsd,
        ivaUsd: parsed.ivaUsd,
        totalToPayUsd: parsed.totalToPayUsd,
        tributosUsd: parsed.totalTributosUsd,
        fobUsd: parsed.fobUsd,
        fleteUsd: parsed.fleteUsd,
        seguroUsd: parsed.seguroUsd,
        honorariosUsd: parsed.honorariosUsd,
        depositoUsd: parsed.depositoUsd,
        transporteNacionalUsd: parsed.transporteNacionalUsd,
        transferenciaIntlUsd: parsed.transferenciaIntlUsd,
        arancelSimUsd: parsed.arancelSimUsd,
        taxLines: parsed.taxLines,
        items: parsed.items,
      },
    },
  };

  const out = await generateQuotePdf({ quote: quoteLike });
  const filename = "E-COMEX - Presupuesto.pdf";

  await writeAuditLog({
    entityType: "operator_budget",
    entityId: budget.id,
    action: "export_pdf",
    actorUserId: gate.user.id,
    actorRole: gate.user.role,
    operatorBudgetId: budget.id,
    payload: { renderer: out.renderer },
  });

  return new NextResponse(Buffer.from(out.bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-ecomex-pdf-renderer": out.renderer,
    },
  });
}

