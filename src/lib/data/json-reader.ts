export interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: number | string;
  updated_at: number | string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: number | string;
  updated_at: number | string;
}

export async function getCategories(): Promise<Category[]> {
  const data = await import('@/data/categories.json');
  return data.default as Category[];
}

export async function getSubcategories(): Promise<Subcategory[]> {
  const data = await import('@/data/subcategories.json');
  return data.default as Subcategory[];
}
