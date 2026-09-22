export const LEGAL_VERSIONS = {
  terms: "2026-09-22",
  privacy: "2026-09-22",
  safety: "2026-09-22",
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const LEGAL_DOCUMENTS = [
  { type: "terms", version: LEGAL_VERSIONS.terms, title: "使用條款" },
  { type: "privacy", version: LEGAL_VERSIONS.privacy, title: "隱私權政策" },
  { type: "safety", version: LEGAL_VERSIONS.safety, title: "安全與反詐騙規範" },
] as const;
