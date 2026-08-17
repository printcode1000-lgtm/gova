import type { ProductStyleSettingsComponents } from "./style-types";
import {
  booleanValue,
  createDefaultProductStyleComponents,
  positiveInteger,
} from "./style-types";

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
      share: booleanValue(value?.order?.share, defaults.order.share),
      profile: booleanValue(value?.order?.profile, defaults.order.profile),
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
): ProductStyleSettingsComponents {
  return components;
}
