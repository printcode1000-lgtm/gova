import type { Category } from './category.entity';

export interface Collection {
  id: number;
  nameAr: string;
  nameEn: string;
  image: string;
  items: Category[];
}
