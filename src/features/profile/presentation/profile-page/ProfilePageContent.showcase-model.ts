"use client";

import { formatPlainMoneyMajor } from "@asol/format-core";
import type { FeaturedMarqueeConfig } from "@/components/ui/FeaturedMarquee";
import type { HeroSliderConfig } from "@/components/ui/HeroSlider";
import {
  DEFAULT_HOME_HERO_TRANSITION,
  DEFAULT_HOME_HERO_TRANSITION_DURATION,
} from "@asol/hero-slider-core";
import type { TrendingRibbonConfig } from "@/components/ui/TrendingRibbon";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import type { StoreDetailsData } from "@/features/profile/entities/store-details.entity";
import type { StoreImagesData } from "@/features/profile/entities/store-images.entity";
import * as React from "react";
import { useMemo } from "react";

export function useProfileShowcaseModel({
  storeImages,
  storeDetails,
  showPreviewCard,
  previewUid,
  onProductAction,
}: {
  storeImages: StoreImagesData;
  storeDetails: StoreDetailsData;
  showPreviewCard: boolean;
  previewUid: string;
  onProductAction: (action: string) => void;
}) {
  const [featuredProducts, setFeaturedProducts] = React.useState<ProductRecord[]>([]);
  const [isLoadingFeaturedProducts, setIsLoadingFeaturedProducts] =
    React.useState(false);

  const heroSliderConfig = useMemo<HeroSliderConfig>(() => {
    const slides = storeImages.coverUrls.map((url, index) => ({
      priority: (index + 1) * 100,
      image: url,
      imageKey: storeImages.coverImageKeys[index],
      title: "",
      subtitle: "",
      duration: 4000,
      transition: DEFAULT_HOME_HERO_TRANSITION,
      transitionDuration: DEFAULT_HOME_HERO_TRANSITION_DURATION,
      action: "",
    }));

    return {
      autoPlay: true,
      loop: true,
      slides,
    };
  }, [storeImages.coverImageKeys, storeImages.coverUrls]);

  React.useEffect(() => {
    const ids = storeDetails.profileShowcase?.featuredProductIds ?? [];
    if (!showPreviewCard || ids.length === 0) {
      setFeaturedProducts([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingFeaturedProducts(true);
      try {
        const products = await Promise.all(
          ids.map((id) =>
            productApiService
              .get(id, { suppressErrorLog: true })
              .catch((error) => {
                console.warn("[Profile] Failed to load featured product.", {
                  id,
                  error,
                });
                return null;
              }),
          ),
        );
        if (!cancelled) {
          setFeaturedProducts(
            products.filter(
              (product): product is ProductRecord =>
                Boolean(product) &&
                product!.status === "active" &&
                (!previewUid || product!.uid === previewUid),
            ),
          );
        }
      } finally {
        if (!cancelled) setIsLoadingFeaturedProducts(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    previewUid,
    showPreviewCard,
    storeDetails.profileShowcase?.featuredProductIds,
  ]);

  const profileFeaturedConfig = useMemo<FeaturedMarqueeConfig>(
    () => ({
      sectionTitle: "منتجات مميزة",
      items: featuredProducts.map((product) => {
        const price = Number(product.price.current || 0);
        return {
          id: product.id,
          title: product.mainData.name || "منتج",
          price:
            price > 0
              ? formatPlainMoneyMajor(price, "ar")
              : "السعر عند الطلب",
          image:
            product.images[0]?.url ||
            "/images/mainCategories/General Services.webp",
          action: `mode=view&productId=${product.id}&mainCategoryId=${product.mainCategoryId}&subcategoryId=${product.subcategoryId}`,
        };
      }),
      onAction: onProductAction,
    }),
    [featuredProducts, onProductAction],
  );

  const profileTrendingConfig = useMemo<TrendingRibbonConfig>(
    () => ({
      label: storeDetails.profileShowcase?.trending.label || "الأكثر رواجًا",
      items: (storeDetails.profileShowcase?.trending.items ?? []).map(
        (item) => ({
          label: item.label,
          action: "",
        }),
      ),
    }),
    [storeDetails.profileShowcase?.trending],
  );

  return {
    featuredProducts,
    setFeaturedProducts,
    isLoadingFeaturedProducts,
    setIsLoadingFeaturedProducts,
    heroSliderConfig,
    profileFeaturedConfig,
    profileTrendingConfig,
  };
}
