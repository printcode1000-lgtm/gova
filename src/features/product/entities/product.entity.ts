import type { StoredImage } from "@/core/storage/types/stored-image.types";

export type ProductStatus = "draft" | "active" | "archived";
export type ProductRatingMode = "" | "stars" | "stars-comments";

export interface ProductMainData {
  name: string;
  brand: string;
  manufacturer: string;
  available: boolean;
  description: string;
}

export interface ProductPriceData {
  current: string;
  beforeDiscount: string;
  label: string;
  needsCar: boolean;
}

export interface ProductSpecificationsData {
  color: string;
  dimensions: string;
  condition: string;
  size: string;
  weight: string;
  year: string;
}

export interface ProductVehicleSpecsData {
  brand: string;
  bodyType: string;
  fuel: string;
  transmission: string;
  special: string;
}

export interface ProductPropertySpecsData {
  area: string;
  rooms: string;
  bathrooms: string;
  type: string;
  address: string;
  locationLatitude: string;
  locationLongitude: string;
  finishing: string;
}

export interface ProductPharmacyCatalogData {
  kind: string;
  categoryId: string;
  categoryNameAr: string;
  categoryNameEn: string;
  subcategoryId: string;
  subcategoryNameAr: string;
  subcategoryNameEn: string;
  fixedProductId: string;
}

export interface ProductPharmacySpecsData {
  pharmacyCategoryId: string;
  pharmacyCategory: string;
  pharmacySubcategoryId: string;
  pharmacySubcategory: string;
  activeIngredientId: string;
  activeIngredient: string;
  nameAr: string;
  nameEn: string;
  formId: string;
  form: string;
  concentrationId: string;
  concentration: string;
  prescriptionRequired: boolean;
}

export interface ProductRatingData {
  rating: string;
  comment: string;
  enabled: boolean;
  targetEnabled: boolean;
  mode: ProductRatingMode;
}

export interface ProductDetails {
  mainData: ProductMainData;
  price: ProductPriceData;
  specifications: ProductSpecificationsData;
  vehicleSpecs: ProductVehicleSpecsData;
  propertySpecs: ProductPropertySpecsData;
  pharmacyCatalog: ProductPharmacyCatalogData;
  pharmacySpecs: ProductPharmacySpecsData;
  rating: ProductRatingData;
  images: StoredImage[];
}

export interface ProductRecord extends ProductDetails {
  id: string;
  uid: string;
  mainCategoryId: string;
  subcategoryId: string;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput extends ProductDetails {
  uid: string;
  mainCategoryId: string;
  subcategoryId: string;
  status?: ProductStatus;
}

export interface UpdateProductInput extends ProductDetails {
  id: string;
  uid: string;
  status?: ProductStatus;
}

export function createEmptyProductDetails(
  overrides: Partial<ProductDetails> = {},
): ProductDetails {
  return {
    mainData: {
      name: "",
      brand: "",
      manufacturer: "",
      available: true,
      description: "",
      ...overrides.mainData,
    },
    price: {
      current: "",
      beforeDiscount: "",
      label: "",
      needsCar: false,
      ...overrides.price,
    },
    specifications: {
      color: "",
      dimensions: "",
      condition: "",
      size: "",
      weight: "",
      year: "",
      ...overrides.specifications,
    },
    vehicleSpecs: {
      brand: "",
      bodyType: "",
      fuel: "",
      transmission: "",
      special: "",
      ...overrides.vehicleSpecs,
    },
    propertySpecs: {
      area: "",
      rooms: "",
      bathrooms: "",
      type: "",
      address: "",
      locationLatitude: "",
      locationLongitude: "",
      finishing: "",
      ...overrides.propertySpecs,
    },
    pharmacyCatalog: {
      kind: "",
      categoryId: "",
      categoryNameAr: "",
      categoryNameEn: "",
      subcategoryId: "",
      subcategoryNameAr: "",
      subcategoryNameEn: "",
      fixedProductId: "",
      ...overrides.pharmacyCatalog,
    },
    pharmacySpecs: {
      pharmacyCategoryId: "",
      pharmacyCategory: "",
      pharmacySubcategoryId: "",
      pharmacySubcategory: "",
      activeIngredientId: "",
      activeIngredient: "",
      nameAr: "",
      nameEn: "",
      formId: "",
      form: "",
      concentrationId: "",
      concentration: "",
      prescriptionRequired: false,
      ...overrides.pharmacySpecs,
    },
    rating: {
      rating: "",
      comment: "",
      enabled: true,
      targetEnabled: true,
      mode: "",
      ...overrides.rating,
    },
    images: overrides.images ?? [],
  };
}

export function toProductDetails(product: ProductDetails): ProductDetails {
  return createEmptyProductDetails(product);
}
