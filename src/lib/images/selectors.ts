import { CategoryItem, SubcategoryItem } from '@/types/splash';

import { categories, subcategories } from '../db/json';

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
  const allCategories = await categories();

  const mapped = allCategories.map((cat) => ({
    id: cat.id,
    titleAr: cat.title_ar,
    image: cat.image,
  }));

  const shuffled = fisherYatesShuffle(mapped);
  return shuffled.slice(0, count);
}

export async function getRandomSubcategories(count: number = 15): Promise<SubcategoryItem[]> {
  const allSubcategories = await subcategories();

  const mapped = allSubcategories.map((sub) => ({
    id: sub.id,
    titleAr: sub.title_ar,
    image: sub.image,
  }));

  const shuffled = fisherYatesShuffle(mapped);
  return shuffled.slice(0, count);
}
