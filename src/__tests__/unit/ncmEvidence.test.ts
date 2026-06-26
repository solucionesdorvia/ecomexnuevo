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
    { name: "celular → 8517.13 (HS-2022, smartphones)", text: "celular smartphone android 128gb", includes: "8517.13.00" },
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
    // ── Benchmark Arancely: indumentaria (cap 61/62) ──
    { name: "remera → 6109", text: "remera de algodon", first: "6109.10.00", includes: "6109.10.00" },
    { name: "buzo → 6110", text: "buzo hoodie", first: "6110.20.00", includes: "6110.20.00" },
    { name: "jean → 6203", text: "pantalon jean de hombre", first: "6203.42.00", includes: "6203.42.00" },
    { name: "vestido → 6204", text: "vestido de mujer", first: "6204.42.00", includes: "6204.43.00" },
    { name: "camisa → 6205", text: "camisa de hombre", first: "6205.20.00", includes: "6205.20.00" },
    { name: "ropa interior → 6107", text: "ropa interior boxer", first: "6107.11.00", includes: "6107.11.00" },
    { name: "corpiño → 6212", text: "corpino sosten", first: "6212.10.00", includes: "6212.10.00" },
    { name: "traje de baño → 6211", text: "traje de baño de hombre", first: "6211.11.00", includes: "6211.11.00" },
    { name: "medias → 6115", text: "medias de algodon", first: "6115.95.00", includes: "6115.95.00" },
    { name: "zapatos de cuero → 6403", text: "zapatos de cuero", first: "6403.99.90", includes: "6403.99.90" },
    // ── Juguetes (cap 95) ──
    { name: "lego → 9503.00.97", text: "lego bloques para armar", first: "9503.00.97", includes: "9503.00.97" },
    { name: "muñeca → 9503.00.21", text: "muñeca barbie", first: "9503.00.21", includes: "9503.00.21" },
    { name: "peluche → 9503.00.40", text: "oso de peluche", first: "9503.00.40", includes: "9503.00.40" },
    { name: "pelota fútbol → 9506.62", text: "pelota de futbol", first: "9506.62.00", includes: "9506.62.00" },
    { name: "consola → 9504.50", text: "consola de videojuegos playstation", first: "9504.50.00", includes: "9504.50.00" },
    { name: "rompecabezas → 9503.00.70", text: "rompecabezas puzzle", first: "9503.00.70", includes: "9503.00.70" },
    // ── Electrónica HS-2022 ──
    { name: "tablet → 8471.30", text: "tablet ipad 10 pulgadas", first: "8471.30.12", includes: "8471.30.12" },
    { name: "mouse → 8471.60.53", text: "mouse inalambrico", first: "8471.60.53", includes: "8471.60.53" },
    { name: "teclado → 8471.60.52", text: "teclado mecanico usb", first: "8471.60.52", includes: "8471.60.52" },
    { name: "ssd → 8471.70", text: "disco ssd externo", first: "8471.70.40", includes: "8471.70.40" },
    { name: "drone → 8806", text: "drone con camara profesional", first: "8806.10.00", includes: "8806.10.00" },
    { name: "router → 8517.62", text: "router wifi", first: "8517.62.55", includes: "8517.62.55" },
    { name: "monitor → 8528.52", text: "monitor para pc 24", first: "8528.52.00", includes: "8528.52.00" },
    { name: "cámara fotos → 8525", text: "camara de fotos digital", first: "8525.89.00", includes: "8525.89.00" },
    // ── Cosmética (cap 33) ──
    { name: "maquillaje → 3304.91", text: "maquillaje facial base", first: "3304.91.00", includes: "3304.91.00" },
    { name: "crema facial → 3304.99", text: "crema facial hidratante", first: "3304.99.10", includes: "3304.99.10" },
    { name: "shampoo → 3305.10", text: "shampoo para el cabello", first: "3305.10.00", includes: "3305.10.00" },
    { name: "dentífrico → 3306.10", text: "pasta dental dentifrico", first: "3306.10.00", includes: "3306.10.00" },
    // ── Hogar / bebidas / industria ──
    { name: "silla oficina → 9401", text: "silla de oficina ergonomica", first: "9401.30.00", includes: "9401.30.00" },
    { name: "vajilla cerámica → 6911", text: "vajilla de ceramica porcelana", first: "6911.10.00", includes: "6911.10.00" },
    { name: "olla acero → 7323", text: "olla de acero inoxidable", first: "7323.93.00", includes: "7323.93.00" },
    { name: "vino → 2204", text: "vino tinto", first: "2204.21.00", includes: "2204.21.00" },
    { name: "motor eléctrico → 8501", text: "motor electrico trifasico", first: "8501.52.00", includes: "8501.52.00" },
    { name: "casco moto → 6506 (no 8711)", text: "casco para moto", first: "6506.10.00", includes: "6506.10.00" },
    { name: "batería de auto → 8507", text: "bateria de auto 12v plomo", first: "8507.10.00", includes: "8507.10.00" },
    { name: "cerámico piso → 6907", text: "ceramico para piso porcelanato", first: "6907.21.00", includes: "6907.21.00" },
  ];

  for (const c of CASES) {
    it(c.name, () => {
      const list = codes(c.text);
      expect(list).toContain(c.includes);
      if (c.first) expect(list[0]).toBe(c.first);
    });
  }
});
