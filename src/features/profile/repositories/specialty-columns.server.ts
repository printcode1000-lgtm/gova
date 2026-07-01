import "server-only";

import categories from "../../../../public/catagory/categories.json";
import subcategories from "../../../../public/catagory/subcategories.json";
import type { ProfileSpecialtiesSelection } from "../entities/profile-specialties.entity";

type ColumnItem = { categoryId: number; originalId: number; titleEn: string };

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const items: ColumnItem[] = [
  ...subcategories.map((item) => ({
    categoryId: item.category_id,
    originalId: item.original_id,
    titleEn: item.title_en,
  })),
  ...categories
    .filter((item) => item.collection === 0)
    .map((item) => ({
      categoryId: 0,
      originalId: item.id,
      titleEn: item.title_en,
    })),
  { categoryId: 46, originalId: 46, titleEn: "Delivery Services" },
];

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
  if (selection.main.includes(46)) selected.add("delivery_services_46");
  return selected;
}
