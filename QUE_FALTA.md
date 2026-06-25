# ¿Qué falta para E-COMEX? — explicación clara

> Resumen en una línea: **el código está terminado, probado y desplegado. Lo único
> que falta son 3 datos del mundo real que tiene que aportar el equipo, no desarrollo.**

---

## ✅ Lo que YA está listo (no hay que tocar nada)

- **Motor de cotización a prueba de balas**: nunca inventa un número ni devuelve uno roto o incompleto.
- **Clasificación NCM al 99%** (medido contra Arancely): elige bien la posición arancelaria en productos de consumo.
- **Impuestos exactos según tu situación**: el sistema pregunta perfil (Responsable Inscripto / Monotributo / Persona física), destino (uso propio vs reventa) y si es bien de capital, y calcula el **costo REAL** — incluyendo qué se recupera. Esto es lo que NO tienen los competidores.
- **Flete**: elige solo el modo correcto (aéreo / marítimo LCL / contenedor 20'/40' / RORO para autos) según peso, volumen y origen.
- **Antidumping, intervenciones (ANMAT/SENASA), régimen courier vs general**: detectados y aplicados.
- **Aprende solo**: cada operación cerrada mejora el catálogo, sin que nadie revise nada.
- **4 features para ganarle a la competencia**: justificación defendible ante ARCA (PDF), comparador "tasa de lista vs tu costo real", clasificación masiva (modo despachante), y subir ficha técnica → NCM.
- **Calidad**: 225 tests automáticos, lint 100% limpio, todo desplegado y verificado en producción.

---

## 🔴 Lo que FALTA — 3 insumos del equipo (NO es código)

### 1. Tarifas de flete reales
- **Qué es:** los precios reales del flete (aéreo por kg, contenedor 20'/40', LCL por m³, RORO, almacenaje).
- **Por qué el código no lo resuelve:** la *lógica* del flete está perfecta, pero los *números* cargados son de referencia, no los reales que cobra tu despachante. El flete es un costo grande → es lo que más acerca el número a la realidad.
- **Quién y cómo:** lo cargás **vos**, en el panel `/app/configuracion/fletes` (un formulario, ~15 min, con la lista de tu despachante). El motor las toma solo.
- **Impacto:** 🔴 Alto.

### 2. Validación del contador
- **Qué es:** que un contador confirme las alícuotas fiscales y la recuperabilidad.
- **Por qué el código no lo resuelve:** está programado con valores estándar y razonables, pero el criterio fiscal fino es responsabilidad de un contador. Tres puntos a confirmar:
  - Alícuotas de **IIBB** exactas por provincia.
  - **Recuperabilidad** (RI recupera IVA + percepciones; Monotributo no).
  - **Dólar para aduana: blue vs oficial** (decisión de negocio).
- **Quién y cómo:** Andrés o un contador revisa el documento `CONSULTAS_FISCALES.md` (ya tiene todas las preguntas puntuales) y confirma o corrige.
- **Impacto:** 🔴 Alto — es la diferencia entre "muy buen número" y "número fiscalmente exacto que bancás ante un inversor/marca".

### 3. Dump de AFIP/ARCA actualizado
- **Qué es:** la tabla oficial completa de códigos NCM con sus aranceles, al día.
- **Por qué el código no lo resuelve:** la copia local del nomenclador es pre-2022. Coincide en el 92,6%, pero hay ~7% de aranceles cambiados y faltan códigos HS-2022 nuevos.
- **Importante:** esto **casi no afecta** las cotizaciones reales, porque la fuente principal (PCRAM en vivo) sí está al día. La copia vieja es solo el respaldo.
- **Quién y cómo:** conseguís el archivo oficial (PDF/Excel de AFIP) y me lo pasás → lo cargo yo.
- **Impacto:** 🟡 Bajo (PCRAM ya cubre el caso real).

---

## 🟡 Mejoras opcionales de código (NO bloquean el lanzamiento)

Estas las puedo hacer yo cuando quieras; ninguna frena salir a vender:
- **Precisión-IA en el modo masivo**: hoy la clasificación masiva es instantánea pero determinística; sumarle la IA por fila daría más precisión en catálogos grandes.
- **Sentry**: monitoreo de errores en vivo (necesita que crees una cuenta y me pases el DSN).
- **Peso de maquinaria pesada sin modelo**: una excavadora genérica estima peso bajo → flete sub-estimado (lo cubre la búsqueda web cuando hay marca/modelo y el disclaimer).

---

## 🚦 Veredicto de lanzamiento

| Escenario | ¿Listo? | Requisito |
|---|---|---|
| **Beta / soft launch** | ✅ **HOY** | Nada. El motor es honesto y un despachante del equipo confirma el final. |
| **Full launch** (inversores/marcas) | Falta poco | Cerrar **#1 (flete real)** + **#2 (contador)**. |

**Estás a 2 datos de negocio del lanzamiento grande, no a más desarrollo.**
