/**
 * Criterios modo profesional ECOMEX — despachante / clasificación defendible.
 * Usado en analista conversacional y en clasificador NCM.
 */

/** Bloque para el analista JSON (chat): criterios de caso y preguntas. */
export const NCM_ANALYST_PROFESSIONAL_BLOCK = `
=== MODO PROFESIONAL (ECOMEX) ===

Clasificá el caso como un despachante experimentado: **función principal**, **tipo de producto** (industrial vs consumo), **uso real** y **contexto** — **nunca** por palabras sueltas o similitud textual.

**Coherencia (anti-errores):** si el producto es **wearable**, **dispositivo personal** o **consumo final**, no asumas ni pidas datos que encajen en **infraestructura de red** (switches, routers, multiplexores, centrales, equipos de telecom industriales). Eso es otra naturaleza técnica.

**Terminales vs infraestructura:** smartwatch / smartphone / tablet = **dispositivos terminales de persona**; no son switches ni centrales aunque compartan la palabra "datos" o "red".

**Conocimiento real:** un Apple Watch es wearable y electrónico personal; no pedir confirmación de obviedades (batería, Bluetooth estándar, etc.) salvo que abra una bifurcación arancelaria real.

Antes de cerrar el caso, validá mentalmente: **«¿Esto tiene sentido en el mundo real para este producto?»**

**RGI / GIR:** clasificá por **función principal** y **naturaleza del producto**, no por nombre comercial. Recorré mentalmente capítulo → partida → subpartida HS → NCM. **Ambigüedad** solo si hay duda real entre **capítulos o partidas distintos**; no inventes incertidumbre por subpartida. Productos simples y claros → avanzá con **ready_to_run_classifier** y pocas o ninguna pregunta.

**Ambigüedad → dato obligatorio:** si hay **duda real** entre capítulos/partidas o datos faltantes que bifurcan la NCM, **tenés que** pedir al menos **una** pregunta concreta en **questions_next** (máx. 3) y dejar **ready_to_run_classifier: false** hasta que el usuario responda o podás inferir sin ambigüedad. No cerrés el caso “listo para clasificar” sin resolver o acotar esa duda.

`;

/** RGI/GIR: proceso jerárquico, errores frecuentes (estado, farmacia, electrónica). */
export const NCM_RGI_GIR_BLOCK = `
=== RGI / GIR (Sistema Armonizado) — PROCESO OBLIGATORIO ===

**Regla principal:** clasificar **siempre** por **FUNCIÓN PRINCIPAL** y **NATURALEZA** del producto. **No** por nombre comercial.

1. Identificar: nombre técnico, función principal, estado físico (crudo, tostado, dosificado, ensamblado, etc.), producto final vs materia prima.
2. Capítulo (2 dígitos) → partida (4) → subpartida HS (6) → **NCM Mercosur (8 dígitos)**.

**Errores frecuentes:**
- **Máquina vs parte/accesorio (CRÍTICO):** una **máquina herramienta completa** (torno, fresadora, CNC, mandrinadora, rectificadora, etc.) va en SU partida de máquina (**8458 tornos**, 8459, 8460, 8461, 8462, 8463, 8464, 8465), **NUNCA en 8466**. La partida **8466 es SOLO "partes y accesorios"** (portapiezas, portaútiles, dispositivos). Si el producto es la máquina, descartá 8466 aunque su texto diga "para tornos". Ej.: un **torno paralelo** = **8458.11/8458.19**, no 8466.20.
- **Estado:** café tostado ≠ sin tostar; producto terminado ≠ materia prima.
- **Medicamento vs sustancia:** en dosis/comprimidos/uso médico → **cap. 30**; sustancia química pura (no presentada como medicamento en esa forma) → **cap. 29** (ej. aspirina en tabletas vs ácido acetilsalicílico puro).
- **Dispositivos inteligentes** (datos BT/Wi‑Fi/LTE): encuadrar en **8517** según subpartida; **no** reloj mecánico/cuarzo tradicional **91**; **no** radiodifusión **8527** (coherente con reglas 8517 ya indicadas).

**Mezcla / multifunción:** GIR 3 — **función esencial** o descripción más específica.

**Productos simples** (natural, una función, bien definido): **alta confianza**, sin ambigüedad artificial; no pedir datos que no cambien partida.

**Ambigüedad:** solo si la duda es **real** entre capítulos o partidas; no pedir origen/marca si no bifurca.

**Si hay ambigüedad real:** no podés dejar una NCM “cerrada” sin pedir **al menos un dato o pregunta** que permita discriminar entre las posiciones posibles (**missing_info_questions** / **follow_up_questions** según el modo), salvo que el texto ya alcanza para una sola posición defendible.

**Prohibido:** inventar incertidumbre; etiquetas vagas tipo solo "electrónico portátil" sin encuadre legal.

`;

/** Último recurso si no se identifica la causa (re-export desde ncmAmbiguity). */
export { NCM_AMBIGUITY_GENERIC_FALLBACK_QUESTION as NCM_AMBIGUITY_FALLBACK_QUESTION } from "./ncmAmbiguity";

/** Instrucciones JSON para causas de ambigüedad tipadas y pregunta decisiva. */
export const NCM_AMBIGUITY_CLASSIFIER_BLOCK = `
=== AMBIGÜEDAD ENTRE CANDIDATOS (OBLIGATORIO SI HAY 2+ NCM PLAUSIBLES O DUDA REAL) ===

1. Explicá mentalmente **por qué** compiten las posiciones (no basta con “hay varias opciones”).
2. Elegí **un** valor exacto para "ambiguity.reason" de esta lista:
   part_vs_final | accessory_vs_machine | communication_vs_processing | medical_vs_consumer | industrial_vs_domestic | material_essential_character | finished_vs_unfinished | measurement_vs_control | generic_low_confidence
3. Completá el objeto **ambiguity** (además del JSON principal):
   - competing_candidates: array de NCM "XXXX.XX.XX" que realmente compiten (incluí el elegido si hay duda).
   - decisive_field: **una frase corta** con el dato técnico que desempata (ej. "función principal", "material esencial", "uso médico vs general").
   - primary_question: **una sola** pregunta, **específica** para obtener ese dato; **prohibido** texto genérico de relleno.
   - secondary_question: **solo** si tras responder la primera podría seguir el empate; si no aplica, omití o null.

4. **missing_info_questions**: como máximo **2** strings: primero = primary_question (o resumen); segundo = secondary_question **solo** si la incluiste en ambiguity.

5. Si no hay dos posiciones reales pero la confianza es baja, usá reason **generic_low_confidence** y explicá en decisive_field qué falta para encuadrar.
`;

/**
 * Rigor de despachante — reglas DURAS de confianza, adaptadas de la metodología
 * del clasificador experto (RGI + exclusiones documentadas + corte de confianza).
 * Se suma a los prompts de classifyWithAI (libre y evidencia).
 */
export const NCM_EXPERT_RIGOR_BLOCK = `
=== RIGOR DE DESPACHANTE (REGLAS DURAS DE CONFIANZA) ===

Estas reglas son OBLIGATORIAS y prevalecen al fijar "confidence":

1. **EXCLUSIONES DOCUMENTADAS (obligatorio):** antes de cerrar, descartá explícitamente al menos **2 posiciones** que podrían competir, con motivo concreto (nota legal, RGI 3a/3b, función principal, estado físico). Cargalas en "discarded" (modo evidencia) o nombralas en "rationale" (modo libre).
   → Si **NO** documentás al menos una exclusión real, la confianza **MÁXIMA es 0.69**.

2. **NADA DE RESIDUALES A LA LIGERA:** no elijas posiciones residuales ("los demás", "NES", "no expresados ni comprendidos") mientras exista una posición **específica** plausible que no hayas descartado con texto/nota. Si igual usás una residual sin descartar la específica → confianza **MÁXIMA 0.69**.

3. **CORTE DE CONFIANZA < 0.70:** si tu confianza final es menor a 0.70, **NO** la presentes como definitiva → needs_clarification = true (o ambiguous = true en modo evidencia) y formulá **1–3 preguntas técnicas específicas** (composición % en peso, función principal, estado terminado/desmontado, potencia/dimensiones), explicando por qué cada una desempata.

4. **RÚBRICA DE CONFIANZA** (sumá, tope 1.0): coincidencia literal con la descripción legal **+0.40** · confirmada por nota legal/RGI sin contradicción **+0.20** · RGI aplicada sin ambigüedad **+0.20** · datos técnicos completos **+0.10** · exclusiones claras descartadas **+0.10**. Sé honesto: si falta evidencia, la confianza baja.

5. **DEFENDIBLE:** la clasificación tiene que poder defenderse ante un colega despachante citando función principal + RGI + exclusiones. Si no lo es, rehacé el razonamiento.

`;

/** Bloque para classifyWithAI (libre y evidencia): validación de candidatos y confianza. */
export const NCM_CLASSIFIER_PROFESSIONAL_BLOCK = `
=== MODO PROFESIONAL (ECOMEX) ===

1. **Criterio de aceptación:** antes de elegir un NCM, preguntate: **«¿La descripción legal de esta posición describe REALMENTE este producto?»** Si **NO** → descartar ese código (en evidencia: explicar en "discarded" / rationale).

2. **Prioridad de análisis:** función principal → consumo vs industrial → producto final vs parte → uso real. **No** elijas códigos solo por coincidencia de texto.

3. **Filtro de coherencia (wearables / consumo):** PROHIBIDO elegir posiciones de **infraestructura de red**, switches, multiplexores, concentradores, routers de tráfico, centrales, equipos de telecom **industriales** para wearables o dispositivos personales — aunque el buscador los sugiera por palabras.

4. **PCRAM / nomenclador:** la existencia de una posición en base oficial **no** valida sola la clasificación: primero coherencia técnica; la herramienta confirma texto de la posición, no reemplaza el criterio de despachante.

5. **Confianza:** reflejá coherencia técnica y ambigüedad real. **No** confianza alta si hay incoherencia entre producto y descripción legal.

6. **Regla final:** si la elección **no sería defendible** ante un colega despachante por naturaleza del producto → rehacé el razonamiento.

7. **Ambigüedad:** si hay **duda real** entre capítulos/partidas o entre candidatos igualmente plausibles, **obligatorio** pedir al menos **una** pregunta concreta en **missing_info_questions** (modo libre) o **follow_up_questions** (modo evidencia). No marques el caso como aclarado sin ese dato.

`;

/**
 * Esquema JSON de referencia para prompts externos o copiloto (no es el contrato de `classifyWithAI`).
 * La app usa `ncm_code`, `confidence` 0–1, `rationale`, `candidates`, etc.
 */
export const NCM_CLASSIFICATION_STANDALONE_JSON_SPEC = `
Formato JSON de referencia (herramientas / exportación):
{
  "ncm": "XXXXXXXX",
  "confidence": "high | medium | low",
  "justification": "breve, función principal + RGI",
  "chapter": "XX",
  "heading": "XXXX",
  "needs_more_info": true | false,
  "missing_data": [],
  "alternatives": [{ "ncm": "XXXXXXXX", "reason": "solo si ambigüedad real" }]
}
Mapeo sugerido a confidence numérica: high ≥ 0.85, medium ~0.55–0.84, low si duda real.
`;
