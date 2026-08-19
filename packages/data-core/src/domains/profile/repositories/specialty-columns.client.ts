import { categoryService } from "@/features/categories";

const items = categoryService.getSpecialtyColumnItems();
const doctorAppointmentItems = categoryService.getDoctorAppointmentItems();
const doctorColumns = new Map(
  items
    .filter((item) => item.kind === "doctor-specialty")
    .map((item) => [item.originalId, item.column]),
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
