import type { CatalogDisplay } from '@asol/catalog-core';

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
