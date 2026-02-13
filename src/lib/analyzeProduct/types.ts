export type SupportedSource = "alibaba" | "1688" | "amazon";

export type Price =
  | {
      type: "single";
      min: number;
      max: null;
      currency: string;
      unit: string;
    }
  | {
      type: "range";
      min: number;
      max: number;
      currency: string;
      unit: string;
    }
  | {
      type: "unknown";
      min: null;
      max: null;
      currency: "";
      unit: "";
    };

export type ExtractedText = {
  title?: string;
  rawDescription?: string;
  bullets?: string[];
  specs?: Array<{ label: string; value: string }>;
};

export type ExtractedPriceCandidate = {
  text: string;
  hintCurrency?: string;
  hintUnit?: string;
  source: "jsonld" | "meta" | "dom" | "regex";
};

export type ExtractedProduct = {
  title?: string;
  raw_description: string;
  normalized_description: string;
  price: Price;
  images: string[];
};

export type AnalyzeProductOutput = {
  source: SupportedSource;
  url: string;
  product: ExtractedProduct;
  classification: {
    ncm: string;
    confidence: number;
    candidates: Array<{ ncmCode: string; title?: string }>;
  };
};

