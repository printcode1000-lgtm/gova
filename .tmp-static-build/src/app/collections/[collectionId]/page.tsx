import { CollectionSubcategoriesPage } from "@/components/collections/CollectionSubcategoriesPage";
import { categoryService } from "@/features/categories";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface CollectionPageProps {
  params: Promise<{ collectionId: string }>;
}

export function generateStaticParams(): Array<{ collectionId: string }> {
  const collections = categoryService.getCollections();
  return collections.map((collection) => ({ collectionId: String(collection.id) }));
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const { collectionId } = await params;
  const collection = categoryService.getCollection(Number(collectionId));
  
  if (!collection) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <CollectionSubcategoriesPage collection={collection} />
    </Suspense>
  );
}
