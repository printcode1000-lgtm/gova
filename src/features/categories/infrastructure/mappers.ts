import type { RawCategory, RawSubcategory } from "./raw-dtos";
import type { Category as DomainCategory } from "../domain/entities/category.entity";
import type { Subcategory as DomainSubcategory } from "../domain/entities/subcategory.entity";

export function mapRawCategory(raw: RawCategory): DomainCategory {
  return {
    id: raw.id,
    titleAr: raw.title_ar,
    titleEn: raw.title_en,
    icon: raw.icon ?? "",
    image: raw.image,
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
    collection: raw.collection,
    collectionAr: raw.collection_ar ?? null,
    collectionEn: raw.collection_en ?? null,
    collectionImage: raw.collection_image ?? null,
    order: raw.order,
  };
}

export function mapRawSubcategory(raw: RawSubcategory): DomainSubcategory {
  const subCollection = typeof raw.sub_collection === "string" 
    ? (raw.sub_collection === "" ? null : Number(raw.sub_collection)) 
    : raw.sub_collection;

  return {
    id: raw.id,
    categoryId: raw.category_id,
    originalId: raw.original_id,
    titleAr: raw.title_ar,
    titleEn: raw.title_en,
    icon: raw.icon ?? "",
    image: raw.image,
    createdAt: raw.created_at ?? "",
    updatedAt: raw.updated_at ?? "",
    subCollection,
  };
}
