/**
 * Alertas de observabilidad. Objetivo: hacer MEDIBLE el "1% de error" — cada vez
 * que el cotizador cae a un camino degradado (arancel genérico, PCRAM caído,
 * FX fallback, divergencia de subpartida, clasificación tentativa, cálculo
 * inválido) emitimos un evento estructurado y greppable.
 *
 * No depende de Sentry: por defecto loguea a consola (visible en Railway). Si en
 * el futuro se configura un DSN, basta registrar un sink con registerAlertSink()
 * (p. ej. desde instrumentation.ts) y los mismos call-sites lo alimentan, sin
 * tocar nada más.
 */

export type AlertKind =
  | "tariff_generic" // se cotizó con arancel genérico (sin PCRAM ni nomenclador)
  | "tariff_offline" // se usó el nomenclador offline (PCRAM no disponible)
  | "pcram_stale" // las tasas PCRAM están viejas (se usó el último dato conocido)
  | "fx_fallback" // el tipo de cambio cayó al valor fijo de respaldo
  | "sibling_divergence" // subpartidas hermanas con aranceles muy distintos
  | "classification_tentative" // NCM no resuelto (a confirmar)
  | "quote_invalid"; // el motor produjo un resultado incoherente (bloqueado)

export type AlertSeverity = "info" | "warning" | "error";

export type AlertEvent = {
  kind: AlertKind;
  severity: AlertSeverity;
  message: string;
  data?: Record<string, unknown>;
};

type AlertSink = (event: AlertEvent) => void;

const sinks: AlertSink[] = [];

/** Registra un destino adicional (p. ej. Sentry). Idempotente por referencia. */
export function registerAlertSink(sink: AlertSink): void {
  if (!sinks.includes(sink)) sinks.push(sink);
}

const DEFAULT_SEVERITY: Record<AlertKind, AlertSeverity> = {
  tariff_generic: "warning",
  tariff_offline: "info",
  pcram_stale: "warning",
  fx_fallback: "error",
  sibling_divergence: "warning",
  classification_tentative: "info",
  quote_invalid: "error",
};

/** Emite una alerta. Nunca lanza. */
export function alert(
  kind: AlertKind,
  message: string,
  data?: Record<string, unknown>,
  severity: AlertSeverity = DEFAULT_SEVERITY[kind]
): void {
  const event: AlertEvent = { kind, severity, message, data };
  try {
    const line = `[alert:${kind}] ${message}${data ? " " + JSON.stringify(data) : ""}`;
    if (severity === "error") console.error(line);
    else if (severity === "warning") console.warn(line);
    else console.log(line);
  } catch {
    /* logging nunca rompe el flujo */
  }
  for (const sink of sinks) {
    try {
      sink(event);
    } catch {
      /* un sink roto no afecta a los demás ni al flujo */
    }
  }
}
