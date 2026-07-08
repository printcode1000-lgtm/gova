import { Suspense } from "react";
import { SellersPageContent } from "@/components/categories/SellersPageContent";
import { categoryService } from "@/features/categories";
import { notFound } from "next/navigation";

interface SellersPageProps {
  params: Promise<{ categoryId: string; subcategoryId: string }>;
}

export function generateStaticParams(): Array<{ categoryId: string; subcategoryId: string }> {
  const params: Array<{ categoryId: string; subcategoryId: string }> = [];
  const categoryIds = new Set<number>();

  for (const category of categoryService.getMainCategories()) {
    categoryIds.add(category.id);
  }

  for (const collection of categoryService.getCollections()) {
    for (const item of collection.items) {
      categoryIds.add(item.id);
    }
  }

  for (const categoryId of categoryIds) {
    const tree = categoryService.getCategoryTree(categoryId);
    if (tree) {
      for (const subcategory of tree.subcategories) {
        params.push({
          categoryId: String(categoryId),
          subcategoryId: String(subcategory.originalId),
        });
      }
    }
  }
  
  return params;
}

export default async function SellersPage({
  params,
}: SellersPageProps) {
  const { categoryId, subcategoryId } = await params;
  const category = categoryService.getCategoryTree(Number(categoryId));
  
  if (!category) {
    notFound();
  }

  const subcategory = category.subcategories.find(
    (sub) => sub.originalId === Number(subcategoryId)
  );

  const doctorItem = category.doctorAppointmentItems?.find(
    (item) => item.originalId === Number(subcategoryId)
  );

  const targetItem = subcategory || doctorItem;

  if (!targetItem) {
    notFound();
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SellersPageContent 
        categoryId={Number(categoryId)}
        subcategoryId={Number(subcategoryId)}
        subcategoryName={targetItem.nameAr}
        subcategoryImage={targetItem.imageUrl}
      />
    </Suspense>
  );
}
