import {
  getCategories,
  getSubcategories,
  type Category,
  type Subcategory,
} from '@/lib/data/json-reader';

export const categories = getCategories;
export const subcategories = getSubcategories;

export type { Category, Subcategory };
