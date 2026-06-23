/**
 * Next.js instrumentation: corre una vez al arrancar el server.
 * Solo loguea el chequeo de variables de entorno (nunca tumba el boot).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { logEnvCheck } = await import("./lib/env");
      logEnvCheck();
    } catch {
      /* nunca rompe el boot */
    }
    try {
      const { ncmIndexVersionSummary } = await import("./lib/ncm/indexVersion");
      console.log("[ncm]", ncmIndexVersionSummary());
    } catch {
      /* nunca rompe el boot */
    }
  }
}
