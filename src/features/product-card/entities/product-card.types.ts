import type { ProductRecord } from "@/features/product/entities/product.entity";

export type ProductCardVariant =
  | "search"
  | "profile-preview"
  | "profile-edit"
  | "featured-marquee"
  | "compact";

export type ProductCardActionKind =
  | "view"
  | "edit"
  | "delete"
  | "toggleFeatured"
  | "addToCart"
  | "favorite"
  | "custom";

export type ProductCardActionTone =
  | "neutral"
  | "primary"
  | "tertiary"
  | "danger";

export interface ProductCardBadge {
  label: string;
  tone?: ProductCardActionTone;
}

export interface ProductCardViewModel {
  id: string;
  ownerUid: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  priceText: string;
  oldPriceText: string;
  ratingText: string;
  ratingValue: number | null;
  available: boolean;
  needsCar: boolean;
  categoryLabel: string;
  href: string;
  badges: ProductCardBadge[];
  product?: ProductRecord;
}

export interface ProductCardAction {
  kind: ProductCardActionKind;
  label: string;
  active?: boolean;
  disabled?: boolean;
  tone?: ProductCardActionTone;
  onClick: () => void;
}

export interface FeaturedProductCardInput {
  id: string;
  title: string;
  price?: string;
  image?: string;
  action?: string;
}
