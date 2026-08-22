import "server-only";

import { categoryService } from '../../../ports/runtime-config';
import type { ProfileSpecialtiesSelection } from "../entities";

const items = categoryService().getSpecialtyColumnItems();
const doctorAppointmentItems = categoryService().getDoctorAppointmentItems();
const doctorColumns = new Map(
  items
    .filter((item) => item.kind === "doctor-specialty")
    .map((item) => [item.originalId, item.column]),
);
const directCategoryColumns = new Map(
  items
    .filter((item) => item.kind === "direct-category")
    .map((item) => [item.categoryId, item.column]),
);

export const SPECIALTY_COLUMN_NAMES = Array.from(
  new Set(items.map((item) => item.column)),
);

export const columnBySelection = new Map(
  items.map((item) => [
    `${item.categoryId}:${item.originalId}`,
    item.column,
  ]),
);

export const columnByDoctorAppointment = new Map(
  doctorAppointmentItems.flatMap((item) => {
    const originalId = item.originalId;
    const column = originalId === undefined ? undefined : doctorColumns.get(originalId);
    return originalId === undefined || !column ? [] : ([[originalId, column]] as const);
  }),
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
  
  // Main categories are only searchable directly when they do not have child
  // choices in the profile UI. Child-backed specialties come from selection.sub.
  for (const mainCategoryId of selection.main) {
    const column = directCategoryColumns.get(mainCategoryId);
    if (column) selected.add(column);
  }
  
  return selected;
}
