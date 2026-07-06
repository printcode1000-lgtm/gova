export interface CategoryNode {
  id: number;
  nameAr: string;
  nameEn: string;
  icon: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  collection: number | null;
  collectionAr: string | null;
  collectionEn: string | null;
  collectionImage: string | null;
  order: number | null;
  subcategories: SubcategoryNode[];
}

export interface SubcategoryNode {
  id: number;
  categoryId: number;
  originalId: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  subCollection: number | null;
}
