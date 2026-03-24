/**
 * Seed the local nomenclator with common NCM positions.
 * Run: npx tsx scripts/seed-nomenclator.ts
 */

import { LocalNomenclator } from "../src/lib/nomenclator/localNomenclator";

const POSITIONS: Array<[string, string]> = [
  // Cap 04 - Lácteos
  ["0402.10.10", "Leche en polvo descremada"],
  ["0402.21.10", "Leche en polvo entera, sin azúcar"],
  // Cap 08 - Frutas
  ["0803.90.00", "Bananas frescas"],
  ["0805.10.00", "Naranjas frescas"],
  // Cap 09 - Café, té
  ["0901.11.10", "Café sin tostar, sin descafeinar"],
  ["0901.21.00", "Café tostado sin descafeinar"],
  // Cap 15 - Grasas, aceites
  ["1507.10.00", "Aceite de soja en bruto"],
  ["1512.11.10", "Aceite de girasol en bruto"],
  // Cap 17 - Azúcar
  ["1701.14.00", "Azúcar de caña, en bruto"],
  // Cap 20 - Preparaciones de hortalizas/frutas
  ["2009.11.00", "Jugo de naranja, congelado"],
  // Cap 21 - Preparaciones alimenticias
  ["2106.90.10", "Preparaciones alimenticias diversas"],
  // Cap 22 - Bebidas
  ["2202.10.00", "Agua mineral y gaseosa con azúcar"],
  ["2204.21.00", "Vino tinto en recipientes <= 2 litros"],
  // Cap 25 - Sal, azufre, piedras
  ["2501.00.10", "Sal de mesa"],
  // Cap 27 - Combustibles
  ["2710.12.41", "Nafta para motores"],
  ["2711.11.00", "Gas natural licuado"],
  // Cap 28-29 - Químicos
  ["2836.50.00", "Carbonato de calcio"],
  // Cap 30 - Productos farmacéuticos
  ["3004.90.99", "Medicamentos dosificados para venta al por menor"],
  // Cap 32 - Pinturas
  ["3208.10.10", "Pinturas y barnices a base de poliésteres"],
  ["3209.10.10", "Pinturas y barnices acrílicos dispersos en medio acuoso"],
  // Cap 33 - Perfumería
  ["3304.99.10", "Preparaciones de belleza, maquillaje"],
  ["3305.10.00", "Champús"],
  // Cap 34 - Jabones, detergentes
  ["3401.11.10", "Jabón de tocador"],
  ["3402.20.00", "Detergentes acondicionados para venta al por menor"],
  // Cap 38 - Productos químicos diversos
  ["3808.91.99", "Insecticidas para uso doméstico"],
  // Cap 39 - Plásticos
  ["3917.32.90", "Tubos de plástico sin reforzar"],
  ["3920.10.90", "Placas y láminas de polímeros de etileno"],
  ["3923.10.00", "Cajas, cajones y artículos similares de plástico"],
  ["3923.30.00", "Botellas, frascos y artículos similares de plástico"],
  ["3924.10.00", "Vajilla y artículos de cocina de plástico"],
  ["3926.90.90", "Artículos de plástico, los demás"],
  // Cap 40 - Caucho
  ["4011.10.00", "Neumáticos nuevos para automóviles"],
  ["4011.20.90", "Neumáticos nuevos para autobuses o camiones"],
  // Cap 42 - Artículos de cuero
  ["4202.11.00", "Baúles, maletas (valijas), de cuero"],
  ["4202.22.20", "Bolsos de mano con superficie exterior de plástico"],
  ["4202.92.00", "Fundas, estuches y continentes similares"],
  // Cap 44 - Madera
  ["4410.11.10", "Tableros de partículas de madera"],
  ["4418.20.00", "Puertas y marcos de madera"],
  // Cap 48 - Papel y cartón
  ["4818.10.00", "Papel higiénico"],
  ["4819.10.00", "Cajas de papel o cartón corrugado"],
  ["4820.10.00", "Cuadernos"],
  // Cap 49 - Productos editoriales
  ["4901.99.00", "Libros, folletos e impresos similares"],
  // Cap 52 - Algodón
  ["5209.42.00", "Tejidos de algodón denim (mezclilla)"],
  // Cap 54 - Filamentos sintéticos
  ["5407.61.00", "Tejidos de poliéster"],
  // Cap 55 - Fibras sintéticas discontinuas
  ["5515.11.00", "Tejidos de fibras discontinuas de poliéster"],
  // Cap 61 - Prendas de vestir de punto
  ["6104.62.00", "Pantalones de algodón, de punto, para mujer"],
  ["6105.10.00", "Camisas de algodón, de punto, para hombre"],
  ["6109.10.00", "T-shirts y camisetas interiores de punto, de algodón"],
  ["6109.90.00", "T-shirts de otras materias textiles"],
  ["6110.20.00", "Suéteres (jerseys, pullovers) de algodón"],
  // Cap 62 - Prendas de vestir (no punto)
  ["6203.42.00", "Pantalones de algodón para hombre"],
  ["6204.62.00", "Pantalones de algodón para mujer"],
  ["6205.20.00", "Camisas de algodón para hombre"],
  // Cap 63 - Artículos textiles confeccionados
  ["6302.31.00", "Ropa de cama de algodón"],
  // Cap 64 - Calzado
  ["6402.19.00", "Calzado deportivo con suela de caucho/plástico"],
  ["6403.19.00", "Calzado deportivo con parte superior de cuero"],
  ["6403.99.90", "Calzado con suela de caucho y parte superior de cuero"],
  ["6404.11.00", "Calzado deportivo con suela de caucho y parte superior textil"],
  // Cap 68 - Piedra, cemite
  ["6802.23.00", "Granito tallado"],
  // Cap 69 - Productos cerámicos
  ["6908.90.00", "Baldosas y losas cerámicas esmaltadas"],
  ["6910.10.00", "Fregaderos y lavabos de cerámica"],
  ["6911.10.10", "Vajilla de porcelana"],
  // Cap 70 - Vidrio
  ["7005.29.00", "Vidrio flotado coloreado"],
  ["7010.90.00", "Botellas y frascos de vidrio"],
  // Cap 72 - Hierro y acero
  ["7207.11.10", "Productos semielaborados de hierro, sección transversal cuadrada"],
  ["7210.49.10", "Productos laminados planos de acero galvanizado"],
  ["7213.91.90", "Alambrón de hierro o acero sin alear, circular"],
  ["7216.33.00", "Perfiles H de acero"],
  // Cap 73 - Manufacturas de hierro o acero
  ["7306.30.00", "Tubos soldados de acero, sección circular"],
  ["7308.90.90", "Construcciones y partes de acero"],
  ["7318.15.00", "Tornillos y pernos de acero"],
  ["7321.11.00", "Cocinas de gas para uso doméstico"],
  ["7323.93.00", "Artículos de cocina de acero inoxidable"],
  // Cap 76 - Aluminio
  ["7606.12.90", "Chapas y tiras de aleación de aluminio"],
  ["7610.10.00", "Puertas, ventanas y marcos de aluminio"],
  // Cap 82 - Herramientas
  ["8205.59.00", "Herramientas de mano"],
  // Cap 83 - Manufacturas diversas de metales
  ["8301.30.00", "Cerraduras de metal para muebles"],
  ["8302.41.00", "Guarniciones y artículos similares para edificios"],
  // Cap 84 - Máquinas y aparatos mecánicos
  ["8408.20.10", "Motores diesel para vehículos"],
  ["8413.70.90", "Bombas centrífugas"],
  ["8414.30.19", "Compresores para refrigeración"],
  ["8414.51.90", "Ventiladores de mesa"],
  ["8414.59.90", "Ventiladores industriales"],
  ["8415.10.11", "Acondicionadores de aire de pared, split"],
  ["8415.10.90", "Acondicionadores de aire, los demás"],
  ["8418.10.00", "Combinaciones de refrigerador y congelador"],
  ["8418.21.00", "Refrigeradores de compresión"],
  ["8418.30.00", "Congeladores horizontales tipo arcón"],
  ["8418.40.00", "Congeladores verticales tipo armario"],
  ["8422.11.00", "Lavavajillas domésticos"],
  ["8433.51.00", "Cosechadoras de cereales"],
  ["8443.32.21", "Impresoras láser"],
  ["8443.32.31", "Impresoras de inyección de tinta"],
  ["8450.11.00", "Lavadoras automáticas de capacidad <= 10 kg"],
  ["8450.20.90", "Lavadoras de capacidad > 10 kg"],
  ["8467.21.00", "Taladros eléctricos manuales"],
  ["8471.30.19", "Computadoras portátiles (notebooks)"],
  ["8471.41.90", "Máquinas de tratamiento de datos con CPU y E/S"],
  ["8471.49.00", "Máquinas de tratamiento de datos presentadas en sistema"],
  ["8473.30.49", "Partes y accesorios de máquinas de la 8471"],
  ["8474.20.10", "Trituradoras de piedras y minerales"],
  ["8479.89.99", "Máquinas y aparatos mecánicos diversos"],
  // Cap 85 - Máquinas y aparatos eléctricos
  ["8501.10.19", "Motores eléctricos de potencia <= 37.5 W"],
  ["8501.40.19", "Motores eléctricos de corriente alterna, monofásicos"],
  ["8504.10.00", "Transformadores de dieléctrico líquido"],
  ["8504.31.19", "Otros transformadores, potencia <= 1 kVA"],
  ["8504.40.21", "Rectificadores, potencia <= 750 W (cargadores USB, fuentes)"],
  ["8504.40.22", "Convertidores estáticos, potencia <= 750 W"],
  ["8504.40.29", "Otros convertidores estáticos <= 750 W"],
  ["8504.40.40", "Cargadores de acumuladores eléctricos"],
  ["8506.10.00", "Pilas de dióxido de manganeso"],
  ["8507.60.00", "Acumuladores de iones de litio"],
  ["8509.40.10", "Procesadores de alimentos domésticos"],
  ["8509.80.10", "Aspiradoras domésticas"],
  ["8516.10.00", "Calentadores eléctricos de agua"],
  ["8516.50.00", "Hornos microondas"],
  ["8516.60.00", "Hornos, cocinas y parrillas eléctricas"],
  ["8516.79.90", "Aparatos electrotérmicos domésticos, los demás"],
  ["8517.13.00", "Teléfonos inteligentes (smartphones)"],
  ["8517.62.72", "Aparatos de telecomunicación digital (routers, modems)"],
  ["8518.10.90", "Micrófonos"],
  ["8518.30.00", "Auriculares, cascos y combinaciones de micrófono/altavoz"],
  ["8518.40.00", "Amplificadores eléctricos de audiofrecuencia"],
  ["8519.81.90", "Aparatos de grabación o reproducción de sonido"],
  ["8521.90.90", "Aparatos de videograbación o videorreproducción"],
  ["8523.51.10", "Dispositivos de almacenamiento de datos (USB flash drives)"],
  ["8525.80.19", "Cámaras de televisión, cámaras digitales y videocámaras"],
  ["8527.21.90", "Receptores de radiodifusión para vehículos"],
  ["8528.72.00", "Televisores color, pantalla > 42 cm"],
  ["8528.73.00", "Televisores, los demás, en colores"],
  ["8534.00.00", "Circuitos impresos"],
  ["8536.69.90", "Enchufes y tomas de corriente"],
  ["8536.90.90", "Aparatos para corte/conexión de circuitos eléctricos"],
  ["8539.50.00", "Diodos emisores de luz (LED)"],
  ["8541.40.22", "Células fotovoltaicas (paneles solares)"],
  ["8543.70.99", "Máquinas y aparatos eléctricos diversos"],
  ["8544.42.00", "Conductores eléctricos con conectores (cables USB, HDMI)"],
  ["8544.49.00", "Otros conductores eléctricos"],
  // Cap 87 - Vehículos
  ["8701.20.00", "Tractores de carretera para semirremolques"],
  ["8701.91.00", "Tractores agrícolas, potencia <= 18 kW"],
  ["8701.95.10", "Tractores agrícolas, potencia > 75 kW"],
  ["8703.22.10", "Automóviles con motor de encendido por chispa, 1000-1500 cc"],
  ["8703.23.10", "Automóviles con motor de encendido por chispa, 1500-3000 cc"],
  ["8703.24.10", "Automóviles con motor de encendido por chispa, > 3000 cc"],
  ["8703.32.10", "Automóviles con motor diesel, 1500-2500 cc"],
  ["8703.80.00", "Vehículos con motor eléctrico para transporte de personas"],
  ["8704.21.10", "Vehículos para transporte de mercancías, diesel, PBT <= 5 t"],
  ["8704.21.90", "Camionetas pickup, diesel"],
  ["8704.31.10", "Vehículos para transporte de mercancías, nafta, PBT <= 5 t"],
  ["8708.29.99", "Partes y accesorios de carrocería"],
  ["8708.30.19", "Frenos y sus partes para vehículos"],
  ["8708.50.91", "Ejes con diferencial para vehículos"],
  ["8708.70.90", "Ruedas y sus partes para vehículos"],
  ["8708.80.00", "Amortiguadores de suspensión"],
  ["8708.91.00", "Radiadores para vehículos"],
  ["8708.99.90", "Partes y accesorios de vehículos, los demás"],
  ["8711.20.10", "Motocicletas 50-250 cc"],
  ["8711.20.20", "Motocicletas 250-500 cc"],
  ["8711.50.00", "Motocicletas con motor eléctrico"],
  ["8712.00.10", "Bicicletas"],
  // Cap 90 - Instrumentos ópticos, médicos
  ["9018.90.99", "Instrumentos y aparatos de medicina"],
  ["9027.80.99", "Instrumentos de análisis físicos o químicos"],
  // Cap 94 - Muebles
  ["9401.30.90", "Asientos giratorios de oficina"],
  ["9401.61.00", "Asientos con armazón de madera, tapizados"],
  ["9401.80.00", "Otros asientos"],
  ["9403.10.00", "Muebles metálicos de oficina"],
  ["9403.30.00", "Muebles de madera para oficina"],
  ["9403.40.00", "Muebles de madera para cocina"],
  ["9403.50.00", "Muebles de madera para dormitorio"],
  ["9403.60.00", "Otros muebles de madera"],
  ["9404.21.00", "Colchones de caucho o plástico celular"],
  ["9404.29.00", "Colchones de otras materias"],
  // Cap 95 - Juguetes
  ["9503.00.10", "Triciclos, patinetes, coches de pedal"],
  ["9503.00.29", "Muñecas y sus accesorios"],
  ["9503.00.97", "Juguetes, los demás"],
  ["9504.50.00", "Videoconsolas y máquinas de videojuegos"],
  // Cap 96 - Manufacturas diversas
  ["9603.21.00", "Cepillos de dientes"],
  ["9608.10.00", "Bolígrafos"],
  ["9619.00.00", "Pañales y artículos higiénicos similares"],
];

async function main() {
  const nom = new LocalNomenclator();
  
  console.log(`Seeding ${POSITIONS.length} NCM positions...`);
  
  nom.upsert(
    POSITIONS.map(([code, title]) => ({
      ncmCode: code,
      title,
      breadcrumbs: [
        `Capítulo ${code.slice(0, 2)}`,
        `Partida ${code.slice(0, 4)}`,
        title,
      ],
    }))
  );

  console.log(`Done. Total positions in DB: ${nom.search("", { limit: 50 }).length}+`);
  
  // Test a search
  const results = nom.search("cargador USB");
  console.log("\nTest search 'cargador USB':");
  for (const r of results) {
    console.log(`  ${r.ncmCode} — ${r.title}`);
  }

  const results2 = nom.search("pantalones algodón");
  console.log("\nTest search 'pantalones algodón':");
  for (const r of results2) {
    console.log(`  ${r.ncmCode} — ${r.title}`);
  }
}

main().catch(console.error);
