"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { CategoriesGrid } from "@/features/home/presentation/CategoriesGrid";
import {
  TrendingRibbon,
  type TrendingRibbonConfig,
} from "@/features/advertisements/ui";
import {
  FeaturedMarquee,
  type FeaturedMarqueeConfig,
} from "@/features/advertisements/ui";
import { HeroSlider, type HeroSliderConfig } from "@/features/advertisements/ui";
import { useHomeHeroSlider } from "@/features/advertisements/ui";
import { useHomeFeaturedMarquee } from "@/features/advertisements/ui";
import { useHomeTrendingRibbon } from "@/features/advertisements/ui";
import type { CategoryDisplay } from "@/features/categories";

interface HomeScreenProps {
  displayCategories: readonly CategoryDisplay[];
}

export default function HomeScreen({ displayCategories }: HomeScreenProps) {
  const router = useRouter();
  const homeHero = useHomeHeroSlider();
  const homeHeroSliderConfig = useMemo<HeroSliderConfig>(
    () => ({
      autoPlay: homeHero.config.autoPlay,
      loop: homeHero.config.loop,
      onAction: (action) => {
        console.log("Hero slider action triggered:", action);
      },
      slides: homeHero.config.slides,
    }),
    [homeHero.config],
  );

  const { config: trendingRibbonData } = useHomeTrendingRibbon();
  const homeTrendingRibbonConfig = useMemo<TrendingRibbonConfig>(
    () => ({
      label: trendingRibbonData?.label ?? "home.trending.label",
      items: Array.isArray(trendingRibbonData?.items)
        ? trendingRibbonData.items
        : [],
      onAction: (action) => {
        if (action.startsWith("/") || action.startsWith("http")) {
          window.location.href = action;
        } else if (action.includes("productId=")) {
          router.push(`/product?${action}`);
        } else if (/^[0-9a-fA-F-]{36}$/.test(action)) {
          router.push(`/product?mode=view&productId=${action}`);
        } else {
          console.log("Trending ribbon action triggered:", action);
        }
      },
    }),
    [trendingRibbonData, router],
  );

  const { config: featuredMarqueeData } = useHomeFeaturedMarquee();
  const homeFeaturedMarqueeConfig = useMemo<FeaturedMarqueeConfig>(
    () => ({
      sectionTitle: featuredMarqueeData.sectionTitle,
      items: featuredMarqueeData.items,
      onAction: (action) => {
        if (action.startsWith("/") || action.startsWith("http")) {
          window.location.href = action;
        } else if (action.includes("productId=")) {
          router.push(`/product?${action}`);
        } else if (/^[0-9a-fA-F-]{36}$/.test(action)) {
          router.push(
            `/product?mode=view&productId=${encodeURIComponent(action)}`,
          );
        } else {
          console.log("Featured marquee action triggered:", action);
        }
      },
    }),
    [featuredMarqueeData, router],
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="px-4">
        <HeroSlider config={homeHeroSliderConfig} />
      </div>

      <section className="mx-2 sm:mx-4">
        <FeaturedMarquee config={homeFeaturedMarqueeConfig} />
      </section>

      {homeTrendingRibbonConfig.items.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-error/20 shadow-sm">
          <TrendingRibbon config={homeTrendingRibbonConfig} />
        </section>
      ) : null}

      <div className="asol-section-tonal asol-section-tonal-primary mx-2 sm:mx-4">
        <CategoriesGrid displayCategories={displayCategories} />
      </div>

    </div>
  );
}
