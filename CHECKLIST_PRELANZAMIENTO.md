# Checklist de pre-lanzamiento — E-COMEX cotizador

Estado al día: el **motor está técnicamente listo y es honesto** (148 tests, deploy sano,
verificado en vivo). Lo que falta para el **lanzamiento full** a inversores/marcas no es
código: son 2 datos tuyos (flete real + contador). Mientras tanto podés estar en **beta**.

Leyenda: 🔴 bloqueante full · 🟡 recomendable · 🟢 ya está

---

## 1) Bloqueantes para el lanzamiento FULL (datos tuyos, no código)

- [ ] 🔴 **Cargar tarifas de flete reales** — panel `/app/configuracion/fletes` (logueado como **admin**).
      Pedíselas a tu despachante y completá: aéreo China/USA, FCL China/Europa **20' y 40'**,
      LCL (mínimo por embarque + **USD/m³**), almacenaje, y RORO/Flat Rack/Open Top (vehículos).
      *La lógica ya es correcta (elige 20'/40'/múltiple, LCL por revenue ton); faltan los números reales.*
- [ ] 🔴 **Sign-off del contador** — revisar `CONSULTAS_FISCALES.md`:
      - [ ] Alícuotas **IIBB** por provincia (matriz destino × perfil).
      - [ ] **Recuperabilidad** (qué recupera Responsable Inscripto vs Monotributo).
      - [ ] IVA **10,5%** para bienes de capital (cuándo aplica).
      - [ ] Decidir **dólar para aduana**: blue vs oficial → setear `FX_ADUANA_TIPO` (`blue` | `oficial`) en Railway.

---

## 2) Verificación de configuración (Railway → Variables)

- [ ] 🟢 `ENABLE_DEBUG_API` en **false** (o borrada) — *ya hecho, verificado 404 en `/api/debug/*`*.
- [ ] 🔴 `ANTHROPIC_API_KEY` cargada (motor principal). `ANTHROPIC_MODEL=claude-opus-4-8`.
- [ ] 🟡 `OPENAI_API_KEY` cargada (failover del clasificador + visión).
- [ ] 🔴 `DATABASE_URL` (Neon) y `AUTH_JWT_SECRET` (≥ 32 caracteres aleatorios).
- [ ] 🔴 `PCRAM_USER` / `PCRAM_PASS` (+ `PCRAM_BASE_URL`/`PCRAM_LOGIN_URL`) — aranceles en vivo.
- [ ] 🔴 **Email**: o `SMTP_HOST`+`SMTP_USER`+`SMTP_PASS` (casilla cPanel) **o** `RESEND_API_KEY`.
      `EMAIL_FROM` y `OPERATOR_EMAIL` con la casilla real.
- [ ] 🟡 `FX_ADUANA_TIPO` = decisión del contador (default `blue`).

---

## 3) Legales y marca

- [ ] 🔴 `/terminos` y `/privacidad` con **razón social + CUIT reales** (revisar que no queden placeholders).
- [ ] 🟢 Copy del despachante = "del equipo de E-COMEX" (no "tu despachante") — *ya hecho*.
- [ ] 🟡 Datos de contacto / WhatsApp correctos en la UI.

---

## 4) Smoke test antes de abrir (15 min)

Hacer 5 cotizaciones reales y verificar que el número cierra y no hay errores:
- [ ] Un **electrónico** (ej. auriculares / celular).
- [ ] Una **máquina** (ej. excavadora / compresor) → debería ir a flete marítimo.
- [ ] Un **vehículo** (ej. auto) → RORO.
- [ ] Un **textil/calzado** (ej. zapatillas).
- [ ] Algo **voluminoso** (ej. 200 sillas) → debe elegir contenedor 40' (no 20').
- [ ] Probar **reset de contraseña** (que llegue el mail) y **subir una factura** (PDF/imagen).
- [ ] Crear el/los usuarios **operador** (Andy) con el rol correcto.

---

## 5) Recomendable (no bloquea, suma precisión)

- [ ] 🟡 **Dump AFIP/ARCA fresco** → re-ingestar con `NCM_SOURCE_DATE=YYYY-MM-DD`
      (`npx tsx scripts/ncm/ingest-chapters.ts`). Trae aranceles al día + códigos que hoy faltan
      (router, mouse, teclado, motor eléctrico, batería de litio, cámara CCTV).
- [ ] 🟡 **Sentry**: crear proyecto → pegar `SENTRY_DSN` en Railway → avisar para conectar el sink
      (alertas de arancel genérico / PCRAM caído / FX fallback / antidumping / clasificación tentativa).
- [ ] 🟡 **Catálogo NCM inicial**: correr `~/Downloads/import_catalogo_ecomex.sql` en Neon
      (8 entradas verificadas; idempotente). El resto se autollena con el uso.
- [ ] 🟡 **Antidumping**: verificar contra una posición con medida activa conocida que PCRAM
      exponga el dato (el motor ya lo suma/avisa cuando llega).

---

## 6) Post-lanzamiento (primera semana)

- [ ] Monitorear logs de Railway buscando `[alert:` (arancel genérico, PCRAM caído/viejo, FX fallback,
      antidumping, cotización inválida). Es la forma de medir el "1% de error".
- [ ] Revisar el **catálogo NCM** que se va auto-poblando (panel admin) y corregir lo que esté mal.
- [ ] Al **cerrar** las primeras operaciones, confirmar que el NCM queda "de oro" (auto-feed).

---

## Lo que YA está listo (no tenés que hacer nada) 🟢

- Motor a prueba de balas: nunca inventa ni da números rotos/incompletos.
- Clasificación: ~39 productos sembrados + IA con **failover** Anthropic→OpenAI + aprende solo.
- Integridad del número: **antidumping** cableado, **peso** conservador por capítulo, **red de moneda**,
  aviso de **divergencia de subpartida**, fuente del arancel trazada (PCRAM live / offline / genérico).
- Flete: elige **20'/40'/múltiple** por volumen; LCL por **revenue ton**.
- Honestidad: avisa cuando duda ("clasificación a confirmar" + alternativas con DIE), disclaimers.
- Seguridad: debug cerrado, claves solo en Railway, gateo por rol.
- Observabilidad: alertas estructuradas en logs (sink listo para Sentry).
- 148 tests unitarios verdes · suite de regresión de clasificación · deploy verificado en vivo.

---

## Veredicto

- **Soft launch / beta: listo HOY.** El motor es honesto y un despachante del equipo confirma el final.
- **Full launch (inversores/marcas): tras cerrar §1** (flete real + contador). Esos dos pasan el número
  de "estimación muy buena" a "número que bancás frente a una marca".
