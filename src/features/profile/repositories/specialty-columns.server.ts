import "server-only";

import { categoryService, CATEGORY_CONSTANTS } from "@/features/categories";
import type { ProfileSpecialtiesSelection } from "../entities/profile-specialties.entity";

type ColumnItem = { categoryId: number; originalId: number; titleEn: string };

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const items: readonly ColumnItem[] = categoryService.getSpecialtyColumnItems();

export const SPECIALTY_COLUMN_NAMES = Array.from(
  new Set(items.map((item) => `${slug(item.titleEn)}_${item.originalId}`)),
);

const columnBySelection = new Map(
  items.map((item) => [
    `${item.categoryId}:${item.originalId}`,
    `${slug(item.titleEn)}_${item.originalId}`,
  ]),
);

export function selectedSpecialtyColumns(
  selection: ProfileSpecialtiesSelection,
): Set<string> {
  const selected = new Set<string>();
  for (const [categoryId, originalIds] of Object.entries(selection.sub)) {
    for (const originalId of originalIds) {
      const column = columnBySelection.get(`${categoryId}:${originalId}`);
      if (column) selected.add(column);
    }
  }
  if (selection.main.includes(CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID)) selected.add("delivery_services_46");
  return selected;
}
