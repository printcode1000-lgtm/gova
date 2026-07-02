import { CategorySubcategoriesPage } from "@/components/categories/CategorySubcategoriesPage";
import categories from "../../../../public/catagory/categories.json";
import { Suspense } from "react";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

export function generateStaticParams(): Array<{ categoryId: string }> {
  return categories.map((category) => ({ categoryId: String(category.id) }));
}

export default async function CategoryPage({
  params,
}: CategoryPageProps) {
  const { categoryId } = await params;

  return (
    <Suspense fallback={null}>
      <CategorySubcategoriesPage categoryId={categoryId} />
    </Suspense>
  );
}
