"use client";

import { useMemo } from "react";

import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { CuratedOffers } from "@/components/home/CuratedOffers";
import { PromoBanner } from "@/components/home/PromoBanner";
import {
  TrendingRibbon,
  type TrendingRibbonConfig,
} from "@/components/ui/TrendingRibbon";
import trendingRibbonData from "./home-trending-ribbon.json";
import {
  FeaturedMarquee,
  type FeaturedMarqueeConfig,
} from "@/components/ui/FeaturedMarquee";
import { HeroSlider, type HeroSliderConfig } from "@/components/ui/HeroSlider";
import { useHomeHeroSlider } from "@/features/advertisements/hooks/use-home-hero-slider";
import { useHomeFeaturedMarquee } from "@/features/advertisements/hooks/use-home-featured-marquee";
import type { CategoryDisplay } from "@/features/categories";

interface HomeScreenProps {
  displayCategories: readonly CategoryDisplay[];
}

export default function HomeScreen({ displayCategories }: HomeScreenProps) {
  const homeHero = useHomeHeroSlider();
  const homeHeroSliderConfig = useMemo<HeroSliderConfig>(
    () => ({
      transition: homeHero.config.transition,
      transitionDuration: homeHero.config.transitionDuration,
      autoPlay: homeHero.config.autoPlay,
      loop: homeHero.config.loop,
      onAction: (action) => {
        console.log("Hero slider action triggered:", action);
      },
      slides: homeHero.config.slides,
    }),
    [homeHero.config],
  );

  const homeTrendingRibbonConfig = useMemo<TrendingRibbonConfig>(
    () => ({
      label: trendingRibbonData.label,
      items: trendingRibbonData.items,
      onAction: (action) => {
        console.log("Trending ribbon action triggered:", action);
      },
    }),
    [],
  );

  const { config: featuredMarqueeData } = useHomeFeaturedMarquee();
  const homeFeaturedMarqueeConfig = useMemo<FeaturedMarqueeConfig>(
    () => ({
      sectionTitle: featuredMarqueeData.sectionTitle,
      items: featuredMarqueeData.items,
      onAction: (action) => {
        console.log("Featured marquee action triggered:", action);
      },
    }),
    [featuredMarqueeData],
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="px-4">
        <HeroSlider config={homeHeroSliderConfig} />
      </div>

      <div className="gova-section-tonal gova-section-tonal-tertiary mx-1">
        <FeaturedMarquee config={homeFeaturedMarqueeConfig} />
      </div>

      <div className="gova-section-tonal gova-section-tonal-primary mx-2 sm:mx-4">
        <CategoriesGrid displayCategories={displayCategories} trendingRibbonConfig={homeTrendingRibbonConfig} />
      </div>

      <div className="gova-section-tonal gova-section-tonal-secondary mx-2 sm:mx-4">
        <CuratedOffers />
      </div>

      <div className="px-4">
        <PromoBanner />
      </div>
    </div>
  );
}
