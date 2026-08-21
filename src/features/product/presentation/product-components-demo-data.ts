import type { StoredImage } from "@asol/storage-core";

import {
  createEmptyProductDetails,
  type ProductDetails,
} from "@/features/product/entities/product.entity";

export const PRODUCT_DEMO_IMAGES: StoredImage[] = [
  {
    imageKey: "demo-product-1.webp",
    url: "/images/subCategories/Allergy and Immunology.webp",
  },
  {
    imageKey: "demo-product-2.webp",
    url: "/images/subCategories/Animal Care & Training.webp",
  },
  {
    imageKey: "demo-product-3.webp",
    url: "/images/subCategories/Apartments & Houses for Sale.webp",
  },
  {
    imageKey: "demo-product-4.webp",
    url: "/images/subCategories/Art Tools & Supplies.webp",
  },
];

export const PRODUCT_DEMO_DETAILS: ProductDetails = createEmptyProductDetails({
  rating: {
    rating: "4",
    comment: "منتج ممتاز وجودته جيدة جدًا",
    enabled: true,
    targetEnabled: true,
    mode: "",
  },
  price: {
    current: "1250",
    beforeDiscount: "1500",
    label: "",
    needsCar: false,
  },
  mainData: {
    name: "منتج تجريبي",
    brand: "أصول",
    manufacturer: "الشركة المصنعة",
    available: true,
    description: "وصف تجريبي للمنتج أو الخدمة المعروضة.",
  },
  specifications: {
    color: "أسود",
    dimensions: "40 x 30 x 15 سم",
    condition: "جديد",
    size: "متوسط",
    weight: "2 كجم",
    year: "2026",
  },
  vehicleSpecs: {
    brand: "toyota",
    bodyType: "sedan",
    fuel: "benzine",
    transmission: "automatic",
    special: "special_needs",
  },
  propertySpecs: {
    area: "180 م²",
    rooms: "3",
    bathrooms: "2",
    type: "شقة",
    address: "القاهرة الجديدة",
    locationLatitude: "",
    locationLongitude: "",
    finishing: "سوبر لوكس",
  },
  pharmacySpecs: {
    pharmacyCategoryId: "",
    pharmacyCategory: "الأدوية والعلاج",
    pharmacySubcategoryId: "",
    pharmacySubcategory: "مسكنات الألم وخافض الحرارة",
    activeIngredientId: "",
    activeIngredient: "باراسيتامول",
    nameAr: "دواء تجريبي",
    nameEn: "Demo Medicine",
    formId: "",
    form: "أقراص",
    concentrationId: "",
    concentration: "500 مجم",
    prescriptionRequired: false,
  },
});
