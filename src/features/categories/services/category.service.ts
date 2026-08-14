import { CATEGORY_CONSTANTS } from "../domain/constants/category-constants";
import {
  isCatalogItemVisible,
  visibleCatalogItems,
} from "@/features/catalog-data/utils/catalog-display";
import type { Category } from "../domain/entities/category.entity";
import type { Collection } from "../domain/entities/collection.entity";
import type { Subcategory } from "../domain/entities/subcategory.entity";
import {
  loadCatalogManifest,
  loadCategories,
  loadCollections,
  loadSpecialtyColumnMappings,
  loadSubcategories,
} from "../infrastructure/catalog-data.loader";
import type {
  CategoryDisplay,
  CategorySelectionInput,
  CategorySelectionResult,
  CategoryTree,
  CollectionDisplay,
  DeveloperCategoryDetail,
  DeveloperCatalog,
  MainCategoryOption,
  SpecialtyColumnItem,
  SubcategoryDisplay,
  SubcategoryOption,
} from "../types/public-api";

const categories = loadCategories();
const collections = loadCollections();
const subcategories = loadSubcategories();
const specialtyMappings = loadSpecialtyColumnMappings();
const assetRoots = loadCatalogManifest().assets;
const categoryById = new Map(categories.map((item) => [item.id, item]));
const collectionById = new Map(collections.map((item) => [item.id, item]));
const collectionByMemberId = new Map(
  collections.flatMap((collection) =>
    collection.memberCategoryIds.map((memberId) => [memberId, collection] as const),
  ),
);
const memberCategoryIds = new Set(collectionByMemberId.keys());
const mainImageUrl = (image: string) => `${assetRoots.mainCategories}/${image}`;
const subImageUrl = (image: string) => `${assetRoots.subcategories}/${image}`;
const byOrder = (left: { order: number }, right: { order: number }) => left.order - right.order;

function isCategoryAvailable(category: Category): boolean {
  const collection = collectionByMemberId.get(category.id);
  return isCatalogItemVisible(category, ...(collection ? [collection] : []));
}

function visibleSubcategoryItems(items: readonly Subcategory[]): Subcategory[] {
  return visibleCatalogItems(
    items.filter((item) => {
      const parent = categoryById.get(item.categoryId);
      if (!parent) return false;
      const collection = collectionByMemberId.get(parent.id);
      return isCatalogItemVisible(item, parent, ...(collection ? [collection] : []));
    }),
    (item) => item.id,
  );
}

function categoryDisplay(category: Category): CategoryDisplay {
  return {
    id: category.id,
    canonicalKey: `category:${category.id}`,
    kind: "category",
    nameAr: category.titleAr,
    nameEn: category.titleEn,
    image: category.image,
    imageUrl: mainImageUrl(category.image),
    order: category.display.order,
    isCollection: false,
  };
}

function subcategoryDisplay(subcategory: Subcategory): SubcategoryDisplay {
  return {
    id: subcategory.id,
    canonicalKey: `subcategory:${subcategory.categoryId}:${subcategory.originalId}`,
    kind: "subcategory",
    originalId: subcategory.originalId,
    nameAr: subcategory.titleAr,
    nameEn: subcategory.titleEn,
    image: subcategory.image,
    imageUrl: subImageUrl(subcategory.image),
    selectable: true,
    order: subcategory.display.order,
  };
}

function doctorAppointmentGroup(order: number): SubcategoryDisplay {
  return {
    id: "virtual:doctor-appointment",
    canonicalKey: "virtual:doctor-appointment",
    kind: "virtual-group",
    nameAr: "كشف طبي",
    nameEn: "Doctor Appointment",
    image: "doctors_appointment.webp",
    imageUrl: subImageUrl("doctors_appointment.webp"),
    selectable: false,
    order,
    isDoctorAppointmentGroup: true,
  };
}

function collectionDisplay(collection: Collection): CollectionDisplay {
  const items = collection.memberCategoryIds
    .map((id) => categoryById.get(id))
    .filter((item): item is Category => item !== undefined && isCategoryAvailable(item))
    .sort((left, right) => left.display.order - right.display.order || left.id - right.id)
    .map((member): CategoryDisplay => ({
      ...categoryDisplay(member),
      canonicalKey: `collection-member:${collection.id}:${member.id}`,
    }));
  return {
    id: collection.id,
    canonicalKey: `collection:${collection.id}`,
    nameAr: collection.nameAr,
    nameEn: collection.nameEn,
    image: collection.image,
    imageUrl: mainImageUrl(collection.image),
    order: collection.display.order,
    items,
  };
}

export class CategoryService {
  getDeveloperCatalog(): DeveloperCatalog {
    return {
      categories: visibleCatalogItems(
        categories.filter(isCategoryAvailable),
        (category) => category.id,
      ).map((category) => {
        const collection = collectionByMemberId.get(category.id);
        return {
          id: category.id,
          titleAr: category.titleAr,
          titleEn: category.titleEn,
          image: category.image,
          collection: collection?.id ?? null,
          collectionAr: collection?.nameAr ?? null,
          collectionEn: collection?.nameEn ?? null,
          collectionImage: collection?.image ?? null,
          collectionOrder: collection?.display.order ?? null,
          order: category.display.order,
        };
      }),
      subcategories: visibleSubcategoryItems(subcategories).map((subcategory) => ({
        id: subcategory.id,
        categoryId: subcategory.categoryId,
        originalId: subcategory.originalId,
        titleAr: subcategory.titleAr,
        titleEn: subcategory.titleEn,
        image: subcategory.image,
        subCollection: subcategory.groupKey === "doctor-appointment" ? 0 : null,
        order: subcategory.display.order,
      })),
    };
  }

  getHomeCategories(): readonly CategoryDisplay[] {
    return this.getAllDisplayCategories();
  }

  getMainCategories(): readonly CategoryDisplay[] {
    return visibleCatalogItems(
      categories.filter((category) => !memberCategoryIds.has(category.id)),
      (category) => category.id,
    )
      .map(categoryDisplay)
      .sort(byOrder);
  }

  getCollections(): readonly CollectionDisplay[] {
    return visibleCatalogItems(collections, (collection) => collection.id)
      .map(collectionDisplay)
      .filter((collection) => collection.items.length > 0)
      .sort(byOrder);
  }

  getAllDisplayCategories(): readonly CategoryDisplay[] {
    const collectionItems = this.getCollections().map((collection): CategoryDisplay => ({
      id: collection.id,
      canonicalKey: collection.canonicalKey,
      kind: "collection",
      nameAr: collection.nameAr,
      nameEn: collection.nameEn,
      image: collection.image,
      imageUrl: collection.imageUrl,
      order: collection.order,
      isCollection: true,
    }));
    return [...this.getMainCategories(), ...collectionItems].sort(byOrder);
  }

  getCategoryTree(categoryId: number): CategoryTree | null {
    const category = categoryById.get(categoryId);
    if (!category || !isCategoryAvailable(category)) return null;
    const children = visibleSubcategoryItems(
      subcategories.filter((item) => item.categoryId === categoryId),
    );
    const doctorItems = children
      .filter((item) => item.groupKey === "doctor-appointment")
      .map(subcategoryDisplay);
    const visible: SubcategoryDisplay[] = children
      .filter((item) => item.groupKey !== "doctor-appointment")
      .map(subcategoryDisplay);
    if (doctorItems.length > 0) {
      visible.push(doctorAppointmentGroup(Math.min(...doctorItems.map((item) => item.order))));
    }
    visible.sort(byOrder);
    return {
      category: categoryDisplay(category),
      subcategories: visible,
      doctorAppointmentItems: doctorItems,
    };
  }

  getCollection(collectionId: number): CollectionDisplay | null {
    const collection = collectionById.get(collectionId);
    if (!collection || !isCatalogItemVisible(collection)) return null;
    const display = collectionDisplay(collection);
    return display.items.length > 0 ? display : null;
  }

  getDeveloperMainOptions(): readonly MainCategoryOption[] {
    const regular = this.getMainCategories().map((item) => ({
      id: item.id,
      canonicalKey: item.canonicalKey,
      titleAr: item.nameAr,
      titleEn: item.nameEn,
      isCollection: false,
      order: item.order,
    }));
    const collectionMembers = this.getCollections().flatMap((collection) =>
      collection.items.map((item, index) => ({
        id: item.id,
        canonicalKey: item.canonicalKey,
        titleAr: item.nameAr,
        titleEn: item.nameEn,
        isCollection: false,
        // Keep members together at the collection's canonical position.
        order: collection.order + (index + 1) / 1000,
      })),
    );
    return [...regular, ...collectionMembers].sort(byOrder);
  }

  getDeveloperSubOptions(mainId: number, isCollection: boolean): readonly SubcategoryOption[] {
    if (isCollection) {
      return (this.getCollection(mainId)?.items ?? []).map((item) => ({
        value: String(item.id),
        canonicalKey: `collection-member:${mainId}:${item.id}`,
        kind: "collection-member",
        titleAr: item.nameAr,
        titleEn: item.nameEn,
        selectable: true,
        order: item.order,
      }));
    }
    return (this.getCategoryTree(mainId)?.subcategories ?? []).map((item) => ({
      value:
        item.kind === "virtual-group"
          ? CATEGORY_CONSTANTS.DOCTOR_APPOINTMENT_VALUE
          : String(item.originalId),
      canonicalKey: item.canonicalKey,
      kind: item.kind,
      titleAr: item.nameAr,
      titleEn: item.nameEn,
      selectable: item.selectable,
      order: item.order,
    }));
  }

  getDeveloperDetail(
    mainId: number,
    isCollection: boolean,
    childValue?: string,
  ): DeveloperCategoryDetail | null {
    if (!childValue) {
      const main = isCollection
        ? this.getAllDisplayCategories().find(
            (item) => item.id === mainId && item.isCollection,
          )
        : this.getCategoryTree(mainId)?.category;
      if (!main) return null;
      const collection = isCollection ? this.getCollection(mainId) : null;
      return {
        canonicalKey: main.canonicalKey,
        kind: main.kind,
        id: main.id,
        nameAr: main.nameAr,
        nameEn: main.nameEn,
        image: main.image,
        imageUrl: main.imageUrl,
        order: main.order,
        memberIds: collection?.items.map((item) => item.id),
      };
    }
    if (
      childValue === CATEGORY_CONSTANTS.DOCTOR_APPOINTMENT_VALUE &&
      mainId === CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID &&
      !isCollection
    ) {
      const doctorItems = this.getDoctorAppointmentItems();
      if (doctorItems.length === 0) return null;
      const item = doctorAppointmentGroup(Math.min(...doctorItems.map((child) => child.order)));
      return {
        canonicalKey: item.canonicalKey,
        kind: item.kind,
        id: item.id,
        parentId: mainId,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        image: item.image,
        imageUrl: item.imageUrl,
        memberIds: doctorItems.map((child) => child.originalId!),
      };
    }
    const childId = Number(childValue);
    if (!Number.isInteger(childId)) return null;
    if (isCollection) {
      const item = this.getCollection(mainId)?.items.find((candidate) => candidate.id === childId);
      return item
        ? {
            canonicalKey: `collection-member:${mainId}:${item.id}`,
            kind: "collection-member",
            id: item.id,
            parentId: mainId,
            nameAr: item.nameAr,
            nameEn: item.nameEn,
            image: item.image,
            imageUrl: item.imageUrl,
            order: item.order,
          }
        : null;
    }
    const item = this.getCategoryTree(mainId)?.subcategories.find(
      (candidate) => candidate.originalId === childId,
    );
    return item
      ? {
          canonicalKey: item.canonicalKey,
          kind: "subcategory",
          id: item.id,
          parentId: mainId,
          originalId: item.originalId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          image: item.image,
          imageUrl: item.imageUrl,
        }
      : null;
  }

  getProfileMainOptions(): readonly CategoryDisplay[] {
    return [...this.getAllDisplayCategories()].sort(byOrder);
  }

  getProfileSubOptions(categoryId: number, isCollection: boolean): readonly SubcategoryDisplay[] {
    if (isCollection) {
      return (this.getCollection(categoryId)?.items ?? []).map((item) => ({
        id: item.id,
        canonicalKey: `collection-member:${categoryId}:${item.id}`,
        kind: "collection-member",
        originalId: item.id,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        image: item.image,
        imageUrl: item.imageUrl,
        selectable: true,
        order: item.order,
      }));
    }
    return this.getCategoryTree(categoryId)?.subcategories ?? [];
  }

  getDoctorAppointmentItems(): readonly SubcategoryDisplay[] {
    return this.getCategoryTree(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID)?.doctorAppointmentItems ?? [];
  }

  getSpecialtyColumnItems(): readonly SpecialtyColumnItem[] {
    return specialtyMappings.flatMap((mapping) => {
      const originalId = mapping.childId ?? mapping.mainId;
      const sourceItem =
        mapping.kind === "collection-member" || mapping.kind === "direct-category"
          ? categoryById.get(originalId)
          : subcategories.find(
              (item) => item.categoryId === mapping.mainId && item.originalId === originalId,
            );
      if (!sourceItem || !isCatalogItemVisible(sourceItem)) return [];
      const parent = categoryById.get(mapping.kind === "collection-member" ? originalId : mapping.mainId);
      if (!parent || !isCategoryAvailable(parent)) return [];
      const titleEn =
        mapping.kind === "collection-member"
          ? (categoryById.get(originalId)?.titleEn ?? "")
          : mapping.kind === "direct-category"
            ? (categoryById.get(mapping.mainId)?.titleEn ?? "")
            : (subcategories.find(
                (item) => item.categoryId === mapping.mainId && item.originalId === originalId,
              )?.titleEn ?? "");
      return [{
        categoryId: mapping.mainId,
        originalId,
        titleEn,
        column: mapping.column,
        kind: mapping.kind,
      }];
    });
  }

  getRandomMainCategories(count: number): readonly CategoryDisplay[] {
    return [...this.getAllDisplayCategories()]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, count));
  }

  getRandomSubcategories(count: number): readonly SubcategoryDisplay[] {
    return visibleSubcategoryItems(subcategories).map(subcategoryDisplay)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, count));
  }

  resolveSelection(input: CategorySelectionInput): CategorySelectionResult {
    if (input.main.kind === "category" && input.child.kind === "subcategory") {
      const main = categoryById.get(input.main.id);
      if (!main || !isCategoryAvailable(main)) {
        return { valid: false, code: "MAIN_NOT_FOUND" };
      }
      if (!visibleSubcategoryItems(subcategories).some((item) => item.originalId === input.child.id)) {
        return { valid: false, code: "CHILD_NOT_FOUND" };
      }
      if (
        !visibleSubcategoryItems(subcategories).some(
          (item) => item.categoryId === input.main.id && item.originalId === input.child.id,
        )
      ) {
        return { valid: false, code: "INVALID_RELATION" };
      }
      return { valid: true, selection: input };
    }
    if (input.main.kind === "collection" && input.child.kind === "collection-member") {
      const collection = collectionById.get(input.main.id);
      if (!collection || !isCatalogItemVisible(collection)) {
        return { valid: false, code: "MAIN_NOT_FOUND" };
      }
      const child = categoryById.get(input.child.id);
      if (!child || !isCategoryAvailable(child)) {
        return { valid: false, code: "CHILD_NOT_FOUND" };
      }
      if (!collection.memberCategoryIds.includes(input.child.id)) {
        return { valid: false, code: "INVALID_RELATION" };
      }
      return { valid: true, selection: input };
    }
    return { valid: false, code: "INVALID_RELATION" };
  }

  resolveLegacyProductSelection(
    mainCategoryId: string,
    subcategoryId: string,
  ): CategorySelectionResult {
    const mainId = Number(mainCategoryId);
    const childId = Number(subcategoryId);
    if (!Number.isInteger(mainId) || !Number.isInteger(childId)) {
      return { valid: false, code: "INVALID_RELATION" };
    }
    if (collectionById.has(mainId)) {
      return { valid: false, code: "INVALID_RELATION" };
    }
    return this.resolveSelection({
      main: { kind: "category", id: mainId },
      child: { kind: "subcategory", id: childId },
    });
  }
}

export const categoryService = new CategoryService();
