import { CategorySubcategoriesPage } from "@/components/categories/CategorySubcategoriesPage";
import { categoryService } from "@/features/categories";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export function generateStaticParams(): Array<{ categoryId: string }> {
  const categoryIds = new Set<number>();

  for (const category of categoryService.getMainCategories()) {
    categoryIds.add(category.id);
  }

  for (const collection of categoryService.getCollections()) {
    for (const item of collection.items) {
      categoryIds.add(item.id);
    }
  }

  return [...categoryIds].map((categoryId) => ({ categoryId: String(categoryId) }));
}

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { categoryId } = await params;
  const tree = categoryService.getCategoryTree(Number(categoryId));
  
  if (!tree) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <CategorySubcategoriesPage categoryTree={tree} />
    </Suspense>
  );
}
