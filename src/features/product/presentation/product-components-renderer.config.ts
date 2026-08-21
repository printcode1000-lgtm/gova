export type BasicFieldKind = "text" | "number" | "textarea" | "boolean";

export const PRODUCT_COMPONENT_FIELDS: Record<string, Array<[string, string, BasicFieldKind]>> = {
  mainData: [
    ["name", "الاسم", "text"],
    ["brand", "العلامة التجارية", "text"],
    ["manufacturer", "الشركة المصنعة", "text"],
    ["available", "متوفر", "boolean"],
    ["description", "الوصف", "textarea"],
  ],
  price: [
    ["current", "السعر الحالي", "number"],
    ["beforeDiscount", "السعر قبل الخصم", "number"],
    ["needsCar", "يحتاج سيارة نقل", "boolean"],
  ],
  specifications: [
    ["color", "اللون", "text"],
    ["dimensions", "الأبعاد", "text"],
    ["condition", "الحالة", "text"],
    ["size", "المقاس", "text"],
    ["weight", "الوزن", "text"],
    ["year", "السنة", "number"],
  ],
  propertySpecs: [
    ["area", "المساحة", "text"],
    ["rooms", "عدد الغرف", "number"],
    ["bathrooms", "عدد الحمامات", "number"],
    ["type", "نوع العقار", "text"],
    ["address", "العنوان", "text"],
    ["finishing", "التشطيب", "text"],
  ],
  rating: [
    ["rating", "التقييم", "number"],
    ["comment", "التعليق", "textarea"],
  ],
};

export const PRODUCT_COMPONENT_TITLES: Record<string, string> = {
  images: "الصور",
  rating: "التقييم",
  price: "السعر",
  order: "الطلب",
  mainData: "البيانات الأساسية",
  specifications: "المواصفات",
  vehicleSpecs: "مواصفات المركبة",
  propertySpecs: "مواصفات العقار",
  pharmacySpecs: "مواصفات الصيدلية",
};
