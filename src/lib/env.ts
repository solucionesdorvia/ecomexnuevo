/**
 * Chequeo de variables de entorno. SOLO LOGUEA — nunca tira error (no debe
 * tumbar el server si falta algo). Distingue críticas (sin esto no anda) de
 * opcionales (degradación). Pensado para correr una vez al boot (instrumentation).
 */

const CRITICAL = ["DATABASE_URL", "ANTHROPIC_API_KEY", "AUTH_JWT_SECRET"] as const;
const OPTIONAL = [
  "OPENAI_API_KEY",
  "PCRAM_USER",
  "PCRAM_PASS",
  "RESEND_API_KEY",
  "SMTP_HOST",
  "FX_ARS_PER_USD",
] as const;

const has = (k: string) => Boolean(process.env[k] && String(process.env[k]).trim());

export type EnvReport = {
  missingCritical: string[];
  missingOptional: string[];
  warnings: string[];
  ok: boolean;
};

export function checkEnv(): EnvReport {
  const missingCritical = CRITICAL.filter((k) => !has(k));
  const missingOptional = OPTIONAL.filter((k) => !has(k));
  const warnings: string[] = [];

  const sec = process.env.AUTH_JWT_SECRET;
  if (process.env.NODE_ENV === "production" && sec && sec.length < 32) {
    warnings.push("AUTH_JWT_SECRET tiene menos de 32 caracteres en producción.");
  }
  if (!has("ANTHROPIC_API_KEY") && !has("OPENAI_API_KEY")) {
    warnings.push("Sin ANTHROPIC_API_KEY ni OPENAI_API_KEY: el clasificador no funcionará.");
  }
  if (!has("PCRAM_USER") || !has("PCRAM_PASS")) {
    warnings.push("Sin PCRAM_USER/PCRAM_PASS: los aranceles caen al nomenclador offline.");
  }
  if (!has("RESEND_API_KEY") && !has("SMTP_HOST")) {
    warnings.push("Sin SMTP_HOST ni RESEND_API_KEY: no se envían emails (reset de contraseña, etc.).");
  }

  return {
    missingCritical: [...missingCritical],
    missingOptional: [...missingOptional],
    warnings,
    ok: missingCritical.length === 0,
  };
}

/** Loguea el chequeo al arrancar. Nunca lanza. */
export function logEnvCheck(): void {
  try {
    const r = checkEnv();
    if (r.missingCritical.length) {
      console.error("[env] ⚠️ FALTAN variables CRÍTICAS:", r.missingCritical.join(", "));
    }
    if (r.missingOptional.length) {
      console.warn("[env] faltan variables opcionales:", r.missingOptional.join(", "));
    }
    for (const w of r.warnings) console.warn("[env]", w);
    if (r.ok && !r.warnings.length) console.log("[env] configuración OK");
  } catch {
    /* nunca rompe el boot */
  }
}
