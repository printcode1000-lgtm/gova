'use client';

import { CategoriesGrid } from '@/components/home/CategoriesGrid';
import { CuratedOffers } from '@/components/home/CuratedOffers';
import { FeaturedMarquee } from '@/components/home/FeaturedMarquee';
import { HeroSlider } from '@/components/home/HeroSlider';
import { PromoBanner } from '@/components/home/PromoBanner';
import { TrendingRibbon } from '@/components/home/TrendingRibbon';

export default function HomeScreen() {
  return (
    <div className="space-y-6 pb-8">
      <div className="px-4">
        <HeroSlider />
      </div>

      <div className="gova-section-tonal gova-section-tonal-primary mx-2 sm:mx-4">
        <CategoriesGrid />
      </div>

      <div className="gova-section-tonal gova-section-tonal-tertiary mx-2 sm:mx-4">
        <FeaturedMarquee />
      </div>

      <TrendingRibbon />

      <div className="gova-section-tonal gova-section-tonal-secondary mx-2 sm:mx-4">
        <CuratedOffers />
      </div>

      <div className="px-4">
        <PromoBanner />
      </div>
    </div>
  );
}
