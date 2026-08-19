import type { CatalogDisplay } from "@/features/catalog-data/types/catalog-v3.types";

export interface Collection {
  id: number;
  nameAr: string;
  nameEn: string;
  image: string;
  memberCategoryIds: readonly number[];
  display: CatalogDisplay;
}
