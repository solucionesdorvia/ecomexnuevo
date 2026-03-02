import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/session";
import { parseBudgetXlsx } from "@/lib/operatorBudget/xlsxParse";
import { effectiveParsedFromStored, normalizeStoredParsedJson } from "@/lib/operatorBudget/overrides";

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

export async function GET(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.status === 401 ? "Sin sesión." : "Sin permisos." },
      { status: gate.status }
    );
  }

  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();

  if (id) {
    const row = await prisma.operatorBudget
      .findUnique({
        where: { id },
        select: {
          id: true,
          createdAt: true,
          filename: true,
          rubro: true,
          productTitle: true,
          parsedJson: true,
          xlsxBytes: true,
          createdByUserId: true,
        },
      })
      .catch(() => null);
    if (!row) return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
    if (gate.user.role !== "admin" && row.createdByUserId !== gate.user.id) {
      return NextResponse.json({ ok: false, error: "Sin permisos." }, { status: 403 });
    }

    const stored =
      row.parsedJson && typeof row.parsedJson === "object"
        ? normalizeStoredParsedJson(row.parsedJson as any)
        : null;
    const effective =
      row.parsedJson && typeof row.parsedJson === "object"
        ? effectiveParsedFromStored(row.parsedJson as any).effective
        : parseBudgetXlsx(new Uint8Array(row.xlsxBytes as any));

    const overrides = stored?._overrides ?? {};

    return NextResponse.json({
      ok: true,
      budget: {
        id: row.id,
        createdAt: row.createdAt,
        filename: row.filename,
        rubro: row.rubro,
        productTitle: row.productTitle,
        effective,
        overrides,
        hasOverrides: Boolean(overrides && Object.keys(overrides).length),
      },
    });
  }

  const rows = await prisma.operatorBudget.findMany({
    where: gate.user.role === "admin" ? undefined : { createdByUserId: gate.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      createdAt: true,
      filename: true,
      rubro: true,
      productTitle: true,
      parsedJson: true,
      createdByUserId: true,
    },
  });

  const budgets = rows.map((r) => {
    const parsed = normalizeStoredParsedJson(r.parsedJson as any);
    const overrides = parsed?._overrides ?? {};
    return {
      id: r.id,
      createdAt: r.createdAt,
      filename: r.filename,
      rubro: r.rubro,
      productTitle: r.productTitle,
      createdByUserId: r.createdByUserId,
      totals: {
        totalToShowUsd:
          typeof (parsed as any)?.totalToShowUsd === "number" ? (parsed as any).totalToShowUsd : null,
        totalToPayUsd:
          typeof (parsed as any)?.totalToPayUsd === "number" ? (parsed as any).totalToPayUsd : null,
      },
      hasOverrides: Boolean(overrides && Object.keys(overrides).length),
    };
  });

  return NextResponse.json({ ok: true, budgets });
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

    const parsed = parseBudgetXlsx(new Uint8Array(xlsxBytes));

    const created = await prisma.operatorBudget.create({
      data: {
        createdByUserId: gate.user.id,
        rubro: rubro ? rubro.slice(0, 80) : null,
        productTitle: productTitle ? productTitle.slice(0, 120) : null,
        filename: xlsx.name || "presupuesto.xlsx",
        xlsxBytes,
        imageBytes,
        imageType: image.type || "image/jpeg",
        parsedJson: parsed as any,
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

