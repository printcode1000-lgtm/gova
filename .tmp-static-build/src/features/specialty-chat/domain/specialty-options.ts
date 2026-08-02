import {
  CATEGORY_CONSTANTS,
  categoryService,
  type CategoryDisplay,
  type SubcategoryDisplay,
} from "@/features/categories";

export function getSpecialtyChatSubOptions(main: CategoryDisplay): readonly SubcategoryDisplay[] {
  const standard = categoryService
    .getProfileSubOptions(main.id, main.isCollection)
    .filter((item) => item.selectable && typeof item.originalId === "number");
  if (main.id === CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID) {
    return [...standard, ...categoryService.getDoctorAppointmentItems()].filter(
      (item, index, all) => all.findIndex((candidate) => candidate.originalId === item.originalId) === index,
    );
  }
  if (main.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID && standard.length === 0) {
    return [{
      id: main.id,
      originalId: main.id,
      canonicalKey: main.canonicalKey,
      kind: "subcategory",
      nameAr: main.nameAr,
      nameEn: main.nameEn,
      image: main.image,
      imageUrl: main.imageUrl,
      selectable: true,
    }];
  }
  return standard;
}
