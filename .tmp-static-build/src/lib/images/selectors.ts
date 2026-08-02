import type { CategoryItem, SubcategoryItem } from '@/types/splash';
import { categoryService } from '@/features/categories';

function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp!;
  }
  return shuffled;
}

export async function getRandomCategories(count: number = 6): Promise<CategoryItem[]> {
  const mapped = categoryService.getAllDisplayCategories().map((cat) => ({
    id: cat.id,
    titleAr: cat.nameAr,
    image: cat.image,
  }));

  const shuffled = fisherYatesShuffle(mapped);
  return shuffled.slice(0, count);
}

export async function getRandomSubcategories(count: number = 15): Promise<SubcategoryItem[]> {
  const mapped = categoryService.getRandomSubcategories(count).map((sub) => ({
    id: sub.id,
    titleAr: sub.nameAr,
    image: sub.image,
  }));
  return mapped.slice(0, count) as SubcategoryItem[];
}
