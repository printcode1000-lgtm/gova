'use client';

import { Suspense } from 'react';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';
import type { CategoryDisplay } from '@/features/categories';

import SplashInitializer from './SplashInitializer';
import TopMarquee from './TopMarquee';

interface SplashScreenProps {
  displayCategories: readonly CategoryDisplay[];
}

export default function SplashScreen({ displayCategories }: SplashScreenProps) {
  const { t, isRTL } = useTranslation();

  return (
    <main id='features-splash-presentation-splashscreen-main-1-usdpzr'
      className="asol-splash-canvas min-h-screen relative w-full flex flex-col items-center justify-between px-4 pt-[calc(3rem+var(--asol-safe-area-top))] pb-[calc(3rem+var(--asol-safe-area-bottom))] overflow-hidden selection:bg-primary/30"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <TopMarquee displayCategories={displayCategories} />

      <div id='features-splash-presentation-splashscreen-div-2-mad6yx' className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-sm px-4">
        <div id='features-splash-presentation-splashscreen-div-3-rsk8bj' className="mb-4 sm:mb-6">
          <AppIcon id='features-splash-presentation-splashscreen-appicon-4-aqlcef' size="lg" />
        </div>
        <h1 id='features-splash-presentation-splashscreen-heading-5-du73cd' className="text-2xl sm:text-3xl font-bold text-primary mb-1 tracking-tight text-center">
          {t('splash.tagline')}
        </h1>

        <div id='features-splash-presentation-splashscreen-div-6-w0agvv' className="mt-6 sm:mt-8 w-full flex flex-col items-center">
          <Suspense fallback={null}>
            <SplashInitializer />
          </Suspense>
        </div>
      </div>

      <div id='features-splash-presentation-splashscreen-div-7-mw40cx' className="fixed bottom-0 start-0 w-full h-1/3 bg-gradient-to-t from-primary-container/40 to-transparent pointer-events-none -z-10" />
    </main>
  );
}
