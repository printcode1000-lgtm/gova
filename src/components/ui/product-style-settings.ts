import type { ProductStyleComponents } from "@/components/product/product-component.types";

export type RatingMode = "stars" | "stars-comments";

export interface ProductImagesStyleSettings {
  visible: boolean;
  count: number;
  order: number;
}

export interface ProductRatingStyleSettings {
  visible: boolean;
  type: RatingMode;
  order: number;
}

export interface ProductPriceStyleSettings {
  visible: boolean;
  current: boolean;
  beforeDiscount: boolean;
  needsCar: boolean;
  order: number;
}

export interface ProductOrderStyleSettings {
  visible: boolean;
  cart: boolean;
  favorite: boolean;
  contact: boolean;
  order: number;
}

export interface ProductMainDataStyleSettings {
  visible: boolean;
  name: boolean;
  brand: boolean;
  manufacturer: boolean;
  available: boolean;
  description: boolean;
  order: number;
}

export interface ProductSpecificationsStyleSettings {
  visible: boolean;
  color: boolean;
  dimensions: boolean;
  condition: boolean;
  size: boolean;
  weight: boolean;
  year: boolean;
  order: number;
}

export interface ProductVehicleSpecsStyleSettings {
  visible: boolean;
  brand: boolean;
  bodyType: boolean;
  fuel: boolean;
  transmission: boolean;
  special: boolean;
  order: number;
}

export interface ProductPropertySpecsStyleSettings {
  visible: boolean;
  area: boolean;
  rooms: boolean;
  bathrooms: boolean;
  type: boolean;
  address: boolean;
  location: boolean;
  finishing: boolean;
  order: number;
}

export interface ProductPharmacySpecsStyleSettings {
  visible: boolean;
  pharmacyCategory: boolean;
  pharmacySubcategory: boolean;
  nameAr: boolean;
  nameEn: boolean;
  activeIngredient: boolean;
  form: boolean;
  concentration: boolean;
  prescriptionRequired: boolean;
  order: number;
}

export interface ProductSearchColumnSettings {
  mainData: {
    name: boolean;
    brand: boolean;
    manufacturer: boolean;
    available: boolean;
    description: boolean;
  };
  price: {
    current: boolean;
    beforeDiscount: boolean;
    label: boolean;
    needsCar: boolean;
  };
  rating: {
    value: boolean;
  };
  specifications: {
    color: boolean;
    dimensions: boolean;
    condition: boolean;
    size: boolean;
    weight: boolean;
    year: boolean;
  };
  vehicleSpecs: {
    brand: boolean;
    bodyType: boolean;
    fuel: boolean;
    transmission: boolean;
    special: boolean;
  };
  propertySpecs: {
    area: boolean;
    rooms: boolean;
    bathrooms: boolean;
    type: boolean;
    address: boolean;
    location: boolean;
    finishing: boolean;
  };
  pharmacySpecs: {
    pharmacyCategory: boolean;
    pharmacySubcategory: boolean;
    nameAr: boolean;
    nameEn: boolean;
    activeIngredient: boolean;
    form: boolean;
    concentration: boolean;
    prescriptionRequired: boolean;
  };
}

export interface ProductStyleSettingsComponents {
  images: ProductImagesStyleSettings;
  rating: ProductRatingStyleSettings;
  price: ProductPriceStyleSettings;
  order: ProductOrderStyleSettings;
  mainData: ProductMainDataStyleSettings;
  specifications: ProductSpecificationsStyleSettings;
  vehicleSpecs: ProductVehicleSpecsStyleSettings;
  propertySpecs: ProductPropertySpecsStyleSettings;
  pharmacySpecs: ProductPharmacySpecsStyleSettings;
  searchColumns: ProductSearchColumnSettings;
}

export interface ProductStyleSettings {
  mainCategoryId: string;
  subcategoryId: string;
  components: ProductStyleSettingsComponents;
}

export const DEFAULT_PRODUCT_STYLE_COMPONENTS: ProductStyleSettingsComponents = {
  images: { visible: true, count: 4, order: 1 },
  rating: { visible: true, type: "stars-comments", order: 2 },
  price: {
    visible: true,
    current: true,
    beforeDiscount: true,
    needsCar: true,
    order: 3,
  },
  order: {
    visible: true,
    cart: true,
    favorite: true,
    contact: true,
    order: 4,
  },
  mainData: {
    visible: true,
    name: true,
    brand: true,
    manufacturer: true,
    available: true,
    description: true,
    order: 5,
  },
  specifications: {
    visible: true,
    color: true,
    dimensions: true,
    condition: true,
    size: true,
    weight: true,
    year: true,
    order: 6,
  },
  vehicleSpecs: {
    visible: false,
    brand: true,
    bodyType: true,
    fuel: true,
    transmission: true,
    special: true,
    order: 7,
  },
  propertySpecs: {
    visible: false,
    area: true,
    rooms: true,
    bathrooms: true,
    type: true,
    address: true,
    location: true,
    finishing: true,
    order: 8,
  },
  pharmacySpecs: {
    visible: false,
    pharmacyCategory: true,
    pharmacySubcategory: true,
    nameAr: true,
    nameEn: true,
    activeIngredient: true,
    form: true,
    concentration: true,
    prescriptionRequired: true,
    order: 9,
  },
  searchColumns: {
    mainData: {
      name: true,
      brand: true,
      manufacturer: true,
      available: false,
      description: true,
    },
    price: {
      current: false,
      beforeDiscount: false,
      label: true,
      needsCar: false,
    },
    rating: {
      value: true,
    },
    specifications: {
      color: true,
      dimensions: true,
      condition: true,
      size: true,
      weight: true,
      year: true,
    },
    vehicleSpecs: {
      brand: true,
      bodyType: true,
      fuel: true,
      transmission: true,
      special: true,
    },
    propertySpecs: {
      area: true,
      rooms: true,
      bathrooms: true,
      type: true,
      address: true,
      location: false,
      finishing: true,
    },
    pharmacySpecs: {
      pharmacyCategory: true,
      pharmacySubcategory: true,
      nameAr: true,
      nameEn: true,
      activeIngredient: true,
      form: true,
      concentration: true,
      prescriptionRequired: false,
    },
  },
};

export function createDefaultProductStyleComponents(): ProductStyleSettingsComponents {
  return structuredClone(DEFAULT_PRODUCT_STYLE_COMPONENTS);
}

function positiveInteger(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isInteger(next) && next >= 1 ? next : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeProductStyleComponents(
  value: Partial<ProductStyleSettingsComponents> | undefined,
): ProductStyleSettingsComponents {
  const defaults = createDefaultProductStyleComponents();
  return {
    images: {
      visible: booleanValue(value?.images?.visible, defaults.images.visible),
      count: positiveInteger(value?.images?.count, defaults.images.count),
      order: positiveInteger(value?.images?.order, defaults.images.order),
    },
    rating: {
      visible: booleanValue(value?.rating?.visible, defaults.rating.visible),
      type:
        value?.rating?.type === "stars" ||
        value?.rating?.type === "stars-comments"
          ? value.rating.type
          : defaults.rating.type,
      order: positiveInteger(value?.rating?.order, defaults.rating.order),
    },
    price: {
      visible: booleanValue(value?.price?.visible, defaults.price.visible),
      current: booleanValue(value?.price?.current, defaults.price.current),
      beforeDiscount: booleanValue(
        value?.price?.beforeDiscount,
        defaults.price.beforeDiscount,
      ),
      needsCar: booleanValue(value?.price?.needsCar, defaults.price.needsCar),
      order: positiveInteger(value?.price?.order, defaults.price.order),
    },
    order: {
      visible: booleanValue(value?.order?.visible, defaults.order.visible),
      cart: booleanValue(value?.order?.cart, defaults.order.cart),
      favorite: booleanValue(value?.order?.favorite, defaults.order.favorite),
      contact: booleanValue(value?.order?.contact, defaults.order.contact),
      order: positiveInteger(value?.order?.order, defaults.order.order),
    },
    mainData: {
      visible: booleanValue(
        value?.mainData?.visible,
        defaults.mainData.visible,
      ),
      name: booleanValue(value?.mainData?.name, defaults.mainData.name),
      brand: booleanValue(value?.mainData?.brand, defaults.mainData.brand),
      manufacturer: booleanValue(
        value?.mainData?.manufacturer,
        defaults.mainData.manufacturer,
      ),
      available: booleanValue(
        value?.mainData?.available,
        defaults.mainData.available,
      ),
      description: booleanValue(
        value?.mainData?.description,
        defaults.mainData.description,
      ),
      order: positiveInteger(value?.mainData?.order, defaults.mainData.order),
    },
    specifications: {
      visible: booleanValue(
        value?.specifications?.visible,
        defaults.specifications.visible,
      ),
      color: booleanValue(
        value?.specifications?.color,
        defaults.specifications.color,
      ),
      dimensions: booleanValue(
        value?.specifications?.dimensions,
        defaults.specifications.dimensions,
      ),
      condition: booleanValue(
        value?.specifications?.condition,
        defaults.specifications.condition,
      ),
      size: booleanValue(
        value?.specifications?.size,
        defaults.specifications.size,
      ),
      weight: booleanValue(
        value?.specifications?.weight,
        defaults.specifications.weight,
      ),
      year: booleanValue(
        value?.specifications?.year,
        defaults.specifications.year,
      ),
      order: positiveInteger(
        value?.specifications?.order,
        defaults.specifications.order,
      ),
    },
    vehicleSpecs: {
      visible: booleanValue(
        value?.vehicleSpecs?.visible,
        defaults.vehicleSpecs.visible,
      ),
      brand: booleanValue(
        value?.vehicleSpecs?.brand,
        defaults.vehicleSpecs.brand,
      ),
      bodyType: booleanValue(
        value?.vehicleSpecs?.bodyType,
        defaults.vehicleSpecs.bodyType,
      ),
      fuel: booleanValue(value?.vehicleSpecs?.fuel, defaults.vehicleSpecs.fuel),
      transmission: booleanValue(
        value?.vehicleSpecs?.transmission,
        defaults.vehicleSpecs.transmission,
      ),
      special: booleanValue(
        value?.vehicleSpecs?.special,
        defaults.vehicleSpecs.special,
      ),
      order: positiveInteger(
        value?.vehicleSpecs?.order,
        defaults.vehicleSpecs.order,
      ),
    },
    propertySpecs: {
      visible: booleanValue(
        value?.propertySpecs?.visible,
        defaults.propertySpecs.visible,
      ),
      area: booleanValue(
        value?.propertySpecs?.area,
        defaults.propertySpecs.area,
      ),
      rooms: booleanValue(
        value?.propertySpecs?.rooms,
        defaults.propertySpecs.rooms,
      ),
      bathrooms: booleanValue(
        value?.propertySpecs?.bathrooms,
        defaults.propertySpecs.bathrooms,
      ),
      type: booleanValue(
        value?.propertySpecs?.type,
        defaults.propertySpecs.type,
      ),
      address: booleanValue(
        value?.propertySpecs?.address,
        defaults.propertySpecs.address,
      ),
      location: booleanValue(
        value?.propertySpecs?.location,
        defaults.propertySpecs.location,
      ),
      finishing: booleanValue(
        value?.propertySpecs?.finishing,
        defaults.propertySpecs.finishing,
      ),
      order: positiveInteger(
        value?.propertySpecs?.order,
        defaults.propertySpecs.order,
      ),
    },
    pharmacySpecs: {
      visible: booleanValue(
        value?.pharmacySpecs?.visible,
        defaults.pharmacySpecs.visible,
      ),
      pharmacyCategory: booleanValue(
        value?.pharmacySpecs?.pharmacyCategory,
        defaults.pharmacySpecs.pharmacyCategory,
      ),
      pharmacySubcategory: booleanValue(
        value?.pharmacySpecs?.pharmacySubcategory,
        defaults.pharmacySpecs.pharmacySubcategory,
      ),
      nameAr: booleanValue(
        value?.pharmacySpecs?.nameAr,
        defaults.pharmacySpecs.nameAr,
      ),
      nameEn: booleanValue(
        value?.pharmacySpecs?.nameEn,
        defaults.pharmacySpecs.nameEn,
      ),
      form: booleanValue(
        value?.pharmacySpecs?.form,
        defaults.pharmacySpecs.form,
      ),
      concentration: booleanValue(
        value?.pharmacySpecs?.concentration,
        defaults.pharmacySpecs.concentration,
      ),
      activeIngredient: booleanValue(
        value?.pharmacySpecs?.activeIngredient,
        defaults.pharmacySpecs.activeIngredient,
      ),
      prescriptionRequired: booleanValue(
        value?.pharmacySpecs?.prescriptionRequired,
        defaults.pharmacySpecs.prescriptionRequired,
      ),
      order: positiveInteger(
        value?.pharmacySpecs?.order,
        defaults.pharmacySpecs.order,
      ),
    },
    searchColumns: {
      mainData: {
        name: booleanValue(value?.searchColumns?.mainData?.name, defaults.searchColumns.mainData.name),
        brand: booleanValue(value?.searchColumns?.mainData?.brand, defaults.searchColumns.mainData.brand),
        manufacturer: booleanValue(value?.searchColumns?.mainData?.manufacturer, defaults.searchColumns.mainData.manufacturer),
        available: booleanValue(value?.searchColumns?.mainData?.available, defaults.searchColumns.mainData.available),
        description: booleanValue(value?.searchColumns?.mainData?.description, defaults.searchColumns.mainData.description),
      },
      price: {
        current: booleanValue(value?.searchColumns?.price?.current, defaults.searchColumns.price.current),
        beforeDiscount: booleanValue(value?.searchColumns?.price?.beforeDiscount, defaults.searchColumns.price.beforeDiscount),
        label: booleanValue(value?.searchColumns?.price?.label, defaults.searchColumns.price.label),
        needsCar: booleanValue(value?.searchColumns?.price?.needsCar, defaults.searchColumns.price.needsCar),
      },
      rating: {
        value: booleanValue(value?.searchColumns?.rating?.value, defaults.searchColumns.rating.value),
      },
      specifications: {
        color: booleanValue(value?.searchColumns?.specifications?.color, defaults.searchColumns.specifications.color),
        dimensions: booleanValue(value?.searchColumns?.specifications?.dimensions, defaults.searchColumns.specifications.dimensions),
        condition: booleanValue(value?.searchColumns?.specifications?.condition, defaults.searchColumns.specifications.condition),
        size: booleanValue(value?.searchColumns?.specifications?.size, defaults.searchColumns.specifications.size),
        weight: booleanValue(value?.searchColumns?.specifications?.weight, defaults.searchColumns.specifications.weight),
        year: booleanValue(value?.searchColumns?.specifications?.year, defaults.searchColumns.specifications.year),
      },
      vehicleSpecs: {
        brand: booleanValue(value?.searchColumns?.vehicleSpecs?.brand, defaults.searchColumns.vehicleSpecs.brand),
        bodyType: booleanValue(value?.searchColumns?.vehicleSpecs?.bodyType, defaults.searchColumns.vehicleSpecs.bodyType),
        fuel: booleanValue(value?.searchColumns?.vehicleSpecs?.fuel, defaults.searchColumns.vehicleSpecs.fuel),
        transmission: booleanValue(value?.searchColumns?.vehicleSpecs?.transmission, defaults.searchColumns.vehicleSpecs.transmission),
        special: booleanValue(value?.searchColumns?.vehicleSpecs?.special, defaults.searchColumns.vehicleSpecs.special),
      },
      propertySpecs: {
        area: booleanValue(value?.searchColumns?.propertySpecs?.area, defaults.searchColumns.propertySpecs.area),
        rooms: booleanValue(value?.searchColumns?.propertySpecs?.rooms, defaults.searchColumns.propertySpecs.rooms),
        bathrooms: booleanValue(value?.searchColumns?.propertySpecs?.bathrooms, defaults.searchColumns.propertySpecs.bathrooms),
        type: booleanValue(value?.searchColumns?.propertySpecs?.type, defaults.searchColumns.propertySpecs.type),
        address: booleanValue(value?.searchColumns?.propertySpecs?.address, defaults.searchColumns.propertySpecs.address),
        location: booleanValue(value?.searchColumns?.propertySpecs?.location, defaults.searchColumns.propertySpecs.location),
        finishing: booleanValue(value?.searchColumns?.propertySpecs?.finishing, defaults.searchColumns.propertySpecs.finishing),
      },
      pharmacySpecs: {
        pharmacyCategory: booleanValue(value?.searchColumns?.pharmacySpecs?.pharmacyCategory, defaults.searchColumns.pharmacySpecs.pharmacyCategory),
        pharmacySubcategory: booleanValue(value?.searchColumns?.pharmacySpecs?.pharmacySubcategory, defaults.searchColumns.pharmacySpecs.pharmacySubcategory),
        nameAr: booleanValue(value?.searchColumns?.pharmacySpecs?.nameAr, defaults.searchColumns.pharmacySpecs.nameAr),
        nameEn: booleanValue(value?.searchColumns?.pharmacySpecs?.nameEn, defaults.searchColumns.pharmacySpecs.nameEn),
        activeIngredient: booleanValue(value?.searchColumns?.pharmacySpecs?.activeIngredient, defaults.searchColumns.pharmacySpecs.activeIngredient),
        form: booleanValue(value?.searchColumns?.pharmacySpecs?.form, defaults.searchColumns.pharmacySpecs.form),
        concentration: booleanValue(value?.searchColumns?.pharmacySpecs?.concentration, defaults.searchColumns.pharmacySpecs.concentration),
        prescriptionRequired: booleanValue(value?.searchColumns?.pharmacySpecs?.prescriptionRequired, defaults.searchColumns.pharmacySpecs.prescriptionRequired),
      },
    },
  };
}

export function toProductStyleComponents(
  components: ProductStyleSettingsComponents,
): ProductStyleComponents {
  return components as unknown as ProductStyleComponents;
}
