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
    // Electrónica: el léxico los manda a capítulos errados (celular→cap.21 levadura,
    // notebook→8415 aire). Los seeds + la guarda corregida los rescatan.
    { name: "celular → 8517.12", text: "celular smartphone android 128gb", includes: "8517.12.00" },
    { name: "notebook → 8471.30", text: "notebook laptop gamer 16gb ram", includes: "8471.30.12" },
    { name: "televisor → 8528.72", text: "televisor smart tv led 50 pulgadas", includes: "8528.72.00" },
    // Electrodomésticos y maquinaria de consumo frecuente (el léxico los manda a
    // capítulos absurdos: aire→caucho, lavarropas→ortopedia, motocicleta→cámaras).
    { name: "aire acondicionado → 8415", text: "aire acondicionado split 3000 frigorías", first: "8415.10.11", includes: "8415.10.11" },
    { name: "lavarropas → 8450", text: "lavarropas automático 8kg", first: "8450.11.00", includes: "8450.11.00" },
    { name: "secarropas → 8421", text: "secarropas centrífugo de ropa", first: "8421.12.00", includes: "8421.12.00" },
    { name: "licuadora → 8509", text: "licuadora de vaso 600w", first: "8509.40.10", includes: "8509.40.10" },
    { name: "cafetera → 8516.71", text: "cafetera eléctrica express", first: "8516.71.00", includes: "8516.71.00" },
    { name: "plancha de ropa → 8516.40", text: "plancha de ropa a vapor", first: "8516.40.00", includes: "8516.40.00" },
    { name: "soldadora → 8515", text: "soldadora inverter", first: "8515.31.00", includes: "8515.31.00" },
    { name: "autoelevador → 8427", text: "autoelevador hidráulico 2500kg", first: "8427.20.00", includes: "8427.20.00" },
    { name: "motocicleta → 8711", text: "motocicleta 150cc", first: "8711.20.00", includes: "8711.20.00" },
    { name: "neumático de auto → 4011 (no 8703)", text: "neumático nuevo para automóvil de turismo", first: "4011.10.00", includes: "4011.10.00" },
    { name: "panel solar → 8541", text: "panel solar fotovoltaico 450w", first: "8541.40.00", includes: "8541.40.00" },
    { name: "luminaria LED → 9405", text: "luminaria LED de techo", first: "9405.40.00", includes: "9405.40.00" },
    // Pequeños electrodomésticos térmicos + cuidado personal (léxico → tabaco,
    // energía, cerdas de cerdo, petróleo, etc.).
    { name: "tostadora → 8516.72", text: "tostadora de pan eléctrica", first: "8516.72.00", includes: "8516.72.00" },
    { name: "freidora de aire → 8516.60", text: "freidora de aire 5 litros", first: "8516.60.00", includes: "8516.60.00" },
    { name: "pava eléctrica → 8516.79", text: "pava eléctrica hervidor", first: "8516.79.00", includes: "8516.79.00" },
    { name: "calefactor → 8516.29", text: "calefactor eléctrico de cuarzo", first: "8516.29.00", includes: "8516.29.00" },
    { name: "termotanque → 8516.10", text: "termotanque eléctrico 50 litros", first: "8516.10.00", includes: "8516.10.00" },
    { name: "secador de pelo → 8516.31 (no 8419)", text: "secador de pelo 2000w", first: "8516.31.00", includes: "8516.31.00" },
    { name: "afeitadora → 8510.10", text: "afeitadora eléctrica", first: "8510.10.00", includes: "8510.10.00" },
    { name: "cortapelo → 8510.20", text: "máquina de cortar el pelo", first: "8510.20.00", includes: "8510.20.00" },
    { name: "cepillo dientes eléctrico → 8509.80", text: "cepillo de dientes eléctrico recargable", first: "8509.80.00", includes: "8509.80.00" },
    { name: "cargador de celular → 8504 (no 8517)", text: "cargador de celular usb", first: "8504.40.10", includes: "8504.40.10" },
    { name: "pendrive → 8523.51", text: "pendrive 64gb usb", first: "8523.51.00", includes: "8523.51.00" },
    { name: "motosierra → 8467.81", text: "motosierra a explosión", first: "8467.81.00", includes: "8467.81.00" },
    { name: "cortadora de césped → 8433.11", text: "cortadora de césped eléctrica", first: "8433.11.00", includes: "8433.11.00" },
    // Guard: la pala CARGADORA frontal sigue siendo 8429 (el cargador eléctrico no la secuestra).
    { name: "pala cargadora frontal → 8429", text: "pala cargadora frontal", includes: "8429.51.00" },
  ];

  for (const c of CASES) {
    it(c.name, () => {
      const list = codes(c.text);
      expect(list).toContain(c.includes);
      if (c.first) expect(list[0]).toBe(c.first);
    });
  }
});
