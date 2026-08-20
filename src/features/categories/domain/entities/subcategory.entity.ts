import type { CatalogDisplay } from '@asol/catalog-core';

export interface Subcategory {
  id: number;
  categoryId: number;
  originalId: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  groupKey: "doctor-appointment" | null;
  display: CatalogDisplay;
}
