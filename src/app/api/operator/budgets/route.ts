import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";

export const runtime = "nodejs";

function isXlsxFile(f: File) {
  const name = (f.name || "").toLowerCase();
  const type = (f.type || "").toLowerCase();
  return name.endsWith(".xlsx") || type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function isImageFile(f: File) {
  const type = (f.type || "").toLowerCase();
  return type === "image/png" || type === "image/jpeg" || type === "image/webp";
}

export async function POST(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.status === 401 ? "Sin sesión." : "Sin permisos." },
      { status: gate.status }
    );
  }

  try {
    const form = await req.formData();
    const xlsx = form.get("xlsx");
    const image = form.get("image");
    const rubro = String(form.get("rubro") ?? "").trim();
    const productTitle = String(form.get("productTitle") ?? "").trim();

    if (!(xlsx instanceof File) || !isXlsxFile(xlsx)) {
      return NextResponse.json({ ok: false, error: "Subí un archivo .xlsx." }, { status: 400 });
    }
    if (!(image instanceof File) || !isImageFile(image)) {
      return NextResponse.json(
        { ok: false, error: "Subí una imagen PNG/JPG/WEBP." },
        { status: 400 }
      );
    }

    // Basic limits (DB storage)
    const xlsxBytes = Buffer.from(await xlsx.arrayBuffer());
    const imageBytes = Buffer.from(await image.arrayBuffer());
    if (xlsxBytes.byteLength > 8 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "El XLSX es demasiado grande." }, { status: 400 });
    }
    if (imageBytes.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "La imagen es demasiado grande." }, { status: 400 });
    }

    const created = await prisma.operatorBudget.create({
      data: {
        createdByUserId: gate.user.id,
        rubro: rubro ? rubro.slice(0, 80) : null,
        productTitle: productTitle ? productTitle.slice(0, 120) : null,
        filename: xlsx.name || "presupuesto.xlsx",
        xlsxBytes,
        imageBytes,
        imageType: image.type || "image/jpeg",
      },
      select: { id: true, createdAt: true, filename: true },
    });

    return NextResponse.json({ ok: true, budget: created });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[operator/budgets] upload error", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo subir el archivo." },
      { status: 500 }
    );
  }
}

