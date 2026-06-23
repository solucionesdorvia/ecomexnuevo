import { describe, it, expect } from "vitest";
import { buildNcmKnowledgeEvidence } from "@/lib/ncm/knowledge/ncmKnowledgeEvidence";

/** Códigos NCM (8 díg.) que la evidencia de dominio propone para un texto. */
function codes(text: string): string[] {
  const ev = buildNcmKnowledgeEvidence(text);
  return (ev?.candidates ?? []).map((c) => c.ncm_code);
}

/**
 * Regresión de clasificación (Fase 3.2). Casos "trampa": el nombre comercial NO
 * coincide con el texto del nomenclador, así que sin semillas de dominio el motor
 * clasificaría mal o caería a tentativo. Esta suite garantiza que el candidato
 * correcto SIEMPRE esté presente — es la red de seguridad de "no romper el buscador".
 *
 * Determinística: solo lee data/ncm/index.json (sin IA ni red).
 */
describe("buildNcmKnowledgeEvidence — regresión de clasificación", () => {
  const CASES: Array<{ name: string; text: string; first?: string; includes: string }> = [
    {
      name: "deshidratador doméstico → 8419.39 primero (no subcotizar al 14%)",
      text: "deshidratador de alimentos doméstico de mesada para frutas y verduras",
      first: "8419.39.00",
      includes: "8419.39.00",
    },
    {
      name: "secadero industrial de granos → 8419.31 primero",
      text: "secadero industrial de granos y cereales para el campo",
      first: "8419.31.00",
      includes: "8419.31.00",
    },
    { name: "excavadora → 8429", text: "excavadora hidráulica sobre orugas", includes: "8429.52.00" },
    { name: "automóvil de pasajeros → 8703", text: "automóvil sedán de pasajeros a nafta", includes: "8703.23.10" },
    { name: "zapatillas → 64", text: "zapatillas deportivas sneakers para correr", includes: "6404.11.00" },
    { name: "heladera → 8418", text: "heladera refrigerador doméstico con freezer", includes: "8418.21.00" },
    { name: "bomba de agua → 8413", text: "bomba centrífuga para agua de riego", includes: "8413.70.90" },
    { name: "perfume → 3303", text: "perfume fragancia eau de parfum 100ml", includes: "3303.00.20" },
    { name: "bicicleta sin motor → 8712", text: "bicicleta mountain bike rodado 29 sin motor", includes: "8712.00.10" },
    { name: "taladro → 8467", text: "taladro percutor eléctrico de mano", includes: "8467.21.00" },
    { name: "microondas → 8516.50", text: "horno de microondas digital 20 litros", includes: "8516.50.00" },
    { name: "campera → 62", text: "campera rompeviento de hombre de fibra sintética", includes: "6201.40.00" },
  ];

  for (const c of CASES) {
    it(c.name, () => {
      const list = codes(c.text);
      expect(list).toContain(c.includes);
      if (c.first) expect(list[0]).toBe(c.first);
    });
  }
});
