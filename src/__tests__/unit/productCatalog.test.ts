import { describe, it, expect } from "vitest";
import { catalogEntryFromProductJson, normalizeProductKey } from "@/lib/ncm/productCatalog";

describe("catalogEntryFromProductJson (Fase 2)", () => {
  it("extrae name + ncm del nivel superior", () => {
    const e = catalogEntryFromProductJson({ title: "Deshidratador de alimentos", ncm: "8419.39.00" });
    expect(e).toEqual({ name: "Deshidratador de alimentos", ncm: "8419.39.00", ncmDescription: null });
  });

  it("cae al ncm en raw si falta arriba, y toma la descripción de PCRAM", () => {
    const e = catalogEntryFromProductJson({
      title: "Auriculares bluetooth",
      raw: { ncm: "8518.30.00", pcram: { title: "Auriculares y audífonos" } },
    });
    expect(e).toEqual({
      name: "Auriculares bluetooth",
      ncm: "8518.30.00",
      ncmDescription: "Auriculares y audífonos",
    });
  });

  it("devuelve null si el NCM no está resuelto (9999.99.99)", () => {
    expect(catalogEntryFromProductJson({ title: "Cosa rara", ncm: "9999.99.99" })).toBeNull();
  });

  it("devuelve null sin título o sin productJson", () => {
    expect(catalogEntryFromProductJson({ ncm: "8419.39.00" })).toBeNull();
    expect(catalogEntryFromProductJson(null)).toBeNull();
  });
});

describe("normalizeProductKey", () => {
  it("minúsculas, sin tildes, sin signos, espacios colapsados", () => {
    expect(normalizeProductKey("  Deshidratador  de  Alimentós! ")).toBe("deshidratador de alimentos");
  });
});
