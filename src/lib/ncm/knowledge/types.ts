/** Un capítulo NCM (HS) parseado desde PDF/HTML oficial. */
export type NcmChapterHeading = {
  /** Partida HS a 4 dígitos, ej. "0101" */
  code: string;
  description: string;
  subheadings: NcmSubheading[];
};

export type NcmSubheading = {
  /** Código con puntos (6 u 8 dígitos legales) */
  code: string;
  description: string;
};

export type NcmChapterJson = {
  chapter: string;
  title: string;
  sectionTitle?: string;
  headings: NcmChapterHeading[];
  /** Filas crudas (auditoría / re-parseo) — opcional en artefactos finales */
  _rowCount?: number;
};

/** Registro plano para búsqueda (índice). */
export type NcmKnowledgeRecord = {
  id: string;
  chapter: string;
  chapterTitle: string;
  headingCode: string;
  /** NCM normalizado 8 dígitos o código mostrado */
  code: string;
  codeDigits: string;
  description: string;
  /** Texto para BM25 / Fuse */
  searchText: string;
  level: "heading" | "subheading";
};

export type NcmSearchHit = {
  code: string;
  description: string;
  chapter: string;
  chapterTitle: string;
  headingCode: string;
  score: number;
  matchedTerms: string[];
  level: "heading" | "subheading";
};
