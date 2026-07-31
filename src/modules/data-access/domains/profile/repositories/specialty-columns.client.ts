import { categoryService } from "@/features/categories";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const items = categoryService.getSpecialtyColumnItems();
const doctorAppointmentItems = categoryService.getDoctorAppointmentItems();

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
