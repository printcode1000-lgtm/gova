import type { ProductRecord } from "@/features/product/entities/product.entity";
import type {
  FeaturedProductCardInput,
  ProductCardBadge,
  ProductCardViewModel,
} from "../entities/product-card.types";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberFromText(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function productCardTitle(product: ProductRecord): string {
  return (
    text(product.mainData.name) ||
    text(product.pharmacySpecs.nameAr) ||
    text(product.pharmacySpecs.nameEn) ||
    product.id
  );
}

export function productCardImage(product: ProductRecord): string {
  return text(product.images.find((image) => text(image.url))?.url);
}

export function productCardPrice(product: ProductRecord): string {
  return text(product.price.current) || text(product.price.label);
}

export function productCardHref(product: ProductRecord): string {
  const params = new URLSearchParams({
    mode: "view",
    productId: product.id,
    mainCategoryId: product.mainCategoryId,
    subcategoryId: product.subcategoryId,
  });
  return `/product?${params.toString()}`;
}

export function productCardBadges(product: ProductRecord): ProductCardBadge[] {
  const badges: ProductCardBadge[] = [];
  if (!product.mainData.available) {
    badges.push({ label: "غير متوفر", tone: "danger" });
  }
  if (product.price.needsCar) {
    badges.push({ label: "يحتاج سيارة نقل", tone: "tertiary" });
  }
  if (product.pharmacySpecs.prescriptionRequired) {
    badges.push({ label: "يتطلب روشتة", tone: "primary" });
  }
  if (product.status === "draft") {
    badges.push({ label: "مسودة", tone: "neutral" });
  }
  return badges;
}

export function createProductCardViewModel(
  product: ProductRecord,
): ProductCardViewModel {
  const pharmacyLabel = [
    text(product.pharmacySpecs.pharmacyCategory),
    text(product.pharmacySpecs.pharmacySubcategory),
  ]
    .filter(Boolean)
    .join(" / ");
  const catalogLabel = [
    text(product.pharmacyCatalog.categoryNameAr),
    text(product.pharmacyCatalog.subcategoryNameAr),
  ]
    .filter(Boolean)
    .join(" / ");
  const ratingValue = numberFromText(text(product.rating.rating));

  return {
    id: product.id,
    ownerUid: product.uid,
    title: productCardTitle(product),
    subtitle:
      text(product.mainData.brand) ||
      text(product.mainData.manufacturer) ||
      text(product.pharmacySpecs.activeIngredient),
    description: text(product.mainData.description),
    imageUrl: productCardImage(product),
    priceText: productCardPrice(product),
    oldPriceText: text(product.price.beforeDiscount),
    ratingText: ratingValue === null ? "" : `${ratingValue.toFixed(1)} / 5`,
    ratingValue,
    available: product.mainData.available,
    needsCar: product.price.needsCar,
    categoryLabel: pharmacyLabel || catalogLabel,
    href: productCardHref(product),
    badges: productCardBadges(product),
    product,
  };
}

export function createFeaturedProductCardViewModel(
  item: FeaturedProductCardInput,
): ProductCardViewModel {
  const href = item.action?.startsWith("/")
    ? item.action
    : item.action?.includes("productId=")
      ? `/product?${item.action}`
      : item.id
        ? `/product?mode=view&productId=${encodeURIComponent(item.id)}`
        : "";

  return {
    id: item.id,
    ownerUid: "",
    title: text(item.title) || item.id,
    subtitle: "",
    description: "",
    imageUrl: text(item.image),
    priceText: text(item.price),
    oldPriceText: "",
    ratingText: "",
    ratingValue: null,
    available: true,
    needsCar: false,
    categoryLabel: "",
    href,
    badges: [],
  };
}
