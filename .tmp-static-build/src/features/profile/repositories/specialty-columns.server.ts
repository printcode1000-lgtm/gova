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
const doctorAppointmentItems = categoryService.getDoctorAppointmentItems();

export const SPECIALTY_COLUMN_NAMES = Array.from(
  new Set(items.map((item) => `${slug(item.titleEn)}_${item.originalId}`)),
);

export const columnBySelection = new Map(
  items.map((item) => [
    `${item.categoryId}:${item.originalId}`,
    `${slug(item.titleEn)}_${item.originalId}`,
  ]),
);

export const columnByDoctorAppointment = new Map(
  doctorAppointmentItems.map((item) => [
    item.originalId,
    `${slug(item.nameEn)}_${item.originalId}`,
  ]),
);

export function selectedSpecialtyColumns(
  selection: ProfileSpecialtiesSelection,
): Set<string> {
  const selected = new Set<string>();
  
  // Handle subcategories
  for (const [categoryId, originalIds] of Object.entries(selection.sub)) {
    for (const originalId of originalIds) {
      const column = columnBySelection.get(`${categoryId}:${originalId}`);
      if (column) selected.add(column);
    }
  }
  
  // Handle main categories - for collection members and delivery services
  for (const mainCategoryId of selection.main) {
    if (mainCategoryId === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID) {
      selected.add("delivery_services_46");
    } else {
      // For collection members, the column uses the main category ID as originalId
      const column = columnBySelection.get(`${mainCategoryId}:${mainCategoryId}`);
      if (column) selected.add(column);
      
      // Also add ALL subcategories of this collection member
      // Example: if user selects "My Way" (collection member), add all its subcategories
      const memberTree = categoryService.getCategoryTree(mainCategoryId);
      if (memberTree) {
        for (const subcategory of memberTree.subcategories) {
          const subColumn = columnBySelection.get(`${mainCategoryId}:${subcategory.originalId}`);
          if (subColumn) selected.add(subColumn);
        }
      }
    }
  }
  
  return selected;
}
