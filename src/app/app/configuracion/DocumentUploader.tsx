"use client";

import { useEffect, useRef, useState } from "react";

type DocCategory = {
  id: string;
  label: string;
  docs: DocType[];
};

type DocType = {
  id: string;
  label: string;
  hint: string;
  accept?: string;
};

const CATEGORIES: DocCategory[] = [
  {
    id: "empresa",
    label: "Empresa e identidad",
    docs: [
      { id: "cuit", label: "Constancia CUIT / inscripción AFIP", hint: "PDF de inscripción AFIP del importador." },
      { id: "estatuto", label: "Estatuto social / contrato", hint: "Escritura constitutiva o contrato social vigente." },
      { id: "poder", label: "Poder notarial", hint: "Poder habilitante para trámites de importación." },
      { id: "dni_representante", label: "DNI del representante legal", hint: "Frente y dorso del DNI." },
      { id: "domicilio", label: "Comprobante de domicilio", hint: "Servicio o extracto bancario reciente." },
    ],
  },
  {
    id: "importacion",
    label: "Habilitaciones de importación",
    docs: [
      { id: "licencia_importador", label: "Licencia de importador", hint: "Habilitación ante la AFIP / Aduana." },
      { id: "vuce", label: "Certificado VUCE", hint: "Ventanilla Única de Comercio Exterior." },
      { id: "sira", label: "SIRA / licencia previa", hint: "Sistema de Importaciones de la República Argentina." },
      { id: "afip_rg", label: "Certificado RG AFIP vigente", hint: "Resolución General que aplica al producto." },
    ],
  },
  {
    id: "operacion",
    label: "Documentos de operación",
    docs: [
      { id: "factura_proforma", label: "Factura proforma / comercial", hint: "Invoice del proveedor internacional." },
      { id: "packing_list", label: "Packing list", hint: "Lista de empaque del proveedor." },
      { id: "bill_of_lading", label: "Bill of Lading / AWB", hint: "Conocimiento de embarque o guía aérea." },
      { id: "certificado_origen", label: "Certificado de origen", hint: "Emitido por la Cámara de Comercio del país exportador." },
      { id: "poliza_seguro", label: "Póliza de seguro de carga", hint: "Cobertura para el tránsito internacional." },
      { id: "factura_flete", label: "Factura de flete", hint: "Comprobante del agente de cargas o naviera." },
    ],
  },
  {
    id: "tecnico",
    label: "Certificaciones técnicas y sanitarias",
    docs: [
      { id: "senasa", label: "Certificado SENASA", hint: "Habilitación sanitaria y fitosanitaria." },
      { id: "anmat", label: "Certificado ANMAT", hint: "Para alimentos, medicamentos o cosméticos." },
      { id: "inti", label: "Certificado INTI", hint: "Productos eléctricos, textiles u otros regulados." },
      { id: "certificado_producto", label: "Ficha técnica del producto", hint: "Especificaciones técnicas del fabricante." },
      { id: "normas_calidad", label: "Certificado de calidad (ISO/CE/etc.)", hint: "Normas internacionales o regionales aplicables." },
    ],
  },
  {
    id: "financiero",
    label: "Documentación financiera",
    docs: [
      { id: "extracto_bancario", label: "Extracto bancario", hint: "Para acreditar disponibilidad de fondos." },
      { id: "transferencia", label: "Comprobante de transferencia", hint: "Pago al proveedor o anticipos." },
      { id: "carta_credito", label: "Carta de crédito (L/C)", hint: "Si aplica como medio de pago." },
      { id: "seguro_cambio", label: "Cobertura de tipo de cambio", hint: "Contrato de forward o similar." },
    ],
  },
];

type UploadedDoc = {
  docType: string;
  name: string;
  url: string;
  at: number;
};

function FileRow({
  doc,
  uploaded,
  onUpload,
}: {
  doc: DocType;
  uploaded?: UploadedDoc;
  onUpload: (docType: string, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      await onUpload(doc.id, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.04] py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[#c8d0dc]">{doc.label}</p>
        <p className="mt-0.5 text-[11px] text-[#555c6b]">{doc.hint}</p>
        {uploaded && (
          <a
            href={uploaded.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-[11px] text-[#18C3D6] hover:underline"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {uploaded.name}
          </a>
        )}
        {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
      </div>
      <div className="shrink-0">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx"
          className="sr-only"
          id={`doc-${doc.id}`}
          onChange={(e) => void handleChange(e)}
          disabled={loading}
        />
        <label
          htmlFor={`doc-${doc.id}`}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
            uploaded
              ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-400 hover:bg-emerald-500/[0.14]"
              : "border-white/[0.08] bg-[#07111A] text-[#94a3b8] hover:border-white/[0.16] hover:text-white"
          } ${loading ? "pointer-events-none opacity-50" : ""}`}
        >
          {loading ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : uploaded ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          {loading ? "Subiendo…" : uploaded ? "Reemplazar" : "Subir"}
        </label>
      </div>
    </div>
  );
}

export function DocumentUploader() {
  const [uploaded, setUploaded] = useState<Record<string, UploadedDoc>>({});
  const [openCat, setOpenCat] = useState<string>(CATEGORIES[0]!.id);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Carga los documentos ya subidos al montar el componente.
  useEffect(() => {
    fetch("/api/user/documents", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { ok?: boolean; documents?: Array<{ docType: string; name: string; url: string; createdAt: string }> }) => {
        if (json.ok && Array.isArray(json.documents)) {
          const map: Record<string, UploadedDoc> = {};
          for (const d of json.documents) {
            map[d.docType] = { docType: d.docType, name: d.name, url: d.url, at: new Date(d.createdAt).getTime() };
          }
          setUploaded(map);
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(docType: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);
    const res = await fetch("/api/user/documents", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json()) as { ok?: boolean; error?: string; url?: string; name?: string };
    if (!res.ok || !json.ok) throw new Error(json.error || "Error al subir.");
    setUploaded((prev) => ({
      ...prev,
      [docType]: { docType, name: json.name ?? file.name, url: json.url!, at: Date.now() },
    }));
  }

  const totalUploaded = Object.keys(uploaded).length;
  const totalDocs = CATEGORIES.reduce((a, c) => a + c.docs.length, 0);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-[13px] text-[#555c6b]">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Cargando documentos…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-4 text-[13px] text-rose-300">
        No se pudieron cargar tus documentos. Recargá la página o intentalo más tarde.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-[#0B1622] px-4 py-3">
        <div>
          <p className="text-[12px] font-medium text-white">
            {totalUploaded} de {totalDocs} documentos cargados
          </p>
          <p className="mt-0.5 text-[11px] text-[#555c6b]">
            Subí los documentos que apliquen a tu empresa y tipo de operaciones.
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#18C3D6]/30">
          <span className="text-[11px] font-bold text-[#18C3D6]">
            {totalDocs > 0 ? Math.round((totalUploaded / totalDocs) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Categories */}
      {CATEGORIES.map((cat) => {
        const catUploaded = cat.docs.filter((d) => uploaded[d.id]).length;
        const isOpen = openCat === cat.id;
        return (
          <div key={cat.id} className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#0B1622]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
              onClick={() => setOpenCat(isOpen ? "" : cat.id)}
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-semibold text-white">{cat.label}</span>
                {catUploaded > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    {catUploaded}/{cat.docs.length}
                  </span>
                )}
              </div>
              <svg
                className={`h-4 w-4 shrink-0 text-[#555c6b] transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-white/[0.04] px-4">
                {cat.docs.map((doc) => (
                  <FileRow
                    key={doc.id}
                    doc={doc}
                    uploaded={uploaded[doc.id]}
                    onUpload={handleUpload}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[11px] text-[#3a404d]">
        Formatos aceptados: PDF, JPG, PNG, XLSX, DOCX · Máximo 10 MB por archivo.
      </p>
    </div>
  );
}
