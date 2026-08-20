import type { CatalogDisplay } from '@asol/catalog-core';

export interface Collection {
  id: number;
  nameAr: string;
  nameEn: string;
  image: string;
  memberCategoryIds: readonly number[];
  display: CatalogDisplay;
}
