'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

const SLIDES = [
  {
    id: 'hero-slide-1',
    badgeKey: 'home.hero.slide1.badge',
    titleKey: 'home.hero.slide1.title',
    badgeClass: 'bg-warning text-on-primary',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC8-m7Ccp-1Px2GILiQBkEVbicyFRjjkymFy8ZFtdhuYRL8pQON8o1CIXyU6BN7JVfZrAI0yvezebhNWRoGVMHvg0DN77QP6OfeYY8W2MCXLeJfVyaMNxSGJlX3P3iAMznOw9eICUGva3NKPLGLvI8cNctLItAwJr7ENeM_1D_78vtUOVOwDnSGcbsS5HOdrkOT1zMs8uhh-xaosMu8LdnGFafiAQEvo9WJamGcpA3K5rbhwKVtLkguHv9lD35rXTuja9bBvgTzrkIj',
  },
  {
    id: 'hero-slide-2',
    badgeKey: 'home.hero.slide2.badge',
    titleKey: 'home.hero.slide2.title',
    badgeClass: 'bg-success text-on-primary',
    imgSrc:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB5BKAM75HnyHLdSANV4UMPvSgTfcM9isT6xav32tg3Gvhoo2VHZS2bjvuAmMZ-WMizUytLM-OSXNJGlwlpSSHUzeUCPhSlf-13GvVtmlFYRo8KBxJHUd6C7-TfCGGAm31WcQmrU3uAhVycmQoa7cbdByUtAph_Lnc9fP7QJRlCAh2IAm_pBfGGn-_wmPqP3YSDPVN7R81BJObut_pcxju-opt0cQMpN0kLCsQLQnttGb-QWeNyipOCwPx-GmOSicTzoq5QKsdZTA',
  },
] as const satisfies ReadonlyArray<{
  id: string;
  badgeKey: TranslationKey;
  titleKey: TranslationKey;
  badgeClass: string;
  imgSrc: string;
}>;

export function HeroSlider() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  const advance = useCallback(() => {
    setCurrent((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, 5000);
    return () => clearInterval(timer);
  }, [advance]);

  return (
    <section className="mt-4 relative overflow-hidden rounded-xl shadow-sm h-48 sm:h-64 md:h-80 lg:h-96 w-full">
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translate3d(${current * 100}%, 0, 0)` }}
        dir="ltr"
      >
        {SLIDES.map((slide) => {
          const title = t(slide.titleKey);
          return (
            <div key={slide.id} className="min-w-full h-full relative shrink-0">
              <Image
                src={slide.imgSrc}
                alt={title}
                fill
                className="object-cover"
                unoptimized={shouldUseUnoptimizedImage(slide.imgSrc)}
              />
              <div className="absolute inset-0 flex flex-col justify-center px-6 text-on-primary bg-gradient-to-l from-primary via-primary/60 to-transparent">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit mb-2 ${slide.badgeClass}`}>
                  {t(slide.badgeKey)}
                </span>
                <h2 className="text-2xl font-bold leading-tight">{title}</h2>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 start-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-on-primary transition-all"
            style={{ width: i === current ? '32px' : '8px', opacity: i === current ? 1 : 0.4 }}
          />
        ))}
      </div>
    </section>
  );
}
