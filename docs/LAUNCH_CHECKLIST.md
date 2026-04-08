# Checklist de lanzamiento (backend / Railway)

Orden sugerido para acercar el despliegue a producción. Parte del comportamiento depende de variables de entorno y de la configuración del proveedor (Railway, Neon, dominio).

## Antes del deploy

1. **Base de datos:** `DATABASE_URL` (pooler) y `DIRECT_URL` (directo) configurados en Railway; ejecutar migraciones de Prisma (`prisma migrate deploy`) contra la base de destino.
2. **Secretos:** `AUTH_JWT_SECRET` largo y aleatorio; credenciales de scraper, PCRAM, OpenAI (si aplica) solo en el entorno del servidor, nunca en el cliente.
3. **HTTPS y dominio:** servicio detrás de HTTPS; cookies de auth usan `secure` en producción.
4. **Comportamiento de negocio:** `SCRAPER_STUB`, `OPENAI_API_KEY`, PCRAM (`PCRAM_*`), tipo de cambio `FX_ARS_PER_USD` revisados para el entorno real.
5. **API de debug:** en producción, `/api/debug/*` queda bloqueado salvo `ENABLE_DEBUG_API=true`. En staging, conviene `DEBUG_API_SECRET` y el header `x-debug-secret` para no dejar debug abierto.
6. **Healthcheck:** Railway (u otro) puede apuntar a `GET /api/health`; el campo `db` indica si la conexión a Postgres responde.
7. **Backups y DB:** activar backups y probar restore en el panel de Neon (u otro proveedor).
8. **Legal y privacidad:** términos, política de privacidad y avisos según el mercado — fuera del repo, obligación operativa/comercial.
9. **Observabilidad:** alertas y logs centralizados (Sentry, Logtail, etc.) según necesidad — opcional en el código base.

## Notas

- **Rate limiting de auth:** los límites son por proceso Node. Con varias réplicas en Railway, cada instancia cuenta por separado; para un límite global hace falta Redis/Upstash u otro almacén compartido.
