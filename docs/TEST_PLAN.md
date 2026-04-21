# Test Plan — E-COMEX (pre-producción)

Documento de checklist para validar la app antes de cada despliegue a producción.
Cubre **build**, **tests automatizados**, **smoke tests** por ruta y **QA manual** en
móvil y desktop.

---

## 1. Pre-chequeos

### 1.1 Entorno
- [ ] `.env` / `.env.local` tiene todas las variables requeridas (auth, DB, OpenAI, Blob, PCRAM).
- [ ] Base de datos de producción migrada (`prisma migrate deploy`).
- [ ] Healthcheck de OpenAI (clave válida, modelo accesible).
- [ ] Vercel Blob (o storage equivalente) con credenciales activas.
- [ ] `NODE_ENV=production` en el entorno de build.
- [ ] Flags **apagados** en prod: `NCM_DEBUG`, `NCM_DEBUG_CANDIDATES`, `NCM_CHAT_FAST_PIPELINE` (pipeline completo por defecto; activar solo bajo pedido).

### 1.2 Calidad del código
- [ ] `npm run lint` sin errores.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run build` verde de punta a punta.
- [ ] `npm run test:unit` verde.
- [ ] `npm run test` (Playwright) verde en CI o local con DB de test.

---

## 2. Tests automatizados

### 2.1 Unit (Vitest) — `src/__tests__/unit`
- `calcImportQuote.test.ts` — cálculo de cotización.
- `chatParsers.test.ts` — parsers del chat.

Ejecutar: `npm run test:unit`.

### 2.2 E2E (Playwright) — `src/__tests__/e2e`
- `auth.spec.ts` — login / registro / logout.
- `clasificador.spec.ts` — chat NCM con mock de respuesta.
- `cotizacion.spec.ts` — creación y lectura de cotización.
- `operacion.spec.ts` — pipeline de operación.
- `operador.spec.ts` — acciones de rol operador.
- `seguridad.spec.ts` — rutas protegidas, expiración de sesión.

Ejecutar: `npm run test` (o `npm run test:ui` para debug).

### 2.3 Coverage mínimo recomendado para prod
- Parsers del chat (`chatParsers`): 100 % de ramas críticas.
- Motor de cotización (`calcImportQuote`): casos aéreo, marítimo, con/sin seguro, mínimos aduaneros.
- E2E felices: un caso por flujo crítico.

---

## 3. Smoke tests de rutas (GET)

Levantar en local (`npm run dev:webpack` o `npm run build && npm run start`) y
verificar que responden **200 / 307** según lo esperado.

| Ruta | Rol | Esperado |
| --- | --- | --- |
| `/` | anónimo | 200 |
| `/login` | anónimo | 200 |
| `/register` | anónimo | 200 |
| `/clasificarncm` | anónimo | 200 |
| `/clasificador` | anónimo | 200 |
| `/cotizar` | anónimo | 200 |
| `/tendencias` | anónimo | 200 |
| `/trust-compliance` | anónimo | 200 |
| `/app` | anónimo | 307 → `/login` |
| `/app` | usuario | 200 |
| `/app/nueva` | usuario | 200 |
| `/app/operaciones` | usuario | 200 |
| `/app/reportes` | usuario | 200 |
| `/app/operador` | operator/admin | 200 |
| `/app/operador` | usuario común | 307 / 403 |
| `/api/auth/session` | todos | 200 |

Script sugerido:
```bash
for r in / /login /register /clasificarncm /clasificador /app; do
  curl -sS -o /dev/null -w "%{http_code} $r\n" http://localhost:3000$r
done
```

---

## 4. QA manual — desktop

Resolución objetivo: **1440×900** y **1920×1080**.

### 4.1 Landing (`/`)
- [ ] Carga < 2.5 s, LCP sobre imagen hero.
- [ ] Navegación (Servicios / Cómo trabajamos / Plataforma / Contacto) hace scroll correcto.
- [ ] CTAs “Hablar con un especialista” y “Probar la plataforma” funcionan.
- [ ] Sin errores en consola.

### 4.2 Auth
- [ ] `/login` y `/register` con inputs accesibles (Tab navega, Enter submite).
- [ ] Mensajes de error visibles cuando credenciales incorrectas.
- [ ] Redirección a `/app` luego de login.

### 4.3 App shell
- [ ] Sidebar fija visible con grupos (Flujo principal / Ejecución / Inteligencia / Workspace).
- [ ] Item activo resaltado.
- [ ] Topbar: breadcrumb correcto, CTA “Nueva operación”, campana de notificaciones.
- [ ] Dropdown de notificaciones abre, cierra con clic fuera y con `Esc`.

### 4.4 Chat NCM (`/clasificarncm`, `/app/nueva`)
- [ ] Mensajes se ven correctamente (usuario vs analista).
- [ ] Sugerencias del hero funcionan.
- [ ] Al llegar al NCM aparece **una sola tarjeta** con posición, descripción y confianza.
- [ ] Desde `/app/nueva`: botón “Crear presupuesto con este NCM” genera cotización y muestra total.
- [ ] Botón “Consultar otro producto” resetea el caso.

### 4.5 Cotizaciones / Operaciones
- [ ] Listado paginado, filtros por fecha y estado.
- [ ] Detalle de operación con pipeline, documentos y eventos.
- [ ] PDF descargable por cotización.

### 4.6 Accesibilidad rápida
- [ ] Contraste AA en texto principal (verificar con DevTools).
- [ ] Foco visible en botones y enlaces.
- [ ] `aria-label` / `aria-expanded` en menús.

---

## 5. QA manual — mobile

Viewport objetivo: **iPhone 15 (390×844)** y **iPhone SE (375×667)** en Chrome DevTools.

### 5.1 General
- [ ] Sin scroll horizontal en ninguna vista.
- [ ] Safe areas respetadas (notch, home indicator) — `pt-safe` / `pb-safe` visibles.
- [ ] Targets táctiles ≥ 44 × 44 px en botones e iconos.
- [ ] Inputs de 16 px de texto (sin zoom automático en iOS).

### 5.2 App shell
- [ ] Hamburger abre drawer deslizante.
- [ ] Tap en overlay cierra el drawer.
- [ ] Drawer bloquea scroll del body mientras está abierto.
- [ ] `Esc` (con teclado externo) cierra el drawer.
- [ ] Panel de notificaciones ocupa ancho completo bajo el header, con backdrop.

### 5.3 Chat NCM
- [ ] Burbujas no se cortan; wrap correcto en palabras largas (NCMs, códigos).
- [ ] Teclado virtual no tapa el composer (usa `safe-area-inset-bottom`).
- [ ] “Enter envía” funciona; Shift+Enter no rompe layout.
- [ ] Tarjeta de resultado visible sin superponerse con el teclado.

### 5.4 Formularios
- [ ] Scroll a input activo con teclado abierto.
- [ ] Autocomplete correcto (`email`, `current-password`, `new-password`).

---

## 6. Regresión tras cambios grandes

Para cada PR que toque shell / chat / cotización:
- [ ] Smoke HTTP a rutas principales.
- [ ] `npm run test:unit`.
- [ ] 1 e2e por módulo tocado.
- [ ] QA manual de la ruta afectada + `/app/nueva` (flujo crítico).

---

## 7. Observabilidad en producción

- [ ] Logs del servidor sin `console.log` ruidosos (solo detrás de `NCM_DEBUG=1`).
- [ ] Errores de servidor reportados (Vercel logs / Sentry si aplica).
- [ ] Métrica de uptime por ruta principal.
- [ ] Alerta si `/api/auth/session` falla > 1 % en 5 minutos.

---

## 8. Rollback

- [ ] Revert del último deploy en Vercel probado al menos una vez por mes.
- [ ] Backup de DB reciente y script de restauración verificado.
- [ ] Checklist de “hotfix” disponible: rama, PR, deploy, verificación.

---

## Apéndice — Variables de entorno sensibles

| Variable | Obligatoria | Notas |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Postgres prod. |
| `AUTH_SECRET` / `JWT_SECRET` | Sí | Rotación semestral. |
| `OPENAI_API_KEY` | Sí | Llave de producción separada. |
| `OPENAI_MODEL` | Opcional | Default `gpt-4o-mini`. |
| `BLOB_READ_WRITE_TOKEN` | Sí (si Blob activo) | Vercel Blob. |
| `NCM_DEBUG` | No | **No setear en prod.** |
| `NCM_DEBUG_CANDIDATES` | No | **No setear en prod.** |
| `NCM_CHAT_FAST_PIPELINE` | No | Opt-in para modo rápido. |
