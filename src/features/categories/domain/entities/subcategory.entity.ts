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
  subCollection: number | null;
}
