import { CATEGORY_CONSTANTS, categoryService } from "@/features/categories";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import type { ProfileSpecialtiesSelection } from "@/features/profile/entities/profile-specialties.entity";
import type {
  ProfileProductsFilters,
  ProfileProductsMainTab,
  ProfileProductsSubTab,
} from "../entities/profile-products.types";

export const EMPTY_PROFILE_PRODUCTS_FILTERS: ProfileProductsFilters = {
  searchText: "",
  sortBy: "newest",
  extra: {},
};

export const profileProductsBucketKey = (
  categoryId: string,
  subcategoryId: string,
) => `${categoryId}:${subcategoryId}`;

export function normalizeProfileProductsSelection(
  selection: ProfileSpecialtiesSelection,
): ProfileSpecialtiesSelection {
  return {
    main: selection.main.map(Number),
    sub: Object.fromEntries(
      Object.entries(selection.sub).map(([key, values]) => [
        String(key),
        values.map(Number),
      ]),
    ),
  };
}

export function profileProductsSubProductId(sub: {
  id: number | string;
  originalId?: number;
}): string {
  return String(sub.originalId ?? sub.id);
}

export function productName(product: ProductRecord): string {
  return product.mainData.name || "";
}

export function sortProfileProducts(
  products: ProductRecord[],
  sortBy: ProfileProductsFilters["sortBy"],
) {
  const next = [...products];
  if (sortBy === "name") {
    next.sort((a, b) => productName(a).localeCompare(productName(b), "ar"));
    return next;
  }
  next.sort((a, b) => {
    const left = new Date(a.createdAt).getTime();
    const right = new Date(b.createdAt).getTime();
    return sortBy === "oldest" ? left - right : right - left;
  });
  return next;
}

export function normalizeProfileProductsFilters(
  filters: ProfileProductsFilters,
): ProfileProductsFilters {
  const sortBy =
    filters.sortBy === "oldest" || filters.sortBy === "name"
      ? filters.sortBy
      : "newest";
  return {
    searchText:
      typeof filters.searchText === "string" ? filters.searchText : "",
    sortBy,
    extra:
      filters.extra && typeof filters.extra === "object" ? filters.extra : {},
  };
}

export function buildProfileProductsTabs({
  doctorAppointmentIds,
  includeDoctorAppointmentItems,
  locale,
  productsByBucket,
  selection,
}: {
  doctorAppointmentIds: Set<string>;
  includeDoctorAppointmentItems: boolean;
  locale: "ar" | "en";
  productsByBucket: Record<string, ProductRecord[]>;
  selection: ProfileSpecialtiesSelection;
}): ProfileProductsMainTab[] {
  const mainOptions = categoryService.getProfileMainOptions();
  const selectedMainIds = new Set(selection.main.map(String));

  return mainOptions
    .filter((category) => selectedMainIds.has(String(category.id)))
    .flatMap((category): ProfileProductsMainTab[] => {
      const categoryId = String(category.id);

      if (category.isCollection) {
        const selectedMemberIds = new Set(
          (selection.sub[categoryId] ?? []).map(String),
        );
        return (categoryService.getCollection(category.id)?.items ?? [])
          .filter((member) => selectedMemberIds.has(String(member.id)))
          .map((member) => {
            const memberId = String(member.id);
            const subTabs = (
              categoryService.getCategoryTree(member.id)?.subcategories ?? []
            )
              .filter(
                (sub) =>
                  sub.kind === "subcategory" &&
                  sub.selectable !== false &&
                  typeof sub.originalId === "number",
              )
              .map((sub): ProfileProductsSubTab => ({
                id: profileProductsBucketKey(memberId, profileProductsSubProductId(sub)),
                categoryId: memberId,
                productSubcategoryId: profileProductsSubProductId(sub),
                label: locale === "ar" ? sub.nameAr : sub.nameEn,
                imageUrl: sub.imageUrl,
                productCount:
                  productsByBucket[profileProductsBucketKey(memberId, profileProductsSubProductId(sub))]
                    ?.length,
              }));
            return {
              id: memberId,
              label: locale === "ar" ? member.nameAr : member.nameEn,
              imageUrl: member.imageUrl,
              subTabs,
            };
          });
      }

      const selectedSubIds = new Set(
        (selection.sub[categoryId] ?? [])
          .map(String)
          .filter(
            (subId) =>
              includeDoctorAppointmentItems ||
              categoryId !== String(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID) ||
              !doctorAppointmentIds.has(subId),
          ),
      );
      const subTabs = categoryService
        .getProfileSubOptions(category.id, false)
        .filter(
          (sub) =>
            selectedSubIds.has(profileProductsSubProductId(sub)) &&
            sub.kind === "subcategory" &&
            sub.selectable !== false,
        )
        .map((sub): ProfileProductsSubTab => ({
          id: profileProductsBucketKey(categoryId, profileProductsSubProductId(sub)),
          categoryId,
          productSubcategoryId: profileProductsSubProductId(sub),
          label: locale === "ar" ? sub.nameAr : sub.nameEn,
          imageUrl: sub.imageUrl,
          productCount:
            productsByBucket[profileProductsBucketKey(categoryId, profileProductsSubProductId(sub))]
              ?.length,
        }));
      return [{
        id: categoryId,
        label: locale === "ar" ? category.nameAr : category.nameEn,
        imageUrl: category.imageUrl,
        subTabs,
      }];
    });
}

export function filterActiveProfileProducts({
  activeBucket,
  mode,
  normalizedFilters,
  productsByBucket,
}: {
  activeBucket: string;
  mode: "edit" | "preview";
  normalizedFilters: ProfileProductsFilters;
  productsByBucket: Record<string, ProductRecord[]>;
}) {
  const raw = (productsByBucket[activeBucket] ?? []).filter(
    (product) => mode !== "preview" || product.status === "active",
  );
  const search = normalizedFilters.searchText.trim().toLowerCase();
  const filtered = search
    ? raw.filter((product) =>
        productName(product).toLowerCase().includes(search),
      )
    : raw;
  return sortProfileProducts(filtered, normalizedFilters.sortBy);
}
