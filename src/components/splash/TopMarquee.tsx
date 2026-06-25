'use client';

import { Shirt, Car, Building2, HeartPulse, Utensils, Smartphone } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

import MarqueeCard from './MarqueeCard';

const TOP_ITEMS = [
  { icon: Shirt, labelKey: 'category.fashion' },
  { icon: Car, labelKey: 'category.automotive' },
  { icon: Building2, labelKey: 'category.realestate' },
  { icon: HeartPulse, labelKey: 'category.medical' },
  { icon: Utensils, labelKey: 'category.food' },
  { icon: Smartphone, labelKey: 'category.mobile' },
] as const satisfies ReadonlyArray<{ icon: typeof Shirt; labelKey: TranslationKey }>;

export default function TopMarquee() {
  const { t } = useTranslation();
  const loopItems = [...TOP_ITEMS, ...TOP_ITEMS];

  return (
    <div
      className="absolute top-0 inset-x-0 overflow-hidden opacity-50 pointer-events-none z-0"
      dir="ltr"
    >
      <div className="splash-marquee-track splash-marquee-track--right gap-4 py-4">
        {loopItems.map((item, index) => (
          <MarqueeCard key={`top-${index}`} icon={item.icon} label={t(item.labelKey)} />
        ))}
      </div>
    </div>
  );
}
