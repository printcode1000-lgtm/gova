"use client";

import { useCallback, useEffect, useState } from "react";

import type { FeaturedMarqueeConfig as MarqueeUIConfig } from "@/components/ui/FeaturedMarquee";
import type { FeaturedMarqueeConfig } from "@/features/advertisements/entities/featured-marquee.entity";
import {
  FEATURED_MARQUEE_CACHE_KEY,
  type FeaturedMarqueePublished,
} from "@/features/advertisements/entities/featured-marquee.entity";
import { featuredMarqueeApiService } from "@/features/advertisements/services/featured-marquee-api-service";
import { productApiService } from "@/features/product/services/product-api-service";
import { reportSystemIssue } from "@/features/system-logs/report-system-issue";
import {
  GOVA_DB_STORES,
  govaDbGet,
  govaDbSet,
} from "@/lib/gova-db";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface HomeFeaturedMarqueeState {
  sectionTitle: string;
  config: MarqueeUIConfig;
  isLoading: boolean;
}

interface FeaturedMarqueeCache extends FeaturedMarqueePublished {
  lastCheckedAt: string;
  resolvedConfig: MarqueeUIConfig;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FALLBACK_SECTION_TITLE = "home.featured.title";

const fallback: FeaturedMarqueePublished = {
  config: { productIds: [] },
  version: 0,
  checkIntervalMinutes: 15,
  updatedAt: "",
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    productIds.map((id) =>
      productApiService.get(id, { suppressErrorLog: true }),
    ),
  );

  const items = results.flatMap((result, index) => {
    if (result.status === "rejected") return [];
    const product = result.value;
    const name = product.mainData.name || `منتج ${String(index + 1)}`;
    const price = product.price.current;
    const image = product.images[0]?.url ?? "";
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

// â”€â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function useHomeFeaturedMarquee() {
  const [state, setState] = useState<HomeFeaturedMarqueeState>({
    sectionTitle: FALLBACK_SECTION_TITLE,
    config: buildFallbackConfig(),
    isLoading: true,
  });

  const checkForUpdates = useCallback(async (force = false) => {
    try {
      const cached = await govaDbGet<FeaturedMarqueeCache>(
        GOVA_DB_STORES.APP_SETTINGS,
        FEATURED_MARQUEE_CACHE_KEY,
      );

      // Show cached data immediately (avoid flicker)
      if (cached) {
        setState({
          sectionTitle: FALLBACK_SECTION_TITLE,
          config: cached.resolvedConfig,
          isLoading: false,
        });
      }

      // Skip server check if within interval window
      const intervalMs = (cached?.checkIntervalMinutes ?? 15) * 60_000;
      const lastCheck = cached ? Date.parse(cached.lastCheckedAt) : 0;
      if (!force && Date.now() - lastCheck < intervalMs) return;

      // Lightweight version check â€” avoids downloading full config every time
      const version = await featuredMarqueeApiService.getVersion();
      let next: FeaturedMarqueePublished = cached ?? fallback;
      let nextResolved: MarqueeUIConfig =
        cached?.resolvedConfig ?? buildFallbackConfig();

      if (
        !cached ||
        version.version !== cached.version ||
        version.updatedAt !== cached.updatedAt
      ) {
        // Config changed â€” download full data and resolve products
        next = await featuredMarqueeApiService.getCurrent();
        nextResolved = await buildMarqueeConfig(next.config);
        setState({
          sectionTitle: FALLBACK_SECTION_TITLE,
          config: nextResolved,
          isLoading: false,
        });
      } else if (version.checkIntervalMinutes !== cached.checkIntervalMinutes) {
        // Only interval changed â€” update local record
        next = {
          ...cached,
          checkIntervalMinutes: version.checkIntervalMinutes,
        };
      }

      // Persist refreshed cache
      await govaDbSet<FeaturedMarqueeCache>(
        GOVA_DB_STORES.APP_SETTINGS,
        FEATURED_MARQUEE_CACHE_KEY,
        {
          ...next,
          resolvedConfig: nextResolved,
          lastCheckedAt: new Date().toISOString(),
        },
      );
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
    void checkForUpdates();
    // Re-check every minute â€” actual fetch is skipped if within the interval window
    const timer = window.setInterval(() => void checkForUpdates(), 60_000);
    return () => window.clearInterval(timer);
  }, [checkForUpdates]);

  return { ...state, checkForUpdates };
}

