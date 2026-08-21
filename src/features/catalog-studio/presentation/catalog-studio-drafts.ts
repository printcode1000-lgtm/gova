import { CATALOG_STUDIO_DRAFT_KEY } from "../config";

export interface StoredCatalogStudioDraft {
  revision: string;
  files: Record<string, string>;
}

export function readCatalogStudioDraft(): StoredCatalogStudioDraft | null {
  const stored = sessionStorage.getItem(CATALOG_STUDIO_DRAFT_KEY);
  if (!stored) return null;
  return JSON.parse(stored) as StoredCatalogStudioDraft;
}

export function writeCatalogStudioDraft(draft: StoredCatalogStudioDraft): void {
  sessionStorage.setItem(CATALOG_STUDIO_DRAFT_KEY, JSON.stringify(draft));
}

export function clearCatalogStudioDraft(): void {
  sessionStorage.removeItem(CATALOG_STUDIO_DRAFT_KEY);
}
