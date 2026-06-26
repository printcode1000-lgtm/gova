'use client';

import { useMemo } from 'react';

import { CategoriesGrid } from '@/components/home/CategoriesGrid';
import { CuratedOffers } from '@/components/home/CuratedOffers';
import { PromoBanner } from '@/components/home/PromoBanner';
import { TrendingRibbon, type TrendingRibbonConfig } from '@/components/ui/TrendingRibbon';
import trendingRibbonData from './home-trending-ribbon.json';
import { FeaturedMarquee, type FeaturedMarqueeConfig } from '@/components/ui/FeaturedMarquee';
import { HeroSlider, type HeroSliderConfig } from '@/components/ui/HeroSlider';
import heroSliderData from './home-hero-slider.json';
import heroMarqueeData from './home-featured-marquee.json';

export default function HomeScreen() {
  const homeHeroSliderConfig = useMemo<HeroSliderConfig>(
    () => ({
      transition: heroSliderData.transition as HeroSliderConfig['transition'],
      transitionDuration: heroSliderData.transitionDuration,
      autoPlay: heroSliderData.autoPlay,
      loop: heroSliderData.loop,
      onAction: (action) => {
        console.log('Hero slider action triggered:', action);
      },
      slides: heroSliderData.slides,
    }),
    [],
  );

  const homeTrendingRibbonConfig = useMemo<TrendingRibbonConfig>(
    () => ({
      label: trendingRibbonData.label,
      items: trendingRibbonData.items,
      onAction: (action) => {
        console.log('Trending ribbon action triggered:', action);
      },
    }),
    [],
  );

  const homeFeaturedMarqueeConfig = useMemo<FeaturedMarqueeConfig>(
    () => ({
      sectionTitle: heroMarqueeData.sectionTitle,
      items: heroMarqueeData.items,
      onAction: (action) => {
        console.log('Featured marquee action triggered:', action);
      },
    }),
    [],
  );


  return (
    <div className="space-y-6 pb-8">
      <div className="px-4">
        <HeroSlider config={homeHeroSliderConfig} />
      </div>

      <div className="gova-section-tonal gova-section-tonal-primary mx-2 sm:mx-4">
        <CategoriesGrid />
      </div>

      <div className="gova-section-tonal gova-section-tonal-tertiary mx-2 sm:mx-4">
        <FeaturedMarquee config={homeFeaturedMarqueeConfig} />
      </div>

      <TrendingRibbon config={homeTrendingRibbonConfig} />

      <div className="gova-section-tonal gova-section-tonal-secondary mx-2 sm:mx-4">
        <CuratedOffers />
      </div>

      <div className="px-4">
        <PromoBanner />
      </div>
    </div>
  );
}

