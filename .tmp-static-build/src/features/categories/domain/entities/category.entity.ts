export interface Category {
  id: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  image: string;
  createdAt: string;
  updatedAt: string;
  collection: number | null;
  collectionAr: string | null;
  collectionEn: string | null;
  collectionImage: string | null;
  order: number | null;
}
