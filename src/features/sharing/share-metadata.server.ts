import type { Metadata } from "next";
import { cache } from "react";

import { productService } from "@/features/product/services/product-service.server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import {
  buildProductShareUrl,
  buildProfileShareUrl,
  PUBLIC_SHARE_ORIGIN,
} from "./share-links";
import type { PublicProfileShareRecord } from "./share-content";

const DEFAULT_DESCRIPTION = "اكتشف المنتجات والمتاجر والخدمات على تطبيق ASOL.";
const DEFAULT_IMAGE = `${PUBLIC_SHARE_ORIGIN}/logo.png`;

export const loadPublicProductShareRecord = cache((productId: string) =>
  productService.get(productId),
);

export const loadPublicProfileShareRecord = cache(
  async (uid: string): Promise<PublicProfileShareRecord> => {
    const [storeDetails, storeImages] = await Promise.all([
      profileService.getStoreDetails(uid),
      profileService.getStoreImages(uid),
    ]);
    return { uid, storeDetails, storeImages };
  },
);

function compact(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function productName(product: ProductRecord): string {
  return (
    product.mainData.name.trim() ||
    product.pharmacySpecs.nameAr.trim() ||
    product.pharmacySpecs.nameEn.trim() ||
    "منتج على ASOL"
  );
}

function productTitle(product: ProductRecord): string {
  const name = productName(product);
  const price = product.price.current.trim();
  const label = product.price.label.trim();
  return compact([name, price || label].filter(Boolean).join(" — "), 100);
}

function shareMetadata(input: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  index?: boolean;
}): Metadata {
  const imageUrl = input.imageUrl || DEFAULT_IMAGE;
  const description = compact(input.description || DEFAULT_DESCRIPTION, 180);
  return {
    title: input.title,
    description,
    alternates: { canonical: input.url },
    robots:
      input.index === false
        ? { index: false, follow: false }
        : { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ar_EG",
      siteName: "ASOL",
      title: input.title,
      description,
      url: input.url,
      images: [{ url: imageUrl, alt: input.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
      images: [imageUrl],
    },
  };
}

export async function productShareMetadata(
  productId: string,
): Promise<Metadata> {
  if (!productId.trim()) return {};
  try {
    const product = await loadPublicProductShareRecord(productId);
    return shareMetadata({
      title: productTitle(product),
      description:
        product.mainData.description ||
        product.price.label ||
        DEFAULT_DESCRIPTION,
      url: buildProductShareUrl(product.id),
      imageUrl: product.images.find((image) => image.url)?.url,
      index: product.status === "active",
    });
  } catch {
    return shareMetadata({
      title: "المنتج غير متاح — ASOL",
      description: DEFAULT_DESCRIPTION,
      url: buildProductShareUrl(productId),
      index: false,
    });
  }
}

export async function profileShareMetadata(uid: string): Promise<Metadata> {
  if (!uid.trim()) return {};
  try {
    const { storeDetails, storeImages } =
      await loadPublicProfileShareRecord(uid);
    const title = compact(storeDetails.storeName || "صفحة على ASOL", 100);
    return shareMetadata({
      title,
      description: storeDetails.storeDescription || DEFAULT_DESCRIPTION,
      url: buildProfileShareUrl(uid),
      imageUrl: storeImages.coverUrl || storeImages.avatarUrl,
    });
  } catch {
    return shareMetadata({
      title: "صفحة على ASOL",
      description: DEFAULT_DESCRIPTION,
      url: buildProfileShareUrl(uid),
      index: false,
    });
  }
}
