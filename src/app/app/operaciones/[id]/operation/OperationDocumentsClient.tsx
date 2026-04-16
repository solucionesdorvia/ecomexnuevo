"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Doc = { id: string; name: string; url: string; uploadedBy: string; createdAt: string };

export function OperationDocumentsClient({
  operationId,
  initialDocuments,
}: {
  operationId: string;
  initialDocuments: Doc[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "url">("file");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPickFile(f: File | null) {
    setFile(f);
    setError(null);
    if (f?.name) {
      setName(f.name);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "file") {
        if (!file) {
          throw new Error("Seleccioná un archivo.");
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("El archivo supera 10MB.");
        }
        const fd = new FormData();
        fd.append("file", file);
        if (name.trim()) fd.append("name", name.trim());
        const res = await fetch(`/api/app/operations/${operationId}/documents`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Error al subir.");
      } else {
        const res = await fetch(`/api/app/operations/${operationId}/documents`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name: name.trim(), url: url.trim() }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error || "Error al guardar.");
      }
      setName("");
      setUrl("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  }

  function fmtDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  const canSubmitFile = mode === "file" && !!file;
  const canSubmitUrl = mode === "url" && !!name.trim() && !!url.trim();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#555c6b]">Documentos</p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-[#b0b8c9] transition hover:border-[#2b59ff]/30 hover:text-white"
        >
          {open ? "Cerrar" : "Subir documento"}
        </button>
      </div>

      {open ? (
        <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-3 rounded-xl border border-white/[0.06] bg-[#07111A] p-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("file");
                setError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                mode === "file" ? "bg-[#2b59ff] text-white" : "border border-white/[0.08] text-[#b0b8c9]"
              }`}
            >
              Subir archivo
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("url");
                setError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${
                mode === "url" ? "bg-[#2b59ff] text-white" : "border border-white/[0.08] text-[#b0b8c9]"
              }`}
            >
              Agregar por URL
            </button>
          </div>

          {mode === "file" ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="block w-full text-[12px] text-[#b0b8c9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#2b59ff]/20 file:px-3 file:py-1.5 file:text-[12px] file:text-[#2b59ff]"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[10px] text-[#555c6b]">Máx. 10MB · PDF, JPG, PNG, XLSX, DOCX</p>
            </>
          ) : null}

          <label className="block">
            <span className="text-[10px] uppercase text-[#555c6b]">Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del archivo / descripción"
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0B1622] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b]"
            />
          </label>

          {mode === "url" ? (
            <label className="block">
              <span className="text-[10px] uppercase text-[#555c6b]">URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0B1622] px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#555c6b]"
              />
            </label>
          ) : null}

          {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}

          {pending ? (
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-full animate-pulse rounded-full bg-[#2b59ff]/50" />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={pending || (mode === "file" ? !canSubmitFile : !canSubmitUrl)}
            className="rounded-lg bg-[#2b59ff] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-40"
          >
            {pending ? "Subiendo…" : mode === "file" ? "Subir" : "Guardar"}
          </button>
        </form>
      ) : null}

      {initialDocuments.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-white/[0.06] bg-[#0B1622]/50 px-4 py-6 text-center text-[13px] text-[#555c6b]">
          Todavía no hay documentos cargados.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {initialDocuments.map((d) => (
            <li key={d.id} className="rounded-lg border border-white/[0.04] bg-[#0B1622] px-3 py-2.5">
              <a href={d.url} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-[#2b59ff] hover:underline">
                {d.name}
              </a>
              <p className="mt-1 text-[11px] text-[#555c6b]">
                {fmtDate(d.createdAt)} · {d.uploadedBy}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
