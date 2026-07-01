import { CategorySubcategoriesPage } from "@/components/categories/CategorySubcategoriesPage";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { categoryId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const collectionParam = resolvedSearchParams.collection;
  const isCollectionHint = Array.isArray(collectionParam)
    ? collectionParam[0] === "1"
    : collectionParam === "1";

  return (
    <CategorySubcategoriesPage
      categoryId={categoryId}
      isCollectionHint={isCollectionHint}
    />
  );
}
