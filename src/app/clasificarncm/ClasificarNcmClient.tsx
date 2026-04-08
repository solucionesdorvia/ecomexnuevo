"use client";

import Link from "next/link";
import { useState } from "react";

type NcmMeta = {
  source?: string;
  aiNcm?: string;
  hsHeading?: string;
  kind?: string;
  searchTerms?: string[];
  adjustedFrom?: string;
  adjustedTo?: string;
  pcramCandidates?: Array<{ ncmCode: string; title?: string }>;
  localCandidates?: Array<{ ncmCode: string; title?: string }>;
  confidence?: number;
  ambiguous?: boolean;
  discarded?: Array<{ ncm: string; reason: string }>;
  missingInfoQuestions?: string[];
  needsClarification?: boolean;
};

type PipelineResult = {
  ncm?: string;
  pcram?: {
    title?: string;
    ncmCode?: string;
    breadcrumbs?: string[];
    interventions?: string[];
  };
  ncmMeta?: NcmMeta;
};

type ApiOk = { ok: true; ms: number; result: PipelineResult };
type ApiErr = { ok: false; error: string };

const EXAMPLES = [
  "Apple Watch Series 9 GPS 45mm caja aluminio, correa deportiva, nuevo",
  "Cargador USB-C GaN 65W, salida USB-A y USB-C, para notebook y teléfono, origen China",
  "Auriculares in-ear bluetooth 5.3 con estuche de carga, marca genérica",
  "Remera de algodón peinado 180g, cuello redondo, hombre, importación desde Bangladesh",
  "Válvula solenoide neumática 1/4\", 24V DC, para línea de envasado",
];

export default function ClasificarNcmClient() {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [data, setData] = useState<PipelineResult | null>(null);
  const [showJson, setShowJson] = useState(false);

  async function run() {
    const t = text.trim();
    if (!t || pending) return;
    setPending(true);
    setError(null);
    setData(null);
    setLastMs(null);
    try {
      const res = await fetch("/api/clasificar-ncm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (!res.ok || !json.ok) {
        throw new Error(!json.ok ? json.error : "Error");
      }
      setLastMs(json.ms);
      setData(json.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al clasificar.");
    } finally {
      setPending(false);
    }
  }

  const meta = data?.ncmMeta;
  const pcram = data?.pcram;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#07111A]" style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <img src="/brand/ecomex-logo.png" alt="E-COMEX" className="h-5 brightness-0 invert" />
          </Link>
          <div className="hidden h-4 w-px bg-white/[0.08] sm:block" />
          <div className="hidden sm:block">
            <span className="text-[13px] font-medium text-[#A7B3C2]">Laboratorio NCM</span>
            <span className="ml-2 text-[11px] text-[#5A6577]">/clasificarncm</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/clasificador" className="text-[12px] text-[#5A6577] transition-colors hover:text-white">
            Clasificador cotización
          </Link>
          <Link href="/" className="text-[12px] text-[#5A6577] transition-colors hover:text-white">
            Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10">
        <section className="flex min-h-0 flex-1 flex-col lg:max-w-[480px]">
          <h1 className="text-[20px] font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Probar clasificador
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5A6577]">
            Misma lógica que el producto por texto: IA libre → búsqueda local/PCRAM → IA restringida a candidatos. Ideal para afinar prompts y ver candidatos descartados.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setText(ex)}
                className="rounded-lg border border-white/[0.06] bg-[#0B1622] px-2.5 py-1.5 text-left text-[11px] leading-snug text-[#A7B3C2] transition-colors hover:border-[#2F80ED]/30 hover:text-white"
              >
                {ex.slice(0, 52)}
                {ex.length > 52 ? "…" : ""}
              </button>
            ))}
          </div>

          <label className="mt-6 text-[10px] font-semibold uppercase tracking-wider text-[#5A6577]">
            Descripción del producto
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Pegá título, specs, material, uso, origen…"
            className="mt-2 w-full resize-y rounded-xl border border-white/[0.08] bg-[#0B1622] px-4 py-3 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#5A6577] focus:border-[#2F80ED]/35"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending || !text.trim()}
              onClick={run}
              className="rounded-xl bg-[#2F80ED] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2563eb] disabled:opacity-30"
            >
              {pending ? "Clasificando…" : "Clasificar"}
            </button>
            {lastMs != null && (
              <span className="text-[12px] text-[#5A6577]">
                {lastMs} ms
              </span>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{error}</p>
          )}
        </section>

        <section className="min-h-0 flex-1 lg:border-l lg:border-white/[0.06] lg:pl-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5A6577]">Salida del pipeline</p>

          {!data && !pending && (
            <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] bg-[#0B1622]/50 p-8 text-center">
              <p className="text-[14px] text-[#5A6577]">Todavía no hay resultado. Escribí un producto y pulsá Clasificar.</p>
            </div>
          )}

          {pending && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0B1622] px-4 py-3">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#2F80ED]" />
              <span className="text-[13px] text-[#5A6577]">Ejecutando productFromTextPipeline…</span>
            </div>
          )}

          {data && !pending && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#2F80ED]/20 bg-[#2F80ED]/[0.06] p-5">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">NCM resuelto</p>
                <p className="mt-1 font-mono text-[26px] font-bold tracking-tight text-white">
                  {data.ncm ?? "—"}
                </p>
                {pcram?.title && (
                  <p className="mt-3 text-[13px] leading-relaxed text-[#A7B3C2]">{pcram.title}</p>
                )}
                {!data.ncm && (
                  <p className="mt-2 text-[12px] text-amber-400/90">
                    Sin código final (revisá candidatos abajo o credenciales OPENAI / PCRAM).
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Confianza</p>
                  <p className="mt-1 text-[18px] font-semibold text-white">
                    {typeof meta?.confidence === "number" ? `${Math.round(meta.confidence * 100)}%` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Ambiguo</p>
                  <p className="mt-1 text-[18px] font-semibold text-white">
                    {meta?.ambiguous === true ? "Sí" : meta?.ambiguous === false ? "No" : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Aclaraciones</p>
                  <p className="mt-1 text-[18px] font-semibold text-white">
                    {meta?.needsClarification === true ? "Sí" : meta?.needsClarification === false ? "No" : "—"}
                  </p>
                </div>
              </div>

              {meta?.missingInfoQuestions && meta.missingInfoQuestions.length > 0 && (
                <div className="rounded-xl border border-[#2F80ED]/25 bg-[#2F80ED]/[0.07] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A7B3C2]">Preguntas sugeridas</p>
                  <ul className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-white">
                    {meta.missingInfoQuestions.map((q, i) => (
                      <li key={i} className="marker:text-[#2F80ED]">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meta?.source && (
                <p className="text-[12px] text-[#5A6577]">
                  Fuente meta: <span className="text-[#A7B3C2]">{meta.source}</span>
                  {meta.aiNcm && meta.aiNcm !== data.ncm && (
                    <span className="ml-2">· IA inicial: <span className="font-mono text-white">{meta.aiNcm}</span></span>
                  )}
                </p>
              )}

              {(meta?.adjustedFrom || meta?.adjustedTo) && (
                <div className="rounded-xl border border-white/[0.06] bg-[#07111A] p-4 text-[12px] text-[#A7B3C2]">
                  <span className="text-[#5A6577]">Ajuste:</span>{" "}
                  <span className="font-mono">{meta.adjustedFrom ?? "—"}</span>
                  {" → "}
                  <span className="font-mono">{meta.adjustedTo ?? "—"}</span>
                </div>
              )}

              {(meta?.searchTerms?.length || meta?.hsHeading || meta?.kind) ? (
                <div className="rounded-xl border border-white/[0.06] bg-[#07111A] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Pistas IA (búsqueda)</p>
                  <p className="mt-2 text-[12px] text-[#A7B3C2]">
                    {meta.hsHeading && <span className="mr-3">HS <span className="font-mono text-white">{meta.hsHeading}</span></span>}
                    {meta.kind && <span className="mr-3">{meta.kind}</span>}
                    {meta.searchTerms?.length ? (
                      <span>Términos: {meta.searchTerms.join(", ")}</span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {meta?.discarded && meta.discarded.length > 0 && (
                <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-400/80">Candidatos descartados (evidencia)</p>
                  <ul className="mt-3 space-y-2">
                    {meta.discarded.map((d, i) => (
                      <li key={i} className="text-[12px] leading-relaxed text-[#A7B3C2]">
                        <span className="font-mono text-white">{d.ncm}</span>
                        {" — "}
                        {d.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meta?.pcramCandidates && meta.pcramCandidates.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Candidatos PCRAM</p>
                  <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                    {meta.pcramCandidates.map((c) => (
                      <li key={c.ncmCode} className="text-[12px] text-[#A7B3C2]">
                        <span className="font-mono text-white">{c.ncmCode}</span>
                        {c.title ? ` — ${c.title}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {meta?.localCandidates && meta.localCandidates.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-[#0B1622] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Candidatos nomenclador local</p>
                  <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                    {meta.localCandidates.map((c) => (
                      <li key={c.ncmCode} className="text-[12px] text-[#A7B3C2]">
                        <span className="font-mono text-white">{c.ncmCode}</span>
                        {c.title ? ` — ${c.title}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {pcram?.breadcrumbs && pcram.breadcrumbs.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-[#07111A] p-4">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#5A6577]">Jerarquía (PCRAM)</p>
                  <div className="mt-2 space-y-1">
                    {pcram.breadcrumbs.map((bc, i) => (
                      <p key={i} className="text-[11px] text-[#5A6577]">
                        <span className="text-[#A7B3C2]">{"›".repeat(i + 1)}</span> {bc}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="text-[12px] font-medium text-[#2F80ED] hover:underline"
              >
                {showJson ? "Ocultar JSON" : "Ver JSON completo"}
              </button>
              {showJson && (
                <pre className="max-h-[min(420px,50vh)] overflow-auto rounded-xl border border-white/[0.06] bg-[#060d16] p-4 text-[11px] leading-relaxed text-[#A7B3C2]">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/[0.04] px-4 py-4 sm:px-6">
        <p className="mx-auto max-w-5xl text-[11px] leading-relaxed text-[#5A6577]">
          Resultado orientativo (IA + datos disponibles). Para despacho real, validá con matriculado. Variables:{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">OPENAI_API_KEY</code>,{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">PCRAM_USER</code> /{" "}
          <code className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px]">PCRAM_PASS</code>.
        </p>
      </footer>
    </div>
  );
}
