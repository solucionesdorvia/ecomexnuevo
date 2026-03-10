export type QuoteCard = {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
};

export type QuoteBreakdown = {
  qty?: number;
  totalMinUsd?: number;
  totalMaxUsd?: number;
  fobTotalUsd?: number;
  fleteMinUsd?: number;
  fleteMaxUsd?: number;
  seguroMinUsd?: number;
  seguroMaxUsd?: number;
  impuestosTotalMinUsd?: number;
  impuestosTotalMaxUsd?: number;
  gestionMinUsd?: number;
  gestionMaxUsd?: number;
  [k: string]: unknown;
};

export type AnalysisResponse = {
  assistantMessage?: string;
  cards?: QuoteCard[];
  productPreview?: {
    title?: string;
    imageUrl?: string;
    imageUrls?: string[];
    sourceUrl?: string;
    fobUsd?: number;
    currency?: string;
    price?: {
      type?: string;
      min?: number | null;
      max?: number | null;
      currency?: string;
      unit?: string;
    };
    quantity?: number;
    origin?: string;
    supplier?: string;
    category?: string;
  };
  ncm?: string;
  breakdown?: QuoteBreakdown;
  analysis?: {
    stage?: string;
    normalizedTitle?: string;
    ncm?: string;
    ncmMeta?: { source?: string; confidence?: number | null; ambiguous?: boolean };
    pcram?: {
      title?: string;
      breadcrumbs?: string[];
      unit?: string;
      interventions?: string[];
      reclassifications?: Array<{ label: string; href: string }>;
    };
    timing?: { route?: string; minDays?: number; maxDays?: number };
    totals?: { totalMinUsd?: number; totalMaxUsd?: number };
    flags?: string[];
    questions?: string[];
  };
  requestContact?: boolean;
};
