import { CATEGORY_CONSTANTS } from "../domain/constants/category-constants";
import type { Category } from "../domain/entities/category.entity";
import type { Subcategory } from "../domain/entities/subcategory.entity";
import { loadRawCategories, loadRawSubcategories } from "../infrastructure/raw-data.loader";
import { mapRawCategory, mapRawSubcategory } from "../infrastructure/mappers";
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

const categories: readonly Category[] = Object.freeze(loadRawCategories().map(mapRawCategory));
const subcategories: readonly Subcategory[] = Object.freeze(loadRawSubcategories().map(mapRawSubcategory));

const mainImageUrl = (image: string) => `/images/mainCategories/${image}`;
const subImageUrl = (image: string) => `/images/subCategories/${image}`;
const byOrder = (left: { order: number | null }, right: { order: number | null }) =>
  (left.order ?? Number.POSITIVE_INFINITY) - (right.order ?? Number.POSITIVE_INFINITY);

function categoryDisplay(category: Category): CategoryDisplay {
  return {
    id: category.id,
    canonicalKey: `category:${category.id}`,
    kind: "category",
    nameAr: category.titleAr,
    nameEn: category.titleEn,
    image: category.image,
    imageUrl: mainImageUrl(category.image),
    order: category.order,
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
  };
}

const doctorAppointmentGroup = (): SubcategoryDisplay => ({
  id: "virtual:doctor-appointment",
  canonicalKey: "virtual:doctor-appointment",
  kind: "virtual-group",
  nameAr: "كشف طبي",
  nameEn: "Doctor Appointment",
  image: "doctors_appointment.webp",
  imageUrl: subImageUrl("doctors_appointment.webp"),
  selectable: false,
  isDoctorAppointmentGroup: true,
});

export class CategoryService {
  getDeveloperCatalog(): DeveloperCatalog {
    return { categories, subcategories };
  }
  getHomeCategories(): readonly CategoryDisplay[] {
    return this.getAllDisplayCategories();
  }

  getMainCategories(): readonly CategoryDisplay[] {
    return categories
      .filter((category) => category.collection === null)
      .map(categoryDisplay)
      .sort(byOrder);
  }

  getCollections(): readonly CollectionDisplay[] {
    const grouped = new Map<number, Category[]>();
    for (const category of categories) {
      if (category.collection === null) continue;
      const members = grouped.get(category.collection) ?? [];
      members.push(category);
      grouped.set(category.collection, members);
    }
    return [...grouped.entries()].map(([id, members]) => {
      const first = members[0]!;
      const items = members.sort(byOrder).map((member): CategoryDisplay => ({
        ...categoryDisplay(member),
        canonicalKey: `collection-member:${id}:${member.id}`,
      }));
      return {
        id,
        canonicalKey: `collection:${id}`,
        nameAr: first.collectionAr ?? "",
        nameEn: first.collectionEn ?? "",
        image: first.collectionImage ?? "",
        imageUrl: mainImageUrl(first.collectionImage ?? ""),
        order: items[0]?.order ?? null,
        items,
      };
    }).sort(byOrder);
  }

  getAllDisplayCategories(): readonly CategoryDisplay[] {
    const collections = this.getCollections().map((collection): CategoryDisplay => ({
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
    return [...this.getMainCategories(), ...collections].sort(byOrder);
  }

  getCategoryTree(categoryId: number): CategoryTree | null {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return null;
    const children = subcategories.filter((item) => item.categoryId === categoryId);
    const doctorItems = categoryId === CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID
      ? children.filter((item) => item.subCollection === 0).map(subcategoryDisplay)
      : [];
    const visible = categoryId === CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID
      ? children.filter((item) => item.subCollection !== 0).map(subcategoryDisplay)
      : children.map(subcategoryDisplay);
    if (doctorItems.length > 0) visible.unshift(doctorAppointmentGroup());
    return { category: categoryDisplay(category), subcategories: visible, doctorAppointmentItems: doctorItems };
  }

  getCollection(collectionId: number): CollectionDisplay | null {
    return this.getCollections().find((collection) => collection.id === collectionId) ?? null;
  }

  getDeveloperMainOptions(): readonly MainCategoryOption[] {
    return this.getAllDisplayCategories().map((item) => ({
      id: item.id,
      canonicalKey: item.canonicalKey,
      titleAr: item.nameAr,
      titleEn: item.nameEn,
      isCollection: item.kind === "collection",
      order: item.order,
    }));
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
      }));
    }
    return (this.getCategoryTree(mainId)?.subcategories ?? []).map((item) => ({
      value: item.kind === "virtual-group" ? CATEGORY_CONSTANTS.DOCTOR_APPOINTMENT_VALUE : String(item.originalId),
      canonicalKey: item.canonicalKey,
      kind: item.kind,
      titleAr: item.nameAr,
      titleEn: item.nameEn,
      selectable: item.selectable,
    }));
  }

  getDeveloperDetail(mainId: number, isCollection: boolean, childValue?: string): DeveloperCategoryDetail | null {
    if (!childValue) {
      const main = this.getAllDisplayCategories().find((item) => item.id === mainId && item.isCollection === isCollection);
      if (!main) return null;
      const collection = isCollection ? this.getCollection(mainId) : null;
      return { canonicalKey: main.canonicalKey, kind: main.kind, id: main.id, nameAr: main.nameAr, nameEn: main.nameEn, image: main.image, imageUrl: main.imageUrl, order: main.order, memberIds: collection?.items.map((item) => item.id) };
    }
    if (childValue === CATEGORY_CONSTANTS.DOCTOR_APPOINTMENT_VALUE) {
      const item = doctorAppointmentGroup();
      return { canonicalKey: item.canonicalKey, kind: item.kind, id: item.id, parentId: mainId, nameAr: item.nameAr, nameEn: item.nameEn, image: item.image, imageUrl: item.imageUrl, memberIds: this.getDoctorAppointmentItems().map((child) => child.originalId!) };
    }
    const childId = Number(childValue);
    if (isCollection) {
      const item = this.getCollection(mainId)?.items.find((candidate) => candidate.id === childId);
      return item ? { canonicalKey: `collection-member:${mainId}:${item.id}`, kind: "collection-member", id: item.id, parentId: mainId, nameAr: item.nameAr, nameEn: item.nameEn, image: item.image, imageUrl: item.imageUrl, order: item.order } : null;
    }
    const item = this.getCategoryTree(mainId)?.subcategories.find((candidate) => candidate.originalId === childId);
    return item ? { canonicalKey: item.canonicalKey, kind: "subcategory", id: item.id, parentId: mainId, originalId: item.originalId, nameAr: item.nameAr, nameEn: item.nameEn, image: item.image, imageUrl: item.imageUrl } : null;
  }

  getProfileMainOptions(): readonly CategoryDisplay[] {
    const delivery = categories.find((category) => category.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID);
    return [...this.getAllDisplayCategories(), ...(delivery ? [categoryDisplay(delivery)] : [])].sort(byOrder);
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
      }));
    }
    return this.getCategoryTree(categoryId)?.subcategories ?? [];
  }

  getDoctorAppointmentItems(): readonly SubcategoryDisplay[] {
    return this.getCategoryTree(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID)?.doctorAppointmentItems ?? [];
  }

  getSpecialtyColumnItems(): readonly SpecialtyColumnItem[] {
    const normal = subcategories.map((item) => ({ categoryId: item.categoryId, originalId: item.originalId, titleEn: item.titleEn }));
    const collectionMembers = categories.filter((item) => item.collection !== null).map((item) => ({ categoryId: item.collection!, originalId: item.id, titleEn: item.titleEn }));
    const delivery = categories.find((item) => item.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID);
    return [...normal, ...collectionMembers, ...(delivery ? [{ categoryId: delivery.id, originalId: delivery.id, titleEn: delivery.titleEn }] : [])];
  }

  getRandomMainCategories(count: number): readonly CategoryDisplay[] {
    return [...this.getAllDisplayCategories()].sort(() => Math.random() - 0.5).slice(0, Math.max(0, count));
  }

  getRandomSubcategories(count: number): readonly SubcategoryDisplay[] {
    return [...subcategories.map(subcategoryDisplay)].sort(() => Math.random() - 0.5).slice(0, Math.max(0, count));
  }

  resolveSelection(input: CategorySelectionInput): CategorySelectionResult {
    if (input.main.kind === "category" && input.child.kind === "subcategory") {
      if (!categories.some((item) => item.id === input.main.id && item.collection === null)) return { valid: false, code: "MAIN_NOT_FOUND" };
      if (!subcategories.some((item) => item.originalId === input.child.id)) return { valid: false, code: "CHILD_NOT_FOUND" };
      if (!subcategories.some((item) => item.categoryId === input.main.id && item.originalId === input.child.id)) return { valid: false, code: "INVALID_RELATION" };
      return { valid: true, selection: input };
    }
    if (input.main.kind === "collection" && input.child.kind === "collection-member") {
      if (!categories.some((item) => item.collection === input.main.id)) return { valid: false, code: "MAIN_NOT_FOUND" };
      if (!categories.some((item) => item.id === input.child.id)) return { valid: false, code: "CHILD_NOT_FOUND" };
      if (!categories.some((item) => item.collection === input.main.id && item.id === input.child.id)) return { valid: false, code: "INVALID_RELATION" };
      return { valid: true, selection: input };
    }
    return { valid: false, code: "INVALID_RELATION" };
  }

  resolveLegacyProductSelection(mainCategoryId: string, subcategoryId: string): CategorySelectionResult {
    const mainId = Number(mainCategoryId);
    const childId = Number(subcategoryId);
    if (!Number.isInteger(mainId) || !Number.isInteger(childId)) return { valid: false, code: "INVALID_RELATION" };
    const isCollection = this.getCollections().some((collection) => collection.id === mainId);
    return this.resolveSelection(isCollection
      ? { main: { kind: "collection", id: mainId }, child: { kind: "collection-member", id: childId } }
      : { main: { kind: "category", id: mainId }, child: { kind: "subcategory", id: childId } });
  }

}

export const categoryService = new CategoryService();
