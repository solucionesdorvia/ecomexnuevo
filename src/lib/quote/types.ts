export type ScrapeResult = {
  title: string;
  description: string;
  images: string[];
  sourceUrl: string;
  currency: "USD" | "CNY";
  unitPrice: number;
  supplier: string;
  originCountry: string;
};

export type NcmCandidate = {
  ncm: string;
  label: string;
  confidence: number;
};

export type NcmResult = {
  ncm: string;
  confidence: number;
  candidates: NcmCandidate[];
};

export type RegulationItem = {
  id: string;
  title: string;
  status: "required" | "recommended" | "review";
};

export type QuoteCost = {
  quantity: number;
  fobUsd: number;
  freightUsd: number;
  insuranceUsd: number;
  importDutyUsd: number;
  estadisticaUsd: number;
  ivaUsd: number;
  dispatchFeesUsd: number;
  inlandLogisticsUsd: number;
  bankFeesUsd: number;
  totalUsd: number;
};

export type TimingLogistics = {
  etaRangeDays: [number, number];
  route: string;
  riskLevel: "low" | "medium" | "high";
  riskNotes: string[];
  nextShipmentDate: string;
  containerOccupancy: number;
};

export type AnalysisModuleKey =
  | "product"
  | "description"
  | "ncm"
  | "regulations"
  | "costs"
  | "timing"
  | "report";

export type QuoteStatus = "draft" | "verified" | "sent";

export type Quote = {
  id: string;
  createdAt: string;
  status: QuoteStatus;
  rubro: string;
  customer: string;
  scrape: ScrapeResult;
  normalizedDescription: string;
  ncm: NcmResult;
  regulations: RegulationItem[];
  costs: QuoteCost;
  timing: TimingLogistics;
  reportSummary: string;
};

