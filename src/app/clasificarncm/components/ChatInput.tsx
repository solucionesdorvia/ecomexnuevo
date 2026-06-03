"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";

const ACCEPTED = ".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";
const MAX_FILES = 4;
const MAX_MB = 12;

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Escribí acá tu consulta…",
  leading,
  extraAboveField,
  canSubmitEmpty = false,
  helperText,
  messagePrefill,
}: {
  onSend: (text: string, files?: File[]) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  leading?: ReactNode;
  extraAboveField?: ReactNode;
  /** Si hay adjuntos (ej. factura), permite enviar sin texto. */
  canSubmitEmpty?: boolean;
  /** Reemplaza la línea de ayuda bajo el campo (Enter / Shift+Enter). */
  helperText?: ReactNode;
  /** Texto inicial (ej. llegada desde clasificador con ?ncm=). Solo se aplica una vez. */
  messagePrefill?: string;
}) {
  const [value, setValue] = useState(() => messagePrefill ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;

    const tooBig = selected.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setFileError(`"${tooBig.name}" supera el límite de ${MAX_MB} MB.`);
      return;
    }
    setFileError(null);
    setFiles((prev) => {
      const combined = [...prev, ...selected];
      return combined.slice(0, MAX_FILES);
    });
    // reset so same file can be re-added if removed
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError(null);
  }

  async function submit() {
    const t = value.trim();
    if (disabled) return;
    if (!t && files.length === 0 && !canSubmitEmpty) return;
    const filesToSend = files.length > 0 ? [...files] : undefined;
    setValue("");
    setFiles([]);
    setFileError(null);
    await onSend(t, filesToSend);
  }

  const canSend = canSubmitEmpty || !!value.trim() || files.length > 0;

  return (
    <div className="border-t border-white/[0.07] bg-gradient-to-t from-[#030712] via-[#070b14]/98 to-[#070b14]/88 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl sm:px-5">
      {extraAboveField ? (
        <div className="mx-auto mb-3 max-w-[min(100%,720px)]">{extraAboveField}</div>
      ) : null}

      <div className="mx-auto max-w-[min(100%,720px)] rounded-2xl border border-white/[0.09] bg-[#0b1220]/95 p-1.5 shadow-[0_-8px_40px_-18px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.04)] focus-within:border-[#18C3D6]/25 focus-within:shadow-[0_0_0_1px_rgba(24,195,214,0.12),0_-8px_40px_-18px_rgba(0,0,0,0.85)]">

        {/* File chips */}
        {files.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-1.5 px-1 pt-1">
            {files.map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] text-slate-300"
              >
                <Paperclip className="h-3 w-3 shrink-0 text-slate-500" />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-0.5 rounded-full text-slate-500 hover:text-slate-300"
                  aria-label={`Quitar ${f.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 pl-1 sm:pl-1.5">
          {leading ? (
            <div className="flex shrink-0 items-center self-stretch pb-1 pt-0.5">{leading}</div>
          ) : null}

          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={files.length > 0 ? "Agregá un comentario (opcional)…" : placeholder}
            enterKeyHint="send"
            autoComplete="off"
            className="max-h-36 min-h-[52px] min-w-0 flex-1 resize-none bg-transparent py-3 text-[16px] leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-40 sm:min-h-[48px] sm:py-2.5 sm:text-[15px]"
          />

          {/* Attach button */}
          <button
            type="button"
            disabled={disabled || files.length >= MAX_FILES}
            onClick={() => fileInputRef.current?.click()}
            className="mb-0.5 flex h-12 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300 disabled:pointer-events-none disabled:opacity-25 sm:h-11 sm:w-9"
            aria-label="Adjuntar archivo"
            title="Adjuntar factura o foto (PDF, imagen)"
          >
            <Paperclip className="h-4.5 w-4.5" strokeWidth={2} />
          </button>

          {/* Send button */}
          <button
            type="button"
            disabled={disabled || !canSend}
            onClick={() => void submit()}
            className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#18C3D6] text-[#030d18] shadow-lg shadow-[#18C3D6]/20 transition hover:bg-[#0ea5b9] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-25 sm:h-11 sm:w-11"
            aria-label="Enviar mensaje"
          >
            <SendHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error or helper text */}
      {fileError ? (
        <div className="mx-auto mt-1.5 max-w-[min(100%,720px)] px-1 text-center text-[11px] text-red-400">
          {fileError}
        </div>
      ) : helperText != null ? (
        <div className="mx-auto mt-2 max-w-[min(100%,720px)] px-1 text-center text-[10px] leading-snug text-slate-600">
          {helperText}
        </div>
      ) : null}
    </div>
  );
}
