"use client";

import { useCallback, useEffect, useState } from "react";

import type { FeaturedMarqueeConfig } from "@/features/advertisements/entities/featured-marquee.entity";
import { featuredMarqueeApiService } from "../services/featured-marquee-api-service";
import { productApiService } from "@/features/product/services/product-api-service";
import type { FeaturedMarqueeConfig as MarqueeUIConfig } from "@/components/ui/FeaturedMarquee";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";

interface HomeFeaturedMarqueeState {
  sectionTitle: string;
  config: MarqueeUIConfig;
  isLoading: boolean;
}

const FALLBACK_SECTION_TITLE = "home.featured.title";

function buildFallbackConfig(): MarqueeUIConfig {
  return { sectionTitle: FALLBACK_SECTION_TITLE, items: [] };
}

async function buildMarqueeConfig(
  featuredConfig: FeaturedMarqueeConfig,
): Promise<MarqueeUIConfig> {
  const { productIds } = featuredConfig;

  if (productIds.length === 0) {
    return buildFallbackConfig();
  }

  // Fetch all products in parallel; skip any that fail (product deleted, etc.)
  const results = await Promise.allSettled(
    productIds.map((id) => productApiService.get(id)),
  );

  const items = results.flatMap((result, index) => {
    if (result.status === "rejected") return [];
    const product = result.value;
    const name =
      product.data.fields["mainData.name"] ?? `منتج ${String(index + 1)}`;
    const price = product.data.fields["price.current"] ?? "";
    const image = product.data.images[0]?.url ?? "";
    const action = [
      `mode=view`,
      `productId=${encodeURIComponent(product.id)}`,
      `mainCategoryId=${encodeURIComponent(product.mainCategoryId)}`,
      `subcategoryId=${encodeURIComponent(product.subcategoryId)}`,
    ].join("&");

    return [{ id: product.id, title: name, price, image, action }];
  });

  return { sectionTitle: FALLBACK_SECTION_TITLE, items };
}

export function useHomeFeaturedMarquee() {
  const [state, setState] = useState<HomeFeaturedMarqueeState>({
    sectionTitle: FALLBACK_SECTION_TITLE,
    config: buildFallbackConfig(),
    isLoading: true,
  });

  const load = useCallback(async () => {
    try {
      const published = await featuredMarqueeApiService.getCurrent();
      const config = await buildMarqueeConfig(published.config);
      setState({ sectionTitle: FALLBACK_SECTION_TITLE, config, isLoading: false });
    } catch (error) {
      reportSystemIssue({
        level: "warning",
        feature: "Home",
        operation: "sync-featured-marquee",
        error,
        page: "/home",
      });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
