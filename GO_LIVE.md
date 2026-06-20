# E-COMEX — Checklist para salir a producción

> Última actualización: 18/06/2026. Lo que está **pendiente depende de vos** (decisiones de
> negocio, validación profesional y carga de datos), no de desarrollo. La ingeniería ya está.

---

## ✅ Ya resuelto (no requiere acción)

- **Aranceles reales de PCRAM** funcionando (Chromium no arrancaba en Railway por falta de
  `--no-sandbox`; arreglado). Verificado: la cotización aplica el DIE real, no el estimado.
- **Clasificador NCM** afinado (trampas léxicas tipo deshidratador→8419, excavadora→8429;
  ya no filtra preguntas internas a la pantalla).
- **Reset de contraseña por email** (flujo completo + mail con diseño y responsive).
- **Páginas legales** (`/privacidad`, `/terminos`) + links en el footer.
- **Disclaimer "presupuesto estimado"** en la cotización (web) y en el PDF.
- **Perfil del importador** pre-llena el panel de régimen del cotizador (condición fiscal +
  provincia) para usuarios logueados.
- **CI** (lint + typecheck + tests) corriendo en cada push a `main`.

---

## 🔴 PENDIENTE — bloqueante (depende de vos)

### 1. Validación del contador (lo más importante)
Confirmar con un contador las alícuotas y reglas fiscales que usa el motor:
- Recuperabilidad de IVA + percepciones para Responsable Inscripto.
- IIBB por provincia (tabla en `src/lib/quote/iibbProvinces.ts`).
- IVA 10,5 % para bienes de capital.
- Exenciones (uso propio / bien de uso) de percepciones y Ganancias.
- Tasa Estadística (cuándo aplica la exención).

Doc de apoyo para esta charla: `docs/` (consultas para el contador, si existe) o el detalle
en `src/lib/quote/calcImportQuote.ts`.

### 2. Completar las páginas legales
En `src/app/privacidad/page.tsx` y `src/app/terminos/page.tsx` reemplazar los `〈...〉`:
- Razón social y CUIT de la empresa.
- Domicilio legal.
- Jurisdicción para controversias.
- **Que un abogado revise ambos textos** antes de confiar en ellos (son un borrador sólido,
  no asesoramiento legal).

### 3. Decidir tipo de cambio: dólar blue u oficial
Hoy el motor usa **dólar blue (venta)** vía dolarapi. Para **valor en aduana** se suele usar el
**oficial/BNA**. Definir cuál corresponde y avisar — es un cambio de 1 línea en
`src/lib/fx/arsPerUsd.ts`.

### 4. Cargar datos reales (variables en Railway / paneles)
- `OPERATOR_EMAIL` → los 3 mails reales: `hernan@`, `info@`, `andres@e-comex.com.ar`.
- **Tarifas RORO / Flat Rack / Open Top** del despachante en
  `/app/configuracion/fletes` (hoy son valores placeholder).
- Confirmar que están seteadas en Railway: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `PCRAM_USER` / `PCRAM_PASS`, `AUTH_JWT_SECRET` (≥32 chars), `DATABASE_URL` / `DIRECT_URL`,
  y `SMTP_*` o `RESEND_API_KEY` para los emails.

### 5. Apagar el endpoint de diagnóstico
Cuando termines de validar PCRAM, poné `ENABLE_DEBUG_API=false` (o borralo) en Railway.
No conviene dejar `/api/debug/*` accesible en producción a largo plazo.

---

## 🟡 PENDIENTE — recomendado, no bloquea el launch

### 6. Monitoreo de errores (Sentry)
No hay todavía. Para verlo en vivo cuando entren clientes:
1. Crear proyecto en sentry.io → obtener el DSN.
2. `npm i @sentry/nextjs` y correr `npx @sentry/wizard@latest -i nextjs`.
3. Cargar `SENTRY_DSN` en Railway.
(No se instaló ahora para no tocar el build justo antes del launch.)

### 7. Backups de la base (Neon)
Confirmar en la consola de Neon que el **Point-in-Time Recovery** está activo (plan que lo
incluya). Es la red de seguridad ante un borrado accidental.

---

## Cómo verificar que PCRAM anda (rápido)
Con `ENABLE_DEBUG_API=true` en Railway:
```
GET https://www.e-comex.com.ar/api/debug/pcram?ncm=8703.21.00&refresh=1
```
Tiene que devolver `"source":"live"` con `taxes` reales. Si devuelve un error, ahí se ve el
motivo (credenciales, login, etc.).

---

## Mínimo para salir con marcas
**#1 (contador) + #2 (legales completas).** El resto es carga de datos y hardening.
