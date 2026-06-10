# Consultas fiscales — Motor de cotización E-COMEX

> Preguntas para el contador/asesor fiscal. Las respuestas se usan para codificar
> dos piezas del cotizador que hoy están pendientes de validación:
> **(A) recuperabilidad de impuestos por perfil** (Fase 1) y
> **(B) tratamiento impositivo del régimen Courier vs General** (Fase 2).
>
> Contexto: el cotizador estima el **costo real puesto en Argentina** de importar un
> producto. Hoy suma TODOS los tributos como costo y cotiza siempre como importación
> general. Necesitamos saber qué se recupera y cómo cambia el cálculo según el régimen.
>
> Tributos que el motor calcula hoy sobre la base CIF + seguro:
> Derechos de Importación (DI), Tasa de Estadística (TE 3%), IVA (21%),
> IVA Adicional/Percepción (20%), Percepción de Ganancias, Percepción de IIBB,
> Impuestos Internos (cuando aplican por NCM).

---

## Bloque A — Recuperabilidad por perfil del importador (Fase 1)

Para cada **perfil fiscal**, ¿qué tributos de importación son **recuperables**
(crédito fiscal / pago a cuenta) y cuáles son **costo definitivo**?

Perfiles a contemplar: **Responsable Inscripto · Monotributo · Persona Física (no inscripta) · Sociedad · Organismo Público**.

1. **IVA (21%)**: ¿es crédito fiscal computable para Responsable Inscripto? ¿Es costo para Monotributo y Persona Física?
2. **IVA Adicional / Percepción (20%)**: ¿recuperable (a cuenta de IVA) para RI? ¿costo para los demás?
3. **Percepción de Ganancias**: ¿pago a cuenta del impuesto a las Ganancias (recuperable) o costo? ¿Depende del perfil?
4. **Percepción de IIBB**: ¿pago a cuenta según jurisdicción donde está inscripto? ¿Costo si no está inscripto en esa provincia?
5. **Derechos de Importación (DI)**: ¿es siempre costo, en todos los perfiles?
6. **Tasa de Estadística (TE)**: ¿siempre costo?
7. **Impuestos Internos**: ¿siempre costo?
8. ¿Hay algún tributo adicional que estemos omitiendo y que impacte el costo real?

**Formato ideal de respuesta** (para codificar directo): una tabla
`tributo × perfil → "recuperable" | "costo"`. Ej:

| Tributo | Resp. Inscripto | Monotributo | Persona Física |
|---|---|---|---|
| IVA 21% | ¿? | ¿? | ¿? |
| IVA Adic. 20% | ¿? | ¿? | ¿? |
| Perc. Ganancias | ¿? | ¿? | ¿? |
| Perc. IIBB | ¿? | ¿? | ¿? |
| Derechos (DI) | ¿? | ¿? | ¿? |
| Tasa Estadística | ¿? | ¿? | ¿? |
| Imp. Internos | ¿? | ¿? | ¿? |

9. ¿Las percepciones (IVA adic., Ganancias, IIBB) **aplican en el momento de nacionalizar** (impacto de caja) aunque después se recuperen? Queremos mostrar "desembolso en aduana" vs "costo real final".

---

## Bloque B — Régimen Courier vs Importación General (Fase 2)

El motor ya **detecta** si la operación entra en Courier (envíos de entrega rápida):
FOB ≤ USD 3.000, peso ≤ 50 kg y sin intervención de organismos. Falta saber cómo
cambia el **tratamiento impositivo y de costos** vs la importación general.

1. Bajo el régimen **Courier / PSP** para una importación **comercial** (para reventa), ¿qué tributos se pagan? ¿Son los mismos que en general (DI + TE + IVA + IVA adic. + percepciones) o hay diferencias?
2. ¿El Courier paga **Tasa de Estadística**? ¿Y **Derechos de Importación**? ¿Cambia alguna alícuota?
3. ¿Existe un **tratamiento simplificado** o arancel único en Courier, o se liquidan los mismos tributos que en general?
4. ¿Hay **franquicias / mínimos no imponibles** (ej. primeros USD X exentos) en el régimen courier?
5. **Costos operativos**: ¿el régimen Courier **requiere despachante de aduana**, o el operador courier hace el despacho? ¿Cuál es el costo típico del servicio courier vs los honorarios de despachante (hoy modelamos 1% FOB, mín. USD 300)?
6. **Límites y condiciones**: confirmar el tope de **USD 3.000** y **50 kg** por envío. ¿Hay límite de **cantidad de unidades**? ¿Alguna restricción específica para importación **comercial / reventa** por courier?
7. ¿Qué productos/NCM están **excluidos** del courier además de los que requieren intervención de organismos (ANMAT, SENASA, etc.)?
8. ¿La recuperabilidad del Bloque A es **igual** en Courier que en general, o cambia?

**Formato ideal de respuesta**: para cada tributo/costo, qué pasa en Courier vs General
(igual / no aplica / alícuota distinta / monto fijo), y el costo operativo típico del courier.

---

## Bloque C — Beneficios fiscales (Fase 4, a futuro)

Cuando haya tiempo, también necesitaremos cómo modifican el cálculo los beneficios
que ya capturamos en el perfil del importador: **TdF, Bien de Capital, RIGI, Minería, Energía**.
(Ej.: TdF exime tributos, Bien de Capital reduce DI, etc.) — no es urgente, pero dejamos la pregunta abierta.

---

_Una vez con las respuestas, se codifican: (A) tabla de recuperabilidad → 3 totales
(costo real / recuperable / desembolso en aduana); (B) ajuste impositivo por régimen Courier._
