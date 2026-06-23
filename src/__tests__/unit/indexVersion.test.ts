import { describe, it, expect } from "vitest";
import { getNcmIndexVersion, isNcmIndexStale } from "@/lib/ncm/indexVersion";

describe("indexVersion (Fase 5)", () => {
  it("lee data/ncm/version.json con registros y checksum", () => {
    const v = getNcmIndexVersion();
    expect(v).toBeTruthy();
    expect(typeof v?.records).toBe("number");
    expect((v?.records ?? 0)).toBeGreaterThan(1000);
    expect(typeof v?.checksum).toBe("string");
  });

  it("el índice actual no está marcado como viejo (<12 meses)", () => {
    expect(isNcmIndexStale(12)).toBe(false);
  });

  it("marca viejo cuando supera el umbral de antigüedad", () => {
    // El índice se generó 2026-04; con un 'ahora' de 2030 supera los 12 meses.
    expect(isNcmIndexStale(12, Date.parse("2030-01-01"))).toBe(true);
  });
});
