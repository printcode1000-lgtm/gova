import type { CatalogStudioGroup } from "../domain/catalog-studio.types";

export type StudioSection =
  | "overview"
  | "core"
  | "pharmacy"
  | "vehicles"
  | "assets"
  | "schemas"
  | "audit";

export type EditorMode = "structured" | "raw" | "relations" | "diff";

export const sectionLabels: Record<StudioSection, string> = {
  overview: "نظرة عامة",
  core: "التصنيفات",
  pharmacy: "الصيدلية",
  vehicles: "المركبات",
  assets: "الصور",
  schemas: "المخططات",
  audit: "التحقق والسجل",
};

export const groupSections: Partial<Record<StudioSection, CatalogStudioGroup>> = {
  core: "core",
  pharmacy: "pharmacy",
  vehicles: "vehicles",
  schemas: "schemas",
};

export const primitiveKeys = [
  "id",
  "key",
  "categoryId",
  "subcategoryId",
  "originalId",
  "icon",
  "image",
  "imagePath",
  "prescriptionRequired",
  "optionFile",
  "supportsImage",
  "isDefault",
  "value",
  "column",
  "kind",
  "mainId",
  "childId",
] as const;
