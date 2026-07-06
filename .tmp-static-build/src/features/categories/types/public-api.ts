export type CategoryNodeKind = "category" | "collection" | "virtual-group";

export interface CategoryDisplay {
  id: number;
  canonicalKey: string;
  kind: "category" | "collection";
  nameAr: string;
  nameEn: string;
  image: string;
  imageUrl: string;
  order: number | null;
  isCollection: boolean;
}

export interface SubcategoryDisplay {
  id: number | "virtual:doctor-appointment";
  canonicalKey: string;
  kind: "subcategory" | "collection-member" | "virtual-group";
  originalId?: number;
  nameAr: string;
  nameEn: string;
  image: string;
  imageUrl: string;
  selectable: boolean;
  isDoctorAppointmentGroup?: boolean;
}

export interface CollectionDisplay {
  id: number;
  canonicalKey: string;
  nameAr: string;
  nameEn: string;
  image: string;
  imageUrl: string;
  order: number | null;
  items: CategoryDisplay[];
}

export interface MainCategoryOption {
  id: number;
  canonicalKey?: string;
  titleAr: string;
  titleEn: string;
  isCollection: boolean;
  order: number | null;
}

export interface SubcategoryOption {
  value: string;
  canonicalKey?: string;
  kind?: "subcategory" | "collection-member" | "virtual-group";
  titleAr: string;
  titleEn: string;
  selectable?: boolean;
}

export interface CategoryTree {
  category: CategoryDisplay;
  subcategories: SubcategoryDisplay[];
  doctorAppointmentItems: SubcategoryDisplay[];
}

export interface DeveloperCategoryDetail {
  canonicalKey: string;
  kind: CategoryNodeKind | "subcategory" | "collection-member";
  id: number | string;
  parentId?: number;
  originalId?: number;
  nameAr: string;
  nameEn: string;
  image: string;
  imageUrl: string;
  order?: number | null;
  memberIds?: number[];
}

export interface DeveloperCatalogCategory {
  id: number;
  titleAr: string;
  titleEn: string;
  image: string;
  collection: number | null;
  collectionAr: string | null;
  collectionEn: string | null;
  collectionImage: string | null;
  order: number | null;
}

export interface DeveloperCatalogSubcategory {
  id: number;
  categoryId: number;
  originalId: number;
  titleAr: string;
  titleEn: string;
  image: string;
  subCollection: number | null;
}

export interface DeveloperCatalog {
  categories: readonly DeveloperCatalogCategory[];
  subcategories: readonly DeveloperCatalogSubcategory[];
}

export interface SpecialtyColumnItem {
  categoryId: number;
  originalId: number;
  titleEn: string;
}

export type CategorySelectionInput =
  | { main: { kind: "category"; id: number }; child: { kind: "subcategory"; id: number } }
  | { main: { kind: "collection"; id: number }; child: { kind: "collection-member"; id: number } };

export type CategorySelectionResult =
  | { valid: true; selection: CategorySelectionInput }
  | { valid: false; code: "MAIN_NOT_FOUND" | "CHILD_NOT_FOUND" | "INVALID_RELATION" };
