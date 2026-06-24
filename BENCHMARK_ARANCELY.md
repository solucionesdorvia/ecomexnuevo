# Benchmark E-COMEX vs Arancely — clasificación NCM e impuestos

Comparación de E-COMEX contra **Arancely** (arancely.com), referencia externa con IA,
**10.330 posiciones NCM, datos vigentes 2026-03-13**. Reproducible con:

```
curl -s "https://www.arancely.com/api/ncm?v=1" -o /tmp/bench/arancely.json
npx tsx scripts/benchmark/run.ts
```

> Nota metodológica: Arancely también es una herramienta con IA; es una referencia
> fuerte, no verdad absoluta. En varios casos E-COMEX está **mejor** que el match de
> Arancely (ej. "cámara de seguridad" → Arancely la lleva a "cajas de caudales";
> "anteojos" → "valijas"). Lo que se mide acá es la capa determinística de evidencia
> de E-COMEX (semillas + búsqueda léxica), que es la base sobre la que decide la IA.

---

## Resultado

### Parte A — Impuestos (DIE)
El índice arancelario **offline** de E-COMEX coincide con Arancely en el **92,6%** del
DIE (7.771 de 8.392 posiciones comunes). El 7,4% que difiere es por **desactualización**:
el índice offline es **pre-HS-2022** y Arancely está al 2026. Ejemplos:
- Juguetes 9503.xx: offline **35%** vs vigente **20%** (reforma de aranceles).
- Peluche 9503.00.40: offline 35% vs **0%**.
- Pelota de fútbol 9506.62: 35% vs 20%.
- Tractores oruga 8701.30: 2% vs 14%.

**Mitigación:** la fuente PRIMARIA de E-COMEX es **PCRAM en vivo** (vigente); el offline
es respaldo. Aun así conviene refrescar el índice con el **dump AFIP** (dep. de negocio).

### Parte B — Clasificación NCM (91 productos de consumo)
Evolución mientras se corregía:

| Hito | Exacto (8 díg) | Partida o mejor (4 díg) | MISS (capítulo errado) |
|------|----------------|--------------------------|------------------------|
| Inicial | ~15–25% | ~51% | muchos |
| Tras seeds indumentaria/juguetes/electrónica | 64% | 84% | 12 |
| **Final** | **78%** | **99%** | **0** |

La única divergencia restante es "pintura látex" → E-COMEX 3208.10 vs Arancely 3209.10
(mismo capítulo 32; al solvente vs al agua — ambiguo real, lo resuelve la ficha técnica).

---

## Qué fallaba y qué se arregló

**Hallazgo macro:** las semillas y el índice offline estaban en **nomenclatura vieja**
y faltaban categorías enteras de consumo. Se corrigió:

1. **Bug del largo mínimo:** `buildNcmKnowledgeEvidence` descartaba queries < 8 caracteres
   → "jean", "lego", "mouse" no disparaban ni su semilla. Bajado a 4.
2. **Indumentaria (cap 61/62):** se sembraron remera, buzo, jean/pantalón, vestido,
   camisa, ropa interior, corpiño, medias, pollera, traje, traje de baño, gorra, guantes.
   Antes caían vacías o a capítulos absurdos.
3. **Juguetes (cap 95):** lego, muñeca, peluche, pelota, rompecabezas, consola de
   videojuegos (DI 20% vigente, el offline tenía 35%).
4. **Electrónica HS-2022:** tablet, mouse, teclado, disco SSD, drone (8806, partida nueva),
   router, monitor de PC, cámara de fotos.
5. **Cosmética (cap 33):** maquillaje, crema facial, shampoo, protector solar, dentífrico.
6. **Hogar/industria:** silla y muebles, colchón, sábanas/toallas, vajilla de cerámica,
   ollas de acero, cerámico/porcelanato, motor eléctrico, grupo electrógeno, vino/cerveza/
   licores, batería de auto, casco de moto, anteojos de sol, reloj/smartwatch.
7. **Guards anti-falso-amigo:** casco/guantes/batería de "moto" o "auto" ya no clasifican
   como la moto/el auto entero; "neumático" sin contexto va a 4011.

Todo blindado con **36 casos de regresión nuevos** (184 tests unitarios en total).

---

## Lo que sigue (no bloqueante)
- **Refrescar el índice offline** con el dump AFIP vigente (cierra el 7,4% de DIE stale +
  códigos faltantes). Es dep. de negocio.
- Algunas semillas usan códigos HS-2022 que el índice offline (viejo) no tiene; **PCRAM
  vivo los resuelve** al cotizar. Con el dump fresco quedarían también offline.
