import { CATEGORY_CONSTANTS } from "@/features/categories";
import type { ProductSearchField } from "../entities/product-search.types";

const BASIC_FIELDS: ProductSearchField[] = [
  { key: "name", column: "main_name", labelAr: "اسم المنتج", labelEn: "Product name", group: "basic", componentKey: "mainData", optionKey: "name" },
  { key: "description", column: "main_description", labelAr: "الوصف", labelEn: "Description", group: "basic", componentKey: "mainData", optionKey: "description" },
  { key: "brand", column: "main_brand", labelAr: "العلامة التجارية", labelEn: "Brand", group: "basic", componentKey: "mainData", optionKey: "brand" },
  { key: "manufacturer", column: "main_manufacturer", labelAr: "الشركة المصنعة", labelEn: "Manufacturer", group: "basic", componentKey: "mainData", optionKey: "manufacturer" },
  { key: "priceLabel", column: "price_label", labelAr: "نص السعر", labelEn: "Price label", group: "basic", componentKey: "price", optionKey: "label" },
];

const SPECIFICATION_FIELDS: ProductSearchField[] = [
  { key: "color", column: "spec_color", labelAr: "اللون", labelEn: "Color", group: "specifications", componentKey: "specifications", optionKey: "color" },
  { key: "dimensions", column: "spec_dimensions", labelAr: "الأبعاد", labelEn: "Dimensions", group: "specifications", componentKey: "specifications", optionKey: "dimensions" },
  { key: "condition", column: "spec_condition", labelAr: "الحالة", labelEn: "Condition", group: "specifications", componentKey: "specifications", optionKey: "condition" },
  { key: "size", column: "spec_size", labelAr: "المقاس", labelEn: "Size", group: "specifications", componentKey: "specifications", optionKey: "size" },
  { key: "weight", column: "spec_weight", labelAr: "الوزن", labelEn: "Weight", group: "specifications", componentKey: "specifications", optionKey: "weight" },
  { key: "year", column: "spec_year", labelAr: "سنة الصنع", labelEn: "Year", group: "specifications", componentKey: "specifications", optionKey: "year" },
];

const RATING_FIELDS: ProductSearchField[] = [
  { key: "ratingValue", column: "rating_value", labelAr: "قيمة التقييم", labelEn: "Rating value", group: "rating", componentKey: "rating", optionKey: "value" },
];

const VEHICLE_FIELDS: ProductSearchField[] = [
  { key: "vehicleBrand", column: "vehicle_brand", labelAr: "ماركة المركبة", labelEn: "Vehicle brand", group: "vehicle", componentKey: "vehicleSpecs", optionKey: "brand" },
  { key: "vehicleBodyType", column: "vehicle_body_type", labelAr: "نوع الهيكل", labelEn: "Body type", group: "vehicle", componentKey: "vehicleSpecs", optionKey: "bodyType" },
  { key: "vehicleFuel", column: "vehicle_fuel", labelAr: "الوقود", labelEn: "Fuel", group: "vehicle", componentKey: "vehicleSpecs", optionKey: "fuel" },
  { key: "vehicleTransmission", column: "vehicle_transmission", labelAr: "ناقل الحركة", labelEn: "Transmission", group: "vehicle", componentKey: "vehicleSpecs", optionKey: "transmission" },
  { key: "vehicleSpecial", column: "vehicle_special", labelAr: "مواصفات خاصة", labelEn: "Special specs", group: "vehicle", componentKey: "vehicleSpecs", optionKey: "special" },
];

const PROPERTY_FIELDS: ProductSearchField[] = [
  { key: "propertyArea", column: "property_area", labelAr: "المساحة", labelEn: "Area", group: "property", componentKey: "propertySpecs", optionKey: "area" },
  { key: "propertyRooms", column: "property_rooms", labelAr: "عدد الغرف", labelEn: "Rooms", group: "property", componentKey: "propertySpecs", optionKey: "rooms" },
  { key: "propertyBathrooms", column: "property_bathrooms", labelAr: "عدد الحمامات", labelEn: "Bathrooms", group: "property", componentKey: "propertySpecs", optionKey: "bathrooms" },
  { key: "propertyType", column: "property_type", labelAr: "نوع العقار", labelEn: "Property type", group: "property", componentKey: "propertySpecs", optionKey: "type" },
  { key: "propertyAddress", column: "property_address", labelAr: "العنوان", labelEn: "Address", group: "property", componentKey: "propertySpecs", optionKey: "address" },
  { key: "propertyFinishing", column: "property_finishing", labelAr: "التشطيب", labelEn: "Finishing", group: "property", componentKey: "propertySpecs", optionKey: "finishing" },
];

const PHARMACY_FIELDS: ProductSearchField[] = [
  { key: "pharmacyCategory", column: "pharmacy_category", labelAr: "تصنيف الصيدلية", labelEn: "Pharmacy category", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "pharmacyCategory" },
  { key: "pharmacySubcategory", column: "pharmacy_subcategory", labelAr: "التصنيف الفرعي للصيدلية", labelEn: "Pharmacy subcategory", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "pharmacySubcategory" },
  { key: "activeIngredient", column: "pharmacy_active_ingredient", labelAr: "المادة الفعالة", labelEn: "Active ingredient", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "activeIngredient" },
  { key: "pharmacyNameAr", column: "pharmacy_name_ar", labelAr: "الاسم العربي", labelEn: "Arabic name", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "nameAr" },
  { key: "pharmacyNameEn", column: "pharmacy_name_en", labelAr: "الاسم الإنجليزي", labelEn: "English name", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "nameEn" },
  { key: "pharmacyForm", column: "pharmacy_form", labelAr: "شكل الدواء", labelEn: "Medicine form", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "form" },
  { key: "pharmacyConcentration", column: "pharmacy_concentration", labelAr: "التركيز", labelEn: "Concentration", group: "pharmacy", componentKey: "pharmacySpecs", optionKey: "concentration" },
];

const ALL_FIELDS = [
  ...BASIC_FIELDS,
  ...RATING_FIELDS,
  ...SPECIFICATION_FIELDS,
  ...VEHICLE_FIELDS,
  ...PROPERTY_FIELDS,
  ...PHARMACY_FIELDS,
];

function isPharmacySelection(mainCategoryId: string, subcategoryId: string) {
  return mainCategoryId === String(CATEGORY_CONSTANTS.MEDICAL_SERVICES_ID) && subcategoryId === "204";
}

function isVehicleSelection(mainCategoryId: string) {
  return mainCategoryId === "6" || mainCategoryId === "7";
}

function isPropertySelection(mainCategoryId: string) {
  return mainCategoryId === "5" || mainCategoryId === "8";
}

export function getBaseProductSearchFields(
  mainCategoryId: string,
  subcategoryId: string,
): ProductSearchField[] {
  if (!mainCategoryId || !subcategoryId) return [];
  const fields = [...BASIC_FIELDS, ...RATING_FIELDS, ...SPECIFICATION_FIELDS];
  if (isVehicleSelection(mainCategoryId)) fields.push(...VEHICLE_FIELDS);
  if (isPropertySelection(mainCategoryId)) fields.push(...PROPERTY_FIELDS);
  if (isPharmacySelection(mainCategoryId, subcategoryId)) fields.push(...PHARMACY_FIELDS);
  return fields;
}

export function getProductSearchFields(
  mainCategoryId: string,
  subcategoryId: string,
): ProductSearchField[] {
  return getBaseProductSearchFields(mainCategoryId, subcategoryId);
}

export function getProductSearchFieldByKey(key: string) {
  return ALL_FIELDS.find((field) => field.key === key) ?? null;
}

export function getDefaultProductSearchFieldKeys(mainCategoryId: string, subcategoryId: string) {
  return getProductSearchFields(mainCategoryId, subcategoryId)
    .filter((field) => field.group === "basic")
    .map((field) => field.key);
}
