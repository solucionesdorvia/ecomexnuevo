import { describe, it, expect } from "vitest";
import {
  normalizeNumberLike,
  parseUnitPriceUsdWithMode,
  parseQuantityWithMode,
  parseUnitPriceUsdSmart,
  parseQuantitySmart,
  extractUrl,
  looksLikeProductText,
  looksLikeJustNumber,
  looksLikeContact,
  contactChannel,
  isAffirmative,
  hasQuoteSignals,
  cleanProductTitleFromMixedInput,
} from "@/lib/chat/chatParsers";

describe("normalizeNumberLike", () => {
  it("handles european format 1.500,50", () => {
    expect(normalizeNumberLike("1.500,50")).toBe("1500.50");
  });
  it("handles US format 1,500.50", () => {
    expect(normalizeNumberLike("1,500.50")).toBe("1500.50");
  });
  it("handles integer", () => {
    expect(normalizeNumberLike("1500")).toBe("1500");
  });
  it("returns empty for empty input", () => {
    expect(normalizeNumberLike("")).toBe("");
  });
});

describe("parseUnitPriceUsdWithMode", () => {
  it("parses 'USD 120'", () => {
    expect(parseUnitPriceUsdWithMode("USD 120", { allowBareNumber: false })).toBe(120);
  });
  it("parses '$8'", () => {
    expect(parseUnitPriceUsdWithMode("$8", { allowBareNumber: false })).toBe(8);
  });
  it("parses 'us$ 1500'", () => {
    expect(parseUnitPriceUsdWithMode("us$ 1500", { allowBareNumber: false })).toBe(1500);
  });
  it("returns null for bare number without allowBareNumber", () => {
    expect(parseUnitPriceUsdWithMode("120", { allowBareNumber: false })).toBeNull();
  });
  it("parses bare number when allowBareNumber=true", () => {
    expect(parseUnitPriceUsdWithMode("120", { allowBareNumber: true })).toBe(120);
  });
  it("ignores quantity hints as price", () => {
    expect(parseUnitPriceUsdWithMode("500 unidades", { allowBareNumber: false })).toBeNull();
  });
  it("parses message with price and quantity - picks price", () => {
    const result = parseUnitPriceUsdWithMode("100 unidades a USD 15", { allowBareNumber: false });
    expect(result).toBe(15);
  });
  it("handles european price format '1.500,50 usd'", () => {
    const result = parseUnitPriceUsdWithMode("1.500,50 usd", { allowBareNumber: false });
    expect(result).toBe(1500.5);
  });
});

describe("parseQuantityWithMode", () => {
  it("parses '100 unidades'", () => {
    expect(parseQuantityWithMode("100 unidades", { allowBareNumber: false })).toBe(100);
  });
  it("parses 'x 500'", () => {
    expect(parseQuantityWithMode("x 500", { allowBareNumber: false })).toBe(500);
  });
  it("parses 'cantidad 50'", () => {
    expect(parseQuantityWithMode("cantidad 50", { allowBareNumber: false })).toBe(50);
  });
  it("returns null for bare number without allowBareNumber", () => {
    expect(parseQuantityWithMode("100", { allowBareNumber: false })).toBeNull();
  });
  it("does not parse USD price as quantity", () => {
    expect(parseQuantityWithMode("USD 120", { allowBareNumber: false })).toBeNull();
  });
  it("parses '50 pcs'", () => {
    expect(parseQuantityWithMode("50 pcs", { allowBareNumber: false })).toBe(50);
  });
});

describe("parseUnitPriceUsdSmart", () => {
  it("accepts bare number when price trigger present", () => {
    expect(parseUnitPriceUsdSmart("precio 150")).toBe(150);
  });
  it("returns null for ambiguous number without context", () => {
    expect(parseUnitPriceUsdSmart("150")).toBeNull();
  });
  it("always parses explicit USD signal", () => {
    expect(parseUnitPriceUsdSmart("USD 200")).toBe(200);
  });
});

describe("parseQuantitySmart", () => {
  it("returns quantity with explicit unit", () => {
    expect(parseQuantitySmart("quiero 200 unidades")).toBe(200);
  });
  it("returns null for ambiguous number", () => {
    expect(parseQuantitySmart("150")).toBeNull();
  });
});

describe("extractUrl", () => {
  it("extracts https URL", () => {
    expect(extractUrl("mirá este https://www.alibaba.com/product/123")).toBe(
      "https://www.alibaba.com/product/123"
    );
  });
  it("returns null for plain text", () => {
    expect(extractUrl("quiero importar auriculares")).toBeNull();
  });
  it("extracts bare domain with path", () => {
    expect(extractUrl("spanish.alibaba.com/product-detail/widget_123.html")).toBeTruthy();
  });
  it("returns null for just a domain (no path)", () => {
    expect(extractUrl("alibaba.com")).toBeNull();
  });
});

describe("looksLikeProductText", () => {
  it("returns true for product description", () => {
    expect(looksLikeProductText("auriculares bluetooth inalambricos")).toBe(true);
  });
  it("returns false for just a number", () => {
    expect(looksLikeProductText("500")).toBe(false);
  });
  it("returns false for just USD price", () => {
    expect(looksLikeProductText("USD 120")).toBe(false);
  });
  it("returns true for product with price mixed in", () => {
    expect(looksLikeProductText("smartwatch USD 15 importar")).toBe(true);
  });
});

describe("looksLikeJustNumber", () => {
  it("returns true for plain number", () => {
    expect(looksLikeJustNumber("500")).toBe(true);
  });
  it("returns false for text", () => {
    expect(looksLikeJustNumber("auriculares")).toBe(false);
  });
  it("returns true for number with decimal", () => {
    expect(looksLikeJustNumber("1.500,50")).toBe(true);
  });
});

describe("looksLikeContact", () => {
  it("detects email", () => {
    expect(looksLikeContact("usuario@empresa.com")).toBe(true);
  });
  it("detects phone number", () => {
    expect(looksLikeContact("+54 9 11 1234 5678")).toBe(true);
  });
  it("returns false for product description", () => {
    expect(looksLikeContact("quiero importar auriculares")).toBe(false);
  });
});

describe("contactChannel", () => {
  it("returns email for email address", () => {
    expect(contactChannel("user@test.com")).toBe("email");
  });
  it("returns whatsapp for phone number", () => {
    expect(contactChannel("+541112345678")).toBe("whatsapp");
  });
});

describe("isAffirmative", () => {
  it("detects sí", () => {
    expect(isAffirmative("sí, quiero avanzar")).toBe(true);
  });
  it("detects dale", () => {
    expect(isAffirmative("dale")).toBe(true);
  });
  it("detects quiero avanzar", () => {
    expect(isAffirmative("quiero avanzar con la importación")).toBe(true);
  });
  it("returns false for negative", () => {
    expect(isAffirmative("no gracias")).toBe(false);
  });
});

describe("hasQuoteSignals", () => {
  it("returns true when assistant mentioned total", () => {
    expect(
      hasQuoteSignals([
        { role: "assistant", content: "Total puesto en Argentina: $5000" },
      ])
    ).toBe(true);
  });
  it("returns false when no quote shown", () => {
    expect(
      hasQuoteSignals([
        { role: "user", content: "quiero importar algo" },
        { role: "assistant", content: "¿Cuál es el precio?" },
      ])
    ).toBe(false);
  });
});

describe("cleanProductTitleFromMixedInput", () => {
  it("removes lead-in phrase", () => {
    const result = cleanProductTitleFromMixedInput("quiero importar auriculares bluetooth");
    expect(result).toBe("auriculares bluetooth");
  });
  it("removes price fragment", () => {
    const result = cleanProductTitleFromMixedInput("smartwatch USD 15");
    expect(result.toLowerCase()).not.toContain("usd");
    expect(result.toLowerCase()).not.toContain("15");
  });
  it("removes quantity fragment", () => {
    const result = cleanProductTitleFromMixedInput("100 unidades de zapatillas deportivas");
    expect(result.toLowerCase()).not.toContain("100 unidades");
    expect(result.toLowerCase()).toContain("zapatillas");
  });
  it("removes NCM code from title", () => {
    const result = cleanProductTitleFromMixedInput("auriculares 8518.30.00 bluetooth");
    expect(result).not.toContain("8518.30.00");
  });
});
