export type CatalogStudioGroup =
  | "manifest"
  | "core"
  | "pharmacy"
  | "vehicles"
  | "schemas";

export interface CatalogStudioFile {
  path: string;
  group: CatalogStudioGroup;
  content: string;
  hash: string;
  readOnly: boolean;
  itemKey: "items" | "mappings" | null;
  itemCount: number;
}

export interface CatalogStudioImage {
  path: string;
  publicUrl: string;
  root: "mainCategories" | "subcategories" | "pharmacy" | "vehicles";
  size: number;
  hash: string;
  references: string[];
}

export interface CatalogStudioRelation {
  kind:
    | "parent"
    | "collection-member"
    | "form"
    | "strength"
    | "option-file"
    | "database-column";
  from: string;
  to: string;
  label: string;
}

export interface CatalogStudioAuditEntry {
  at: string;
  action:
    | "save"
    | "upload-image"
    | "replace-image"
    | "trash-image"
    | "rollback-recovery";
  files: string[];
  details: string;
  recoveryPath?: string;
}

export interface CatalogStudioStats {
  schemaVersion: number;
  catalogVersion: string;
  dataFiles: number;
  schemaFiles: number;
  items: number;
  hiddenItems: number;
  images: number;
  referencedImages: number;
  unreferencedImages: number;
  specialtyMappings: number;
  specialtyColumns: number;
}

export interface CatalogStudioSnapshot {
  revision: string;
  files: CatalogStudioFile[];
  images: CatalogStudioImage[];
  relations: CatalogStudioRelation[];
  audit: CatalogStudioAuditEntry[];
  stats: CatalogStudioStats;
  validation: {
    valid: boolean;
    output: string;
  };
}

export interface CatalogStudioDraftFile {
  path: string;
  content: string;
  baseHash: string;
}

export interface CatalogStudioValidateInput {
  files: CatalogStudioDraftFile[];
}

export interface CatalogStudioValidationResult {
  valid: boolean;
  output: string;
  changedFiles: string[];
}

export interface CatalogStudioSaveResult extends CatalogStudioValidationResult {
  saved: boolean;
  revision: string;
  auditEntry: CatalogStudioAuditEntry;
}

export type CatalogStudioImageRoot = CatalogStudioImage["root"];
