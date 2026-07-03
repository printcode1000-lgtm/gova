import { CategorySubcategoriesPage } from "@/components/categories/CategorySubcategoriesPage";
import { categoryService } from "@/features/categories";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export function generateStaticParams(): Array<{ categoryId: string }> {
  const categories = categoryService.getMainCategories();
  return categories.map((category) => ({ categoryId: String(category.id) }));
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
