import { categoryService } from "@/features/categories";

export function internalCatalogImagePool(): string[] {
  const images = new Set<string>();
  const add = (value?: string) => {
    const normalized = value?.trim();
    if (normalized?.startsWith("/")) images.add(normalized);
  };

  for (const category of categoryService.getAllDisplayCategories()) add(category.imageUrl);
  for (const category of categoryService.getMainCategories()) {
    add(category.imageUrl);
    const tree = categoryService.getCategoryTree(category.id);
    for (const child of tree?.subcategories ?? []) add(child.imageUrl);
    for (const doctor of tree?.doctorAppointmentItems ?? []) add(doctor.imageUrl);
  }
  for (const collection of categoryService.getCollections()) {
    add(collection.imageUrl);
    for (const item of collection.items) add(item.imageUrl);
  }
  if (images.size === 0) throw new Error("simulationImagePoolEmpty");
  return [...images];
}
