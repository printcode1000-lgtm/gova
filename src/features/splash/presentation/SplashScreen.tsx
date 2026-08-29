'use client';

import { Suspense } from 'react';

import AppIcon from '@/shared/brand/AppIcon';
import { useTranslation } from '@/shared/i18n';
import type { CategoryDisplay } from '@/features/categories';

import SplashInitializer from './SplashInitializer';
import TopMarquee from './TopMarquee';
import { uiAttributes } from "@asol/ui-registry-core";

interface SplashScreenProps {
  displayCategories: readonly CategoryDisplay[];
}

export default function SplashScreen({ displayCategories }: SplashScreenProps) {
  const { t, isRTL } = useTranslation();

  return (
    <main {...uiAttributes({ uid: "splash.splash-screen.main.2-3SrFA2", id: "splash.splash-screen.main.2" })} id="splash.splash-screen.main"
      className="asol-splash-canvas min-h-screen relative w-full flex flex-col items-center justify-between px-4 pt-[calc(3rem+var(--asol-safe-area-top))] pb-[calc(3rem+var(--asol-safe-area-bottom))] overflow-hidden selection:bg-primary/30"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <TopMarquee displayCategories={displayCategories} />

      <div {...uiAttributes({ uid: "splash.splash-screen.div.5-AO4m1R", id: "splash.splash-screen.div.5" })} id="splash.splash-screen.div" className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-sm px-4">
        <div {...uiAttributes({ uid: "splash.splash-screen.div.6-J5r4RK", id: "splash.splash-screen.div.6" })} id="splash.splash-screen.div.2" className="mb-4 sm:mb-6">
          <AppIcon id="splash.splash-screen.app-icon" size="lg" />
        </div>
        <h1 {...uiAttributes({ uid: "splash.splash-screen.h1.2-KVbm68", id: "splash.splash-screen.h1.2" })} id="splash.splash-screen.h1" className="text-2xl sm:text-3xl font-bold text-primary mb-1 tracking-tight text-center">
          {t('splash.tagline')}
        </h1>

        <div {...uiAttributes({ uid: "splash.splash-screen.div.7-LMS9Ut", id: "splash.splash-screen.div.7" })} id="splash.splash-screen.div.3" className="mt-6 sm:mt-8 w-full flex flex-col items-center">
          <Suspense fallback={null}>
            <SplashInitializer />
          </Suspense>
        </div>
      </div>

      <div {...uiAttributes({ uid: "splash.splash-screen.div.8-aqWq16", id: "splash.splash-screen.div.8" })} id="splash.splash-screen.div.4" className="fixed bottom-0 start-0 w-full h-1/3 bg-gradient-to-t from-primary-container/40 to-transparent pointer-events-none -z-10" />
    </main>
  );
}
