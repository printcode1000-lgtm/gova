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
  share: boolean;
  profile: boolean;
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
    share: true,
    profile: true,
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

export function positiveInteger(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isInteger(next) && next >= 1 ? next : fallback;
}

export function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
