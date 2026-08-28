import { categoryService } from "@/features/categories";

export interface ProductSearchSubCategoryTab {
  id: string;
  label: string;
  imageUrl: string;
}

export interface ProductSearchCategoryTab {
  id: string;
  label: string;
  imageUrl: string;
  subTabs: ProductSearchSubCategoryTab[];
}

function subProductId(sub: { id: number | string; originalId?: number }): string {
  return String(sub.originalId ?? sub.id);
}

function searchableSubTabs(
  categoryId: number,
  locale: "ar" | "en",
): ProductSearchSubCategoryTab[] {
  return categoryService
    .getProfileSubOptions(categoryId, false)
    .filter(
      (sub) =>
        sub.kind === "subcategory" &&
        sub.selectable !== false &&
        typeof sub.originalId === "number",
    )
    .map((sub) => ({
      id: subProductId(sub),
      label: locale === "ar" ? sub.nameAr : sub.nameEn,
      imageUrl: sub.imageUrl,
    }));
}

/**
 * Every searchable main category with its searchable subcategories.
 *
 * Search is catalog-wide, so no profile selection filters this list.
 * Collections are expanded into their member categories because products are
 * stored under a member category and one of its real subcategories, never
 * under the collection itself.
 */
export function buildProductSearchCategoryTabs(
  locale: "ar" | "en",
): ProductSearchCategoryTab[] {
  return categoryService.getProfileMainOptions().flatMap(
    (category): ProductSearchCategoryTab[] => {
      if (category.isCollection) {
        return (categoryService.getCollection(category.id)?.items ?? []).map(
          (member) => ({
            id: String(member.id),
            label: locale === "ar" ? member.nameAr : member.nameEn,
            imageUrl: member.imageUrl,
            subTabs: searchableSubTabs(member.id, locale),
          }),
        );
      }

      return [
        {
          id: String(category.id),
          label: locale === "ar" ? category.nameAr : category.nameEn,
          imageUrl: category.imageUrl,
          subTabs: searchableSubTabs(category.id, locale),
        },
      ];
    },
  );
}
