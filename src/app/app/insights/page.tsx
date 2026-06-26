import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyObj = Record<string, any>;

const DAY = 86_400_000;

function money(n?: number | null) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return "USD " + new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function quoteInfo(q: AnyObj) {
  const j = (q.quoteJson ?? {}) as AnyObj;
  const p = (q.productJson ?? {}) as AnyObj;
  return {
    ncm: j.ncm ?? p.ncm ?? null,
    total: q.totalMinUsd ?? j.totalMinUsd ?? null,
    regime: j?.regime?.code ?? null,
    confiable: j?.breakdown?.arancelConfiable,
    title: (j.productTitle ?? p.title ?? (q.userText || "").slice(0, 70) ?? "—").toString(),
  };
}

export default async function InsightsPage() {
  const gate = await requireOwner();
  if (!gate.ok) notFound();

  const [quotes, leads, transcriptRows] = await Promise.all([
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { lead: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.auditLog.findMany({
      where: { entityType: "chat_transcript" },
      orderBy: { createdAt: "desc" },
      take: 800,
    }),
  ]);

  // eslint-disable-next-line react-hooks/purity -- server component dinámico, no re-renderiza
  const now = Date.now();
  const q7 = quotes.filter((q) => q.createdAt.getTime() >= now - 7 * DAY).length;
  const q30 = quotes.filter((q) => q.createdAt.getTime() >= now - 30 * DAY).length;
  const courier = quotes.filter((q) => quoteInfo(q).regime === "courier").length;
  const general = quotes.filter((q) => quoteInfo(q).regime === "general").length;

  const quotedAnon = new Set(quotes.map((q) => q.anonId));
  const leadAnon = new Set(leads.map((l) => l.anonId));
  const converted = [...leadAnon].filter((a) => quotedAnon.has(a)).length;
  const conv = quotedAnon.size ? Math.round((converted / quotedAnon.size) * 100) : 0;

  const topMap = new Map<string, number>();
  for (const q of quotes) {
    const t = (quoteInfo(q).title || "—").toLowerCase().trim().slice(0, 48);
    topMap.set(t, (topMap.get(t) ?? 0) + 1);
  }
  const top = [...topMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topMax = Math.max(1, ...top.map((t) => t[1]));

  const days: { key: string; label: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(now - i * DAY);
    days.push({ key: dayKey(dt), label: `${dt.getDate()}/${dt.getMonth() + 1}`, n: 0 });
  }
  const dayIdx = new Map(days.map((d, i) => [d.key, i] as const));
  for (const q of quotes) {
    const i = dayIdx.get(dayKey(q.createdAt));
    if (i != null) days[i].n++;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  const seen = new Set<string>();
  const transcripts = transcriptRows
    .filter((r) => (seen.has(r.entityId) ? false : (seen.add(r.entityId), true)))
    .slice(0, 50);

  const card = "rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4";
  const th = "px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500";
  const td = "px-3 py-2 text-[13px] text-slate-300 align-top";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-slate-200">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">Panel del dueño</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Insights · cotizaciones y chats</h1>
        <p className="mt-1 text-[13px] text-slate-500">Vista privada (solo dueño). Cruza qué chatea la gente, qué cotiza y quién deja contacto.</p>
      </header>

      {/* Métricas */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "Cotizaciones (total)", v: quotes.length },
          { l: "Últimos 7 días", v: q7 },
          { l: "Últimos 30 días", v: q30 },
          { l: "Conversión a contacto", v: `${conv}%` },
        ].map((m) => (
          <div key={m.l} className={card}>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{m.l}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{m.v}</p>
          </div>
        ))}
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Volumen por día */}
        <div className={card}>
          <p className="mb-3 text-[13px] font-medium text-slate-300">Cotizaciones por día (14 días)</p>
          <div className="flex h-32 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-cyan-500/70"
                  style={{ height: `${Math.round((d.n / maxDay) * 100)}%`, minHeight: d.n ? 4 : 1 }}
                  title={`${d.label}: ${d.n}`}
                />
                <span className="text-[8px] text-slate-600">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Régimen + top productos */}
        <div className={card}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-slate-300">Productos más cotizados</p>
            <p className="text-[11px] text-slate-500">
              Courier <span className="text-emerald-400">{courier}</span> · General{" "}
              <span className="text-blue-400">{general}</span>
            </p>
          </div>
          <div className="space-y-1.5">
            {top.length === 0 && <p className="text-[12px] text-slate-600">Sin datos todavía.</p>}
            {top.map(([name, n]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="h-4 rounded bg-cyan-500/30" style={{ width: `${Math.round((n / topMax) * 70) + 6}%` }} />
                <span className="truncate text-[12px] text-slate-400">{name}</span>
                <span className="ml-auto text-[12px] font-medium text-slate-300">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cotizaciones */}
      <section className={`${card} mb-6 overflow-x-auto`}>
        <p className="mb-2 text-[13px] font-medium text-slate-300">Cotizaciones recientes</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className={th}>Fecha</th>
              <th className={th}>Qué escribió / producto</th>
              <th className={th}>NCM</th>
              <th className={th}>Total</th>
              <th className={th}>Régimen</th>
              <th className={th}>Contacto</th>
            </tr>
          </thead>
          <tbody>
            {quotes.slice(0, 60).map((q) => {
              const i = quoteInfo(q);
              return (
                <tr key={q.id} className="border-b border-white/[0.04]">
                  <td className={`${td} whitespace-nowrap text-slate-500`}>{fmtDate(q.createdAt)}</td>
                  <td className={`${td} max-w-[260px]`}>
                    <span className="line-clamp-2">{i.title || q.userText}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap font-mono text-[12px] text-cyan-300`}>{i.ncm ?? "—"}</td>
                  <td className={`${td} whitespace-nowrap`}>{money(i.total)}</td>
                  <td className={td}>
                    {i.regime === "courier" ? (
                      <span className="text-emerald-400">courier</span>
                    ) : i.regime === "general" ? (
                      <span className="text-blue-400">general</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                    {i.confiable === false && <span className="ml-1 text-amber-400" title="Arancel estimado">⚠</span>}
                  </td>
                  <td className={`${td} text-[12px]`}>
                    {q.lead?.contact ? <span className="text-emerald-300">{q.lead.contact}</span> : <span className="text-slate-700">—</span>}
                  </td>
                </tr>
              );
            })}
            {quotes.length === 0 && (
              <tr><td className={td} colSpan={6}>Sin cotizaciones todavía.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Leads */}
      <section className={`${card} mb-6 overflow-x-auto`}>
        <p className="mb-2 text-[13px] font-medium text-slate-300">Contactos dejados (leads)</p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className={th}>Fecha</th>
              <th className={th}>Contacto</th>
              <th className={th}>Canal</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-b border-white/[0.04]">
                <td className={`${td} whitespace-nowrap text-slate-500`}>{fmtDate(l.createdAt)}</td>
                <td className={`${td} text-emerald-300`}>{l.contact}</td>
                <td className={`${td} text-slate-400`}>{l.channel}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr><td className={td} colSpan={3}>Sin contactos todavía.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Transcripciones */}
      <section className={card}>
        <p className="mb-3 text-[13px] font-medium text-slate-300">Transcripciones de chat ({transcripts.length})</p>
        <div className="space-y-2">
          {transcripts.map((r) => {
            const p = (r.payload ?? {}) as AnyObj;
            const msgs = (p.messages ?? []) as Array<{ role: string; content: string }>;
            const firstUser = msgs.find((m) => m.role === "user")?.content ?? "(sin texto)";
            return (
              <details key={r.id} className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2">
                <summary className="cursor-pointer list-none text-[13px] text-slate-300">
                  <span className="text-slate-500">{fmtDate(r.createdAt)}</span> · {firstUser.slice(0, 70)}
                  {p.ncm ? <span className="ml-2 font-mono text-[11px] text-cyan-300">{p.ncm}</span> : null}
                  <span className="ml-2 text-[11px] text-slate-600">{p.turns ?? msgs.filter((m) => m.role === "user").length} turnos</span>
                </summary>
                <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">
                  {msgs.map((m, idx) => (
                    <div key={idx} className={`text-[12px] leading-snug ${m.role === "user" ? "text-slate-200" : "text-slate-400"}`}>
                      <span className={`mr-1.5 text-[10px] font-semibold uppercase ${m.role === "user" ? "text-cyan-400" : "text-slate-600"}`}>
                        {m.role === "user" ? "Usuario" : "IA"}
                      </span>
                      {m.content}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
          {transcripts.length === 0 && <p className="text-[12px] text-slate-600">Sin transcripciones todavía.</p>}
        </div>
      </section>
    </div>
  );
}
