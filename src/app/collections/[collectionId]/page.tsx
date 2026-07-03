import { CollectionSubcategoriesPage } from "@/components/collections/CollectionSubcategoriesPage";
import categories from "../../../../public/catagory/categories.json";
import { Suspense } from "react";

interface CollectionPageProps {
  params: Promise<{ collectionId: string }>;
}

export function generateStaticParams(): Array<{ collectionId: string }> {
  // Extract unique collection IDs from categories.json
  const collectionIds = new Set<number>();
  
  categories.forEach((category) => {
    if (category.collection !== null) {
      collectionIds.add(category.collection);
    }
  });
  
  return Array.from(collectionIds).map((id) => ({ collectionId: String(id) }));
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const { collectionId } = await params;

  return (
    <Suspense fallback={null}>
      <CollectionSubcategoriesPage collectionId={collectionId} />
    </Suspense>
  );
}
