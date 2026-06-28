"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle, Download, LogIn, Phone, UserPlus, X } from "lucide-react";
import { useClasificarChat } from "@/app/clasificarncm/hooks/useClasificarChat";
import { ChatContainer } from "@/app/clasificarncm/components/ChatContainer";
import { ChatInput } from "@/app/clasificarncm/components/ChatInput";
import { ClassificationCard } from "@/app/clasificarncm/components/ClassificationCard";
import { FollowUpQuestions } from "@/app/clasificarncm/components/FollowUpQuestions";
import type { CaseSnapshot, CaseState } from "@/lib/clasificar-ncm/types";
import { QuoteCostBreakdown, type QuoteCostPayload } from "@/app/app/nueva/QuoteCostBreakdown";
import { QuickReplies } from "@/app/app/nueva/QuickReplies";
import { ncmToPartida } from "@/lib/ncmDisplay";
import { IIBB_PROVINCES } from "@/lib/quote/iibbProvinces";

const ANON_QUOTE_KEY = "ecomex_pq";

const QUALIFICATIONS = [
  "Ya definí el producto que quiero importar",
  "Sé cuántas unidades (o cuánto peso) necesito",
  "Estoy evaluando esta operación concretamente, no solo explorando",
] as const;

const HERO_SUGGESTIONS = [
  {
    title: "Torno paralelo CS6266C",
    hint: "1 unidad · China · USD 12.750",
    message:
      "Quiero importar un torno paralelo CS6266C x 2000, máquina herramienta industrial que trabaja metal por arranque de viruta (torno horizontal de bancada). 1 unidad desde China, precio FOB USD 12.750.",
  },
  {
    title: "Cosechadora John Deere S680",
    hint: "1 unidad · EE.UU. · USD 124.900",
    message:
      "Quiero importar una cosechadora-trilladora autopropulsada John Deere S680 (usada, año 2016), máquina agrícola para la cosecha de granos. 1 unidad desde EE.UU., precio FOB USD 124.900.",
  },
  {
    title: "Ómnibus EQ68206X6",
    hint: "1 unidad · China · USD 93.500",
    message:
      "Quiero importar un ómnibus EQ68206X6 para transporte de pasajeros (vehículo automóvil para 10 o más personas, incluido el conductor), con motor diésel. 1 unidad desde China, precio FOB USD 93.500.",
  },
  {
    title: "Alfa Romeo Giulia",
    hint: "1 unidad · Italia · USD 31.000",
    message:
      "Quiero importar un automóvil Alfa Romeo Giulia, vehículo sedán de pasajeros con motor naftero. 1 unidad desde Italia, precio FOB USD 31.000.",
  },
];

function stripMessages(s: CaseState): CaseSnapshot {
  const { messages, ...rest } = s;
  void messages;
  return rest;
}

function getQuoteCount(): number {
  if (typeof localStorage === "undefined") return 0;
  return parseInt(localStorage.getItem(ANON_QUOTE_KEY) ?? "0", 10);
}

function incrementQuoteCount() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(ANON_QUOTE_KEY, String(getQuoteCount() + 1));
}

function EmailModal({
  reason,
  onSubmit,
  onSkip,
}: {
  reason: "second_quote" | "pdf";
  onSubmit: (email: string) => void;
  onSkip: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!email.includes("@")) return;
    setPending(true);
    try {
      await fetch("/api/cotizador/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // silent — lead capture is best-effort
    }
    onSubmit(email);
    setPending(false);
  }

  const title =
    reason === "pdf" ? "¿A dónde te enviamos el PDF?" : "Dejá tu email para seguir cotizando";
  const desc =
    reason === "pdf"
      ? "También podés descargarlo directamente sin registrarte."
      : "Es gratis. Te avisamos cuando tengamos novedades para tu operación.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: "#0d1826", borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="email-modal-title" className="text-[16px] font-bold text-white">{title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{desc}</p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Cerrar"
            className="mt-0.5 text-slate-500 transition hover:text-slate-300"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <label htmlFor="email-modal-input" className="sr-only">Tu email</label>
          <input
            id="email-modal-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="tu@email.com"
            autoComplete="email"
            className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-[#07111A] px-3 text-[14px] text-white outline-none placeholder:text-slate-600 focus:border-[#18C3D6]/40"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending || !email.includes("@")}
            className="min-h-[44px] rounded-xl bg-[#18C3D6] px-4 text-[13px] font-medium text-[#030d18] transition hover:bg-[#0ea5b9] disabled:opacity-50"
          >
            {pending ? "..." : reason === "pdf" ? "Enviar" : "Continuar"}
          </button>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 w-full text-center text-[12px] text-slate-500 transition hover:text-slate-300"
        >
          {reason === "pdf" ? "Descargar sin registrarme" : "Omitir por ahora"}
        </button>
      </div>
    </div>
  );
}

export default function CotizadorPublicoClient() {
  const { caseState, sendMessage, pending, reset } = useClasificarChat();
  const [pendingQuote, setPendingQuote] = useState(false);
  const [bienDeCapital, setBienDeCapital] = useState(false);
  const [exentoTasaEstadistica, setExentoTasaEstadistica] = useState(false);
  // Sin default: obligamos a elegir el uso antes de cotizar — cambia mucho los
  // impuestos (percepciones) y es el diferencial de E-COMEX (preguntar el uso).
  const [destino, setDestino] = useState<"reventa" | "uso_propio" | null>(null);
  const [perfilImportador, setPerfilImportador] = useState<
    "responsable_inscripto" | "monotributo" | "persona_fisica" | "sociedad"
  >("responsable_inscripto");
  const [iibbProvincia, setIibbProvincia] = useState("CABA");
  const [quoteResult, setQuoteResult] = useState<QuoteCostPayload | null>(null);
  const [emailModal, setEmailModal] = useState<null | "second_quote" | "pdf">(null);
  const [pendingAction, setPendingAction] = useState<null | "new_quote" | "pdf">(null);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [expertSending, setExpertSending] = useState(false);
  const [expertSent, setExpertSent] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [expertError, setExpertError] = useState<string | null>(null);
  const [qualChecked, setQualChecked] = useState(QUALIFICATIONS.map(() => false));
  const allQualified = qualChecked.every(Boolean);
  // null = loading, true = logged in, false = anonymous
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { ok?: boolean }) => {
        const logged = Boolean(json?.ok);
        setIsLoggedIn(logged);
        // Si está logueado y tiene perfil cargado, pre-llenamos el panel de
        // régimen con SUS datos (condición fiscal + provincia IIBB) para que la
        // cotización use su perfil real y no los defaults.
        if (!logged) return;
        fetch("/api/user/profile", { credentials: "include" })
          .then((r) => r.json())
          .then((p: { user?: { importerProfile?: string | null; iibbProvince?: string | null } }) => {
            const u = p?.user;
            if (!u) return;
            const map: Record<string, typeof perfilImportador> = {
              RESPONSABLE_INSCRIPTO: "responsable_inscripto",
              MONOTRIBUTO: "monotributo",
              PERSONA_FISICA: "persona_fisica",
              SOCIEDAD: "sociedad",
              ORGANISMO_PUBLICO: "responsable_inscripto",
            };
            const mapped = u.importerProfile ? map[u.importerProfile] : undefined;
            if (mapped) setPerfilImportador(mapped);
            if (u.iibbProvince && IIBB_PROVINCES.some((pr) => pr.code === u.iibbProvince)) {
              setIibbProvincia(u.iibbProvince);
            }
          })
          .catch(() => {});
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  function toggleQual(i: number) {
    setQualChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  const hasCommercialData = Boolean(
    caseState.purchase?.fobUnitUsd && caseState.purchase?.quantity && caseState.purchase?.origin
  );
  // Mostrar botón cuando tenemos los 3 datos comerciales + clasificación resuelta.
  // También mostramos si tenemos datos completos y status tentativo aunque no haya NCM
  // (puede pasar si el motor falló; el backend igual calcula con tarifas por defecto).
  const showResultCard =
    hasCommercialData &&
    (caseState.status === "resolved" || caseState.status === "tentative") &&
    (caseState.recommendedNcm || typeof caseState.confidence === "number");
  const lastAssistant = useMemo(() => {
    for (let i = caseState.messages.length - 1; i >= 0; i--) {
      const m = caseState.messages[i]!;
      if (m.role === "assistant") return m.content;
    }
    return "";
  }, [caseState.messages]);

  const handleSend = useCallback(
    async (text: string, files?: File[]) => {
      const t = text.trim();
      const hasFiles = Array.isArray(files) && files.length > 0;
      if (!t && !hasFiles) return;
      await sendMessage(t, files);
    },
    [sendMessage]
  );

  async function createQuote() {
    if (pendingQuote || !showResultCard) return;
    setPendingQuote(true);
    setQuoteResult(null);
    setQuoteError(null);
    try {
      const res = await fetch("/api/cotizador/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snapshot: stripMessages(caseState),
          messages: caseState.messages,
          bienDeCapital,
          exentoTasaEstadistica,
          destino,
          perfilImportador,
          iibbProvincia,
        }),
      });
      const json = (await res.json()) as QuoteCostPayload & { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo crear el presupuesto.");
      if (json.quoteId && json.cards) {
        setQuoteResult({
          quoteId: json.quoteId,
          ncm: json.ncm,
          classification: json.classification,
          cards: json.cards,
          totalMinUsd: json.totalMinUsd,
          totalMaxUsd: json.totalMaxUsd,
          explanation: json.explanation,
          assumptions: json.assumptions,
          quality: json.quality,
          quantity: caseState.purchase?.quantity,
          breakdown: json.breakdown ?? undefined,
          regime: json.regime ?? undefined,
          warnings: json.warnings ?? undefined,
        });
        incrementQuoteCount();
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setPendingQuote(false);
    }
  }

  function handleNewQuote() {
    setQualChecked(QUALIFICATIONS.map(() => false));
    setExpertSent(false);
    setExpertError(null);
    if (getQuoteCount() >= 1 && !capturedEmail) {
      setPendingAction("new_quote");
      setEmailModal("second_quote");
    } else {
      reset();
      setQuoteResult(null);
    }
  }

  function handlePdfDownload() {
    if (!quoteResult) return;
    if (!capturedEmail) {
      setPendingAction("pdf");
      setEmailModal("pdf");
    } else {
      triggerDownload();
    }
  }

  function triggerDownload() {
    if (!quoteResult) return;
    window.open(
      `/api/quote/pdf?mode=quote&id=${encodeURIComponent(quoteResult.quoteId)}`,
      "_blank"
    );
  }

  function onEmailSubmit(email: string) {
    setCapturedEmail(email);
    setEmailModal(null);
    const action = pendingAction;
    setPendingAction(null);
    if (action === "new_quote") {
      reset();
      setQuoteResult(null);
      setExpertSent(false);
      setExpertError(null);
    } else if (action === "pdf") {
      triggerDownload();
    }
  }

  function onEmailSkip() {
    setEmailModal(null);
    const action = pendingAction;
    setPendingAction(null);
    if (action === "new_quote") {
      reset();
      setQuoteResult(null);
      setExpertSent(false);
      setExpertError(null);
    } else if (action === "pdf") {
      triggerDownload();
    }
  }

  async function handleSendExpert() {
    if (!quoteResult || expertSending || expertSent) return;
    setExpertSending(true);
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(quoteResult.quoteId)}/decision`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send_expert" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo enviar.");
      setExpertSent(true);
    } catch {
      setExpertError("No se pudo enviar la solicitud. Por favor contactanos directamente por WhatsApp.");
    } finally {
      setExpertSending(false);
    }
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#030712]"
      style={{ fontFamily: "var(--font-body, ui-sans-serif, system-ui)" }}
    >
      {emailModal && (
        <EmailModal reason={emailModal} onSubmit={onEmailSubmit} onSkip={onEmailSkip} />
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {caseState.messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:py-12">
                <div className="w-full max-w-2xl">
                  <h1
                    className="nueva-fade-in text-[26px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[30px]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ¿Cuánto cuesta importar<br className="hidden sm:block" /> ese producto?
                  </h1>
                  <p className="nueva-fade-in nueva-fade-in-delay-1 mt-3 text-[14px] leading-relaxed text-slate-500">
                    Describí lo que querés traer, el precio y de dónde viene. Calculamos aranceles, flete e impuestos al instante.
                  </p>
                  <div className="nueva-fade-in nueva-fade-in-delay-2 mt-7 grid gap-2 sm:grid-cols-2">
                    {HERO_SUGGESTIONS.map((s, i) => (
                      <button
                        key={s.title}
                        type="button"
                        disabled={pending}
                        onClick={() => void sendMessage(s.message)}
                        className="group flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#0a1422]/80 px-4 py-3 text-left transition hover:border-white/[0.14] hover:bg-[#0d1a2e] disabled:pointer-events-none disabled:opacity-40"
                        style={{ animationDelay: `${240 + i * 50}ms` }}
                      >
                        <div>
                          <span className="block text-[13px] font-semibold text-slate-200 transition-colors group-hover:text-white">
                            {s.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {s.hint}
                          </span>
                        </div>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-slate-400"
                          aria-hidden
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ChatContainer messages={caseState.messages} pending={pending} />
            )}

            {caseState.messages.length > 0 &&
            caseState.pendingQuestions &&
            caseState.pendingQuestions.length > 0 &&
            !showResultCard &&
            !hasCommercialData ? (
              <div className="shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-6">
                <div className="mx-auto max-w-[720px]">
                  <FollowUpQuestions
                    questions={caseState.pendingQuestions}
                    context={undefined}
                  />
                </div>
              </div>
            ) : null}

            {showResultCard ? (
              <div className="nueva-reveal shrink-0 border-t border-white/[0.04] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5">
                <div className="mx-auto flex max-w-[720px] flex-col gap-3">
                  {caseState.recommendedNcm && typeof caseState.confidence === "number" ? (
                    <ClassificationCard
                      ncm={caseState.recommendedNcm}
                      description={caseState.classificationRationale}
                      confidence={caseState.confidence}
                      rationale={
                        caseState.status === "tentative"
                          ? "Confianza por debajo del 70% o posición ambigua: la validamos con documentación y un despachante del equipo de E-COMEX."
                          : undefined
                      }
                      variant={
                        caseState.status === "resolved" && !caseState.ambiguity
                          ? "resolved"
                          : "tentative"
                      }
                    />
                  ) : (
                    <div className="card-in rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3.5">
                      <p className="text-[13px] font-medium text-slate-200">
                        Tenemos todo lo necesario para calcular el presupuesto.
                      </p>
                    </div>
                  )}
                  {!hasCommercialData && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5">
                      <p className="text-[12px] leading-relaxed text-amber-300">
                        Para cotizar necesito saber:{" "}
                        {[
                          !caseState.purchase?.fobUnitUsd && "precio FOB (USD)",
                          !caseState.purchase?.quantity && "cantidad",
                          !caseState.purchase?.origin && "país de origen",
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        . Respondé en el chat.
                      </p>
                    </div>
                  )}
                  <div className="mb-3 space-y-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Cómo vas a importar <span className="text-[#18C3D6]">— cambia los impuestos</span>
                    </p>

                    {/* Perfil del importador → recuperabilidad */}
                    <label className="block text-[12px] text-slate-300">
                      Perfil del importador
                      <select
                        value={perfilImportador}
                        onChange={(e) => setPerfilImportador(e.target.value as typeof perfilImportador)}
                        className="mt-1 w-full rounded-lg border border-white/[0.1] bg-[#0a1118] px-2.5 py-2 text-[13px] text-white outline-none focus:border-[#18C3D6]/50"
                      >
                        <option value="responsable_inscripto">Responsable Inscripto</option>
                        <option value="monotributo">Monotributista</option>
                        <option value="persona_fisica">Persona física</option>
                        <option value="sociedad">Sociedad</option>
                      </select>
                    </label>

                    {/* Destino → percepciones (REQUERIDO antes de cotizar) */}
                    <div className="text-[12px] text-slate-300">
                      <span className="font-semibold text-white">¿Para qué vas a usar el producto?</span>
                      <div className="mt-1.5 flex gap-2">
                        {([
                          ["reventa", "Reventa / comercialización"],
                          ["uso_propio", "Uso propio (bien de uso)"],
                        ] as const).map(([val, lbl]) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setDestino(val)}
                            className={`flex-1 rounded-lg border px-2.5 py-2 text-[12px] transition ${
                              destino === val
                                ? "border-[#18C3D6]/60 bg-[#18C3D6]/10 text-white"
                                : "border-white/[0.1] text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                      {!destino && (
                        <p className="mt-1 text-[10px] font-medium text-[#18C3D6]">
                          Elegí una opción — define qué impuestos pagás (percepciones).
                        </p>
                      )}
                      {destino === "uso_propio" && (
                        <p className="mt-1 text-[10px] text-slate-500">
                          Uso propio: no se cobran percepciones (IVA adic., Ganancias, IIBB).
                        </p>
                      )}
                    </div>

                    {/* Provincia (IIBB) — solo relevante en reventa */}
                    {destino === "reventa" && (
                      <label className="block text-[12px] text-slate-300">
                        Provincia (para IIBB)
                        <select
                          value={iibbProvincia}
                          onChange={(e) => setIibbProvincia(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/[0.1] bg-[#0a1118] px-2.5 py-2 text-[13px] text-white outline-none focus:border-[#18C3D6]/50"
                        >
                          {IIBB_PROVINCES.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.label} ({p.pct}%)
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {/* Bien de capital → IVA 10,5% */}
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={bienDeCapital}
                        onChange={(e) => setBienDeCapital(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#18C3D6]"
                      />
                      <span className="text-[12px] leading-snug text-slate-300">
                        <span className="font-semibold text-white">¿Es un bien de capital?</span> (maquinaria, equipos industriales) →{" "}
                        <span className="text-[#18C3D6]">IVA 10,5%</span> (y percepciones reducidas en reventa).
                      </span>
                    </label>

                    {/* Exención tasa estadística */}
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={exentoTasaEstadistica}
                        onChange={(e) => setExentoTasaEstadistica(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#18C3D6]"
                      />
                      <span className="text-[12px] leading-snug text-slate-300">
                        <span className="font-semibold text-white">Exento de Tasa Estadística</span> (bien de capital sin producción nacional, Mercosur, RIGI) → TE 0%.
                      </span>
                    </label>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      disabled={pendingQuote || !hasCommercialData || !destino}
                      onClick={() => void createQuote()}
                      className="min-h-[48px] rounded-xl bg-[#18C3D6] px-4 py-3 text-[13px] font-medium text-[#030d18] shadow-lg shadow-[#18C3D6]/20 transition hover:bg-[#0ea5b9] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-0"
                    >
                      {pendingQuote ? "Generando presupuesto…" : !destino && hasCommercialData ? "Elegí el uso para cotizar" : "Ver presupuesto"}
                    </button>
                    <button
                      type="button"
                      onClick={handleNewQuote}
                      className="min-h-[44px] text-[12px] text-slate-500 transition hover:text-slate-300 sm:min-h-0"
                    >
                      Consultar otro producto
                    </button>
                  </div>
                  {pendingQuote ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-[#18C3D6]/15 bg-[#18C3D6]/[0.05] px-3.5 py-2.5" aria-live="polite">
                      <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-[#18C3D6]" fill="none" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-[12px] leading-relaxed text-slate-300">
                        Buscando la ficha técnica del producto y calculando impuestos y flete…
                      </p>
                    </div>
                  ) : null}
                  {quoteError ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3">
                      <p className="text-[12px] leading-relaxed text-red-300">{quoteError}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {quoteResult ? (
              <div
                className="nueva-reveal shrink-0 border-t border-white/[0.06] bg-[#0b1220]/60 px-3 py-4 sm:px-6 sm:py-5"
                aria-live="polite"
              >
                <div className="mx-auto flex max-w-[720px] flex-col gap-4">
                  <QuoteCostBreakdown quote={quoteResult} scrollIntoViewOnMount />
                  <div className="card-in rounded-2xl border border-white/[0.09] bg-[#0a1422] p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-4">
                      <p className="text-[13px] font-semibold text-white">
                        Presupuesto formal con asesor
                      </p>
                      {(quoteResult.ncm || caseState.recommendedNcm) ? (
                        <span className="ml-auto rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-slate-400">
                          Pos. {ncmToPartida(quoteResult.ncm || caseState.recommendedNcm || "") || quoteResult.ncm || caseState.recommendedNcm}
                        </span>
                      ) : null}
                    </div>

                    {expertSent ? (
                      <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                        <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                        <div>
                          <p className="text-[14px] font-semibold text-emerald-300">¡Caso recibido!</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                            Un asesor revisa tu clasificación aduanera y te contacta con el presupuesto
                            definitivo y los pasos a seguir. También podés escribirnos:{" "}
                            <a
                              href="https://wa.me/5491126268316"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#18C3D6] hover:underline"
                            >
                              WhatsApp +54 9 11 2626-8316
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3.5 text-[12px] leading-relaxed text-slate-500">
                          Un asesor revisa tu clasificación aduanera, verifica costos reales y prepara
                          el presupuesto definitivo. Confirmá que estás en condiciones de avanzar:
                        </p>

                        <div className="mt-4 space-y-3">
                          {QUALIFICATIONS.map((q, i) => (
                            <label
                              key={i}
                              className="flex cursor-pointer items-start gap-3 select-none"
                            >
                              <input
                                type="checkbox"
                                checked={qualChecked[i]}
                                onChange={() => toggleQual(i)}
                                className="sr-only"
                              />
                              <div
                                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-all ${
                                  qualChecked[i]
                                    ? "border-[#18C3D6] bg-[#18C3D6]"
                                    : "border-white/20 bg-white/[0.03] hover:border-white/30"
                                }`}
                                aria-hidden
                              >
                                {qualChecked[i] && (
                                  <Check className="h-3 w-3 text-[#030712]" strokeWidth={3} />
                                )}
                              </div>
                              <span
                                className={`text-[12.5px] leading-snug transition-colors ${
                                  qualChecked[i] ? "text-slate-200" : "text-slate-500"
                                }`}
                              >
                                {q}
                              </span>
                            </label>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                          {expertError ? (
                            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3">
                              <p className="text-[12px] leading-relaxed text-red-300">{expertError}</p>
                            </div>
                          ) : null}

                          {/* Auth gate: si no está logueado y marcó todo → pedimos cuenta */}
                          {allQualified && isLoggedIn === false ? (
                            <div className="rounded-xl border border-[#18C3D6]/20 bg-[#18C3D6]/[0.06] px-4 py-4">
                              <p className="text-[13px] font-semibold text-white">
                                Necesitás una cuenta para continuar
                              </p>
                              <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
                                Tu cotización queda guardada y se vincula automáticamente a tu cuenta al registrarte o iniciar sesión.
                              </p>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <Link
                                  href={`/account/register?next=${encodeURIComponent("/cotizador")}`}
                                  className="group flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#18C3D6] px-4 py-2.5 text-[13px] font-semibold text-[#030712] transition hover:bg-[#15afc1]"
                                >
                                  <UserPlus className="h-4 w-4" aria-hidden />
                                  Registrarme gratis
                                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                </Link>
                                <Link
                                  href={`/account/login?next=${encodeURIComponent("/cotizador")}`}
                                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.12] px-4 py-2.5 text-[13px] font-medium text-slate-300 transition hover:border-white/[0.22] hover:text-white"
                                >
                                  <LogIn className="h-4 w-4" aria-hidden />
                                  Ya tengo cuenta
                                </Link>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => { setExpertError(null); void handleSendExpert(); }}
                                disabled={!allQualified || expertSending || isLoggedIn === null}
                                className="group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#18C3D6] px-5 py-3 text-center text-[14px] font-semibold text-[#030712] transition hover:bg-[#15afc1] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[44px]"
                              >
                                <Phone className="h-4 w-4" aria-hidden />
                                {expertSending ? "Enviando…" : "Solicitar revisión formal de mi caso"}
                                {!expertSending && (
                                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                )}
                              </button>
                              {!allQualified && (
                                <p className="text-center text-[11px] text-slate-600">
                                  Confirmá los puntos anteriores para habilitar el envío
                                </p>
                              )}
                            </>
                          )}
                          <div className="flex gap-2">
                            <a
                              href="https://wa.me/5491126268316?text=Hola%2C%20quiero%20consultar%20sobre%20una%20importaci%C3%B3n"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200 sm:min-h-0"
                            >
                              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={handlePdfDownload}
                              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/[0.1] px-4 py-2.5 text-center text-[13px] font-medium text-slate-400 transition hover:border-white/[0.18] hover:text-slate-200 sm:min-h-0"
                            >
                              <Download className="h-4 w-4" aria-hidden />
                              PDF
                            </button>
                          </div>
                          <p className="mt-1 text-center text-[11px] text-slate-700">
                            ¿Importás seguido?{" "}
                            <Link href="/account/register" className="text-slate-500 underline-offset-2 transition hover:text-slate-400 hover:underline">
                              Gestioná tus operaciones con una cuenta gratis
                            </Link>
                          </p>
                        </div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleNewQuote}
                      className="mt-4 w-full text-center text-[12px] text-slate-600 transition hover:text-slate-400"
                    >
                      Cotizar otro producto
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {!showResultCard && !pending && lastAssistant ? (
            <QuickReplies
              lastAssistantText={lastAssistant}
              disabled={pending}
              onPick={(v) => void handleSend(v)}
            />
          ) : null}

          <ChatInput
            onSend={handleSend}
            disabled={pending}
            canSubmitEmpty={true}
            helperText={
              <span>
                <span className="hidden sm:inline">Enter envía · Shift+Enter nueva línea · 📎 Adjuntá factura o foto</span>
                <span className="sm:hidden">Enter envía · 📎 Adjuntá factura o foto</span>
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
