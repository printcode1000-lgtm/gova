'use client';

import { Suspense } from 'react';

import AppIcon from '@/components/brand/AppIcon';
import { useTranslation } from '@/lib/i18n';

import SplashInitializer from './SplashInitializer';
import TopMarquee from './TopMarquee';

export default function SplashScreen() {
  const { t, isRTL } = useTranslation();

  return (
    <main
      className="gova-splash-canvas min-h-screen relative w-full flex flex-col items-center justify-between py-12 px-4 overflow-hidden selection:bg-primary/30"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <TopMarquee />

      <div className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-sm px-4">
        <div className="mb-4 sm:mb-6">
          <AppIcon size="lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1 tracking-tight text-center">
          {t('splash.tagline')}
        </h1>

        <div className="mt-6 sm:mt-8 w-full flex flex-col items-center">
          <Suspense fallback={null}>
            <SplashInitializer />
          </Suspense>
        </div>
      </div>

      <div className="fixed bottom-0 start-0 w-full h-1/3 bg-gradient-to-t from-primary-container/40 to-transparent pointer-events-none -z-10" />
    </main>
  );
}
