import type { CatalogDisplay } from "@/features/catalog-data/types/catalog-v3.types";

export interface Category {
  id: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  display: CatalogDisplay;
}
