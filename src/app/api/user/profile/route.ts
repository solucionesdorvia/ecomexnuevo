import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import {
  isValidImporterProfile,
  isValidIibbProvince,
  sanitizeFiscalBenefits,
  type ImporterProfile,
} from "@/lib/importer/importerProfile";

export const runtime = "nodejs";

const PROFILE_SELECT = {
  id: true,
  name: true,
  company: true,
  email: true,
  importerProfile: true,
  taxId: true,
  iibbProvince: true,
  fiscalBenefits: true,
} as const;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  try {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: PROFILE_SELECT });
    if (!u) {
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, user: u });
  } catch (e) {
    console.error("[user/profile] error loading profile", e);
    return NextResponse.json({ ok: false, error: "No se pudo cargar el perfil." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    company?: string;
    importerProfile?: unknown;
    taxId?: string;
    iibbProvince?: string;
    fiscalBenefits?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const data: {
    name?: string;
    company?: string;
    importerProfile?: ImporterProfile["importerProfile"];
    taxId?: string | null;
    iibbProvince?: string | null;
    fiscalBenefits?: ImporterProfile["fiscalBenefits"];
  } = {};

  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 120);
  if (typeof body.company === "string") data.company = body.company.trim().slice(0, 120);

  // Perfil importador: aceptamos valor válido o "" (vacío) para limpiar.
  if ("importerProfile" in body) {
    if (body.importerProfile === "" || body.importerProfile === null) {
      data.importerProfile = null;
    } else if (isValidImporterProfile(body.importerProfile)) {
      data.importerProfile = body.importerProfile;
    } else {
      return NextResponse.json({ ok: false, error: "Perfil de importador inválido." }, { status: 400 });
    }
  }

  if (typeof body.taxId === "string") {
    const t = body.taxId.trim().slice(0, 20);
    data.taxId = t.length ? t : null;
  }

  if ("iibbProvince" in body) {
    const prov = typeof body.iibbProvince === "string" ? body.iibbProvince.trim() : "";
    if (!prov) {
      data.iibbProvince = null;
    } else if (isValidIibbProvince(prov)) {
      data.iibbProvince = prov;
    } else {
      return NextResponse.json({ ok: false, error: "Provincia de IIBB inválida." }, { status: 400 });
    }
  }

  if ("fiscalBenefits" in body) {
    data.fiscalBenefits = sanitizeFiscalBenefits(body.fiscalBenefits);
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: PROFILE_SELECT,
    });
    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error("[user/profile] error updating profile", e);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar el perfil." }, { status: 500 });
  }
}
