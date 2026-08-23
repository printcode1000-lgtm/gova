import "server-only";

import { categoryService } from '../../../ports/runtime-config';
import type { ProfileSpecialtiesSelection } from "../entities";

/**
 * Specialty column tables, resolved on first use rather than at module load.
 *
 * The category catalog arrives through a port the composition root registers.
 * Reading it at module scope meant the import itself decided whether the
 * process survived: `products-composition`, which never registers that port,
 * threw `categoryCatalog.getSpecialtyColumnItems is not configured` the moment
 * anything pulled this file in. A port is only inverted if it is also resolved
 * lazily — otherwise import order silently becomes part of the contract.
 */
interface SpecialtyColumnTables {
  readonly names: readonly string[];
  readonly bySelection: ReadonlyMap<string, string>;
  readonly byDoctorAppointment: ReadonlyMap<number, string>;
  readonly directCategory: ReadonlyMap<number, string>;
  readonly deliveryServicesColumn: string;
}

let cached: SpecialtyColumnTables | null = null;

function tables(): SpecialtyColumnTables {
  if (cached) return cached;

  const items = categoryService().getSpecialtyColumnItems();
  const doctorAppointmentItems = categoryService().getDoctorAppointmentItems();
  const doctorColumns = new Map(
    items
      .filter((item) => item.kind === "doctor-specialty")
      .map((item) => [item.originalId, item.column]),
  );
  const bySelection = new Map(
    items.map((item) => [`${item.categoryId}:${item.originalId}`, item.column]),
  );
  const deliveryServicesColumn = bySelection.get("46:46");
  if (!deliveryServicesColumn) {
    throw new Error("Delivery Services specialty column mapping is missing");
  }

  cached = {
    names: Array.from(new Set(items.map((item) => item.column))),
    bySelection,
    byDoctorAppointment: new Map(
      doctorAppointmentItems.flatMap((item) => {
        const originalId = item.originalId;
        const column =
          originalId === undefined ? undefined : doctorColumns.get(originalId);
        return originalId === undefined || !column
          ? []
          : ([[originalId, column]] as const);
      }),
    ),
    directCategory: new Map(
      items
        .filter((item) => item.kind === "direct-category")
        .map((item) => [item.categoryId, item.column]),
    ),
    deliveryServicesColumn,
  };
  return cached;
}

/** Test seam: drop the memoised tables so a re-registered port is picked up. */
export function resetSpecialtyColumnsForTests(): void {
  cached = null;
}

export function specialtyColumnNames(): readonly string[] {
  return tables().names;
}

export function columnForSelection(key: string): string | undefined {
  return tables().bySelection.get(key);
}

export function columnForDoctorAppointment(
  originalId: number,
): string | undefined {
  return tables().byDoctorAppointment.get(originalId);
}

export function deliveryServicesSpecialtyColumn(): string {
  return tables().deliveryServicesColumn;
}

export function selectedSpecialtyColumns(
  selection: ProfileSpecialtiesSelection,
): Set<string> {
  const { bySelection, directCategory } = tables();
  const selected = new Set<string>();
  
  // Handle subcategories
  for (const [categoryId, originalIds] of Object.entries(selection.sub)) {
    for (const originalId of originalIds) {
      const column = bySelection.get(`${categoryId}:${originalId}`);
      if (column) selected.add(column);
    }
  }
  
  // Main categories are only searchable directly when they do not have child
  // choices in the profile UI. Child-backed specialties come from selection.sub.
  for (const mainCategoryId of selection.main) {
    const column = directCategory.get(mainCategoryId);
    if (column) selected.add(column);
  }
  
  return selected;
}
