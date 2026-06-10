# Plan de Reestructura — Motor de Presupuestos Exactos (E-COMEX Import Engine)

> Roadmap para que el cotizador genere presupuestos exactos según el documento funcional
> "E-COMEX IMPORT ENGINE" (12 pasos). Documento vivo: actualizar a medida que se implementa.

## Diagnóstico (estado actual)
El motor (`src/lib/quote/calcImportQuote.ts`) calcula **un solo total** sumando TODOS los
impuestos como costo. Esto infla el total ~40-50% para Responsable Inscripto (que recupera
el IVA). Causa raíz: **no se modela el perfil del importador ni la recuperabilidad**.

Brechas vs el documento de 12 pasos:
- Paso 3 (validación normativa): PCRAM detecta 5 organismos por keyword (ANMAT/SENASA/ENACOM/INAL/INTI), **no consulta real**, **no afecta precio ni régimen**. Faltan Seg. Eléctrica, LCM/LCA, antidumping, licencias, certificados de origen.
- Paso 4 (perfil importador): NO implementado (solo un comentario).
- Paso 5 (destino mercadería): NO usado.
- Paso 6 (beneficios fiscales RIGI/TdF/Bien de Capital): NO existe.
- Paso 8 (dimensiones reales): estima volumen por NCM, no pide L×A×H.
- Paso 9 (régimen Courier vs General): NO existe — siempre cotiza General.
- Paso 10 (transporte): reglas propias (umbral 5kg), distintas al documento.
- Paso 11 (recuperabilidad): **NO existe** — suma todo como costo. ← error principal de precios.

## Requerimientos adicionales del cliente (jun 2025)
1. **Perfil del importador persistente**: el usuario lo carga una vez en su cuenta (perfil),
   y el chatbot lo inyecta a su contexto en cada conversación (no vuelve a preguntar).
2. **Ficha técnica automática**: cuando falten peso/dimensiones, el bot busca la ficha técnica
   del producto en internet. Mostrar spinner "Generando presupuesto…" durante la búsqueda/cálculo.
3. **Recuperabilidad de impuestos**: ⏸️ PENDIENTE de validación fiscal (Andrés/contador) antes
   de codificar la tabla. No activar la separación costo/recuperable hasta confirmar.

---

## FASE 0 — Captura de datos faltantes
- [ ] Campo **Perfil importador** (Persona Física · Monotributo · Responsable Inscripto · Sociedad · Organismo Público)
- [ ] Campo **Destino** (Uso propio · Reventa · Proyecto industrial · Muestra)
- [ ] Campo **Beneficio fiscal** (Ninguno · TdF · Bien de Capital · RIGI · Minería · Energía · Otros)
- [ ] **Dimensiones reales** (largo · ancho · alto · bultos · peso) en el flujo del chat/cotizador

## FASE 0.b — Perfil persistente en la cuenta (req. nuevo #1)
- [ ] Agregar campos al modelo `User` (Prisma): `importerProfile`, `taxId`, `iibbProvince`, `fiscalBenefits`
- [ ] UI en `/account` o configuración para que el usuario complete su perfil de importador
- [ ] Inyectar el perfil al contexto del chatbot (system/analyst prompt) en cada conversación
      → el bot ya conoce perfil/destino habitual sin re-preguntar

## FASE 0.c — Ficha técnica automática (req. nuevo #2)
- [ ] Cuando falte peso/dimensiones: búsqueda web de ficha técnica del producto (modelo/marca)
- [ ] Extraer peso/dimensiones del resultado (parser con IA)
- [ ] Spinner/indicador "Generando presupuesto…" en el frontend durante búsqueda + cálculo
- [ ] Fallback: estimación por NCM (actual) si la búsqueda no encuentra datos

## FASE 1 — Motor impositivo con recuperabilidad ⭐ (el fix de precios)
- [x] **Bug seguro**: el total ahora incluye el seguro (`cifMin2`/`cifMax2`). [HECHO]
- [ ] Tabla de recuperabilidad por (impuesto × perfil). ⏸️ pendiente validación fiscal:
      | Impuesto | Resp. Inscripto | Persona Física / Monotributo |
      |---|---|---|
      | Derechos (DI) | Costo | Costo |
      | Tasa Estadística | Costo | Costo |
      | IVA 21% | Recuperable | Costo |
      | IVA Adicional 20% | Recuperable | Costo |
      | Percepción Ganancias | Recuperable | Costo |
      | IIBB | Recuperable (si inscripto) | Costo |
      | Impuestos Internos | Costo | Costo |
- [ ] Output con 3 totales: **Costo real de nacionalización** / **Impuestos recuperables** / **Desembolso total en aduana**
- [ ] UI: mostrar los 3 con nota "el IVA/percepciones se recuperan según tu situación fiscal"

## FASE 2 — Motor de régimen (Paso 9)
- [ ] Courier si FOB ≤ USD 3.000 **y** peso ≤ 50 kg **y** sin restricción **y** NCM permitida
- [ ] General en el resto; (opcional) Temporal / Especiales
- [ ] El régimen ajusta tratamiento impositivo y se muestra recomendado

## FASE 3 — Motor de transporte por dimensiones reales (Paso 10)
- [ ] Usar L×A×H×bultos reales (de Fase 0.c) en vez de estimar por NCM
- [ ] Peso volumétrico + peso facturable (el mayor)
- [ ] Reglas del documento: ≤30kg aéreo · 30-300kg comparar · >1m³ LCL · >15m³ FCL · vehículos RORO/FlatRack/OpenTop

## FASE 4 — Beneficios fiscales (Paso 6)
- [ ] Modificadores de alícuota por beneficio (TdF exime tributos, Bien de Capital reduce DI, RIGI, etc.)

## FASE 5 — Validación normativa real (Paso 3)
- [ ] Ampliar detección de organismos (Seg. Eléctrica, LCM/LCA, antidumping, licencias, cert. origen)
- [ ] Una restricción detectada **fuerza** régimen general (no courier)

---

## Archivos clave
- `src/lib/quote/calcImportQuote.ts` — motor de cálculo (núcleo)
- `src/lib/quote/freightRates.ts` — tarifas y modos de transporte
- `src/lib/pcram/pcramClient.ts` — scraper PCRAM (taxes + interventions)
- `src/lib/clasificar-ncm/chatEngine.ts` — analyst/clasificador del chat
- `src/lib/chat/chatProductBuilder.ts` — arma el producto + ensurePcram
- `src/app/cotizador/CotizadorPublicoClient.tsx` — UI del cotizador
- `src/app/app/nueva/QuoteCostBreakdown.tsx` — desglose visual
- `prisma/schema.prisma` — modelo User (para perfil persistente)

## Orden recomendado
0 → 0.b → 0.c → 1 (cuando se valide recuperabilidad) → 2 → 3 → 4 → 5
