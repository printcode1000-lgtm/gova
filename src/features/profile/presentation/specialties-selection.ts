import {
  categoryService,
  CATEGORY_CONSTANTS,
  type CategoryDisplay,
} from "@/features/categories";
import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";

export const MEDICAL_SERVICES_CATEGORY_ID =
  CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID;
const DELIVERY_SERVICES_ID = CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID;

function isIntegerId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function selectableSubcategoryIdsForCategory(
  category: CategoryDisplay,
): string[] {
  const regularIds = categoryService
    .getProfileSubOptions(category.id, category.isCollection)
    .filter((item) => !item.isDoctorAppointmentGroup && item.selectable !== false)
    .map((item) => item.originalId ?? item.id)
    .filter(isIntegerId)
    .map(String);

  if (category.id !== MEDICAL_SERVICES_CATEGORY_ID) {
    return regularIds;
  }

  const doctorIds = categoryService
    .getDoctorAppointmentItems()
    .map((item) => item.originalId ?? item.id)
    .filter(isIntegerId)
    .map(String);

  return Array.from(new Set([...regularIds, ...doctorIds]));
}

export function categoryRequiresSubcategorySelection(
  category: CategoryDisplay,
): boolean {
  return (
    category.id !== DELIVERY_SERVICES_ID &&
    selectableSubcategoryIdsForCategory(category).length > 0
  );
}

export function normalizeLoadedSpecialties(
  selection: ProfileSpecialtiesSelection,
): ProfileSpecialtiesSelection {
  const categories = categoryService.getProfileMainOptions();
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const normalizedSub = Object.fromEntries(
    Object.entries(selection.sub)
      .map(([categoryId, ids]) => {
        const category = categoryById.get(Number(categoryId));
        if (!category) return null;
        const allowedIds = new Set(selectableSubcategoryIdsForCategory(category));
        const normalizedIds = Array.from(
          new Set(ids.map(String).filter((id) => allowedIds.has(id))),
        ).map(Number);
        return normalizedIds.length > 0 ? [categoryId, normalizedIds] : null;
      })
      .filter((entry): entry is [string, number[]] => Boolean(entry)),
  );
  const main = Array.from(new Set(selection.main)).filter((categoryId) => {
    const category = categoryById.get(categoryId);
    if (!category) return false;
    return (
      !categoryRequiresSubcategorySelection(category) ||
      (normalizedSub[String(categoryId)]?.length ?? 0) > 0
    );
  });
  const mainSet = new Set(main.map(String));

  return {
    main,
    sub: Object.fromEntries(
      Object.entries(normalizedSub).filter(([categoryId]) =>
        mainSet.has(categoryId),
      ),
    ),
  };
}
