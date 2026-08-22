import type {
  ProductDetails,
  ProductRatingMode,
} from "./product.entity";
import { createEmptyProductDetails } from "./product.entity";

function clean(value: unknown, max = 10000): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

export function normalizeProductDetails(value: ProductDetails): ProductDetails {
  const details = createEmptyProductDetails(value);
  const images = Array.isArray(value?.images)
    ? value.images
        .filter((image) => image && typeof image.imageKey === "string")
        .map((image) => ({
          imageKey: image.imageKey,
          url: "",
          ...(typeof image.storageProfileId === "string" &&
          image.storageProfileId &&
          image.storageProfileId !== "product-default"
            ? { storageProfileId: image.storageProfileId }
            : {}),
        }))
        .slice(0, 20)
    : [];
  return createEmptyProductDetails({
    ...details,
    mainData: {
      name: clean(details.mainData.name),
      brand: clean(details.mainData.brand),
      manufacturer: clean(details.mainData.manufacturer),
      available: details.mainData.available === true,
      description: clean(details.mainData.description),
    },
    price: {
      current: clean(details.price.current, 120),
      beforeDiscount: clean(details.price.beforeDiscount, 120),
      label: clean(details.price.label, 500),
      needsCar: details.price.needsCar === true,
    },
    pharmacySpecs: {
      ...details.pharmacySpecs,
      prescriptionRequired: details.pharmacySpecs.prescriptionRequired === true,
    },
    rating: {
      rating: clean(details.rating.rating, 120),
      comment: clean(details.rating.comment),
      enabled: details.rating.enabled !== false,
      targetEnabled: details.rating.targetEnabled !== false,
      mode: normalizeRatingMode(details.rating.mode),
    },
    images,
  });
}

export function normalizeRatingMode(value: string): ProductRatingMode {
  return value === "stars" || value === "stars-comments" ? value : "";
}
