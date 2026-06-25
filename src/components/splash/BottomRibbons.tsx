'use client';

import { Laptop, Factory, Boxes, Wrench, Palette, Truck } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';

import MarqueeCard from './MarqueeCard';

const BOTTOM_ITEMS = [
  { icon: Laptop, labelKey: 'category.electronics' },
  { icon: Factory, labelKey: 'category.industrial' },
  { icon: Boxes, labelKey: 'category.supplies' },
  { icon: Wrench, labelKey: 'category.tools' },
  { icon: Palette, labelKey: 'category.paint' },
  { icon: Truck, labelKey: 'category.shipping' },
] as const satisfies ReadonlyArray<{ icon: typeof Laptop; labelKey: TranslationKey }>;

export default function BottomRibbons() {
  const { t } = useTranslation();
  const loopItems = [...BOTTOM_ITEMS, ...BOTTOM_ITEMS];

  return (
    <div
      className="absolute bottom-0 inset-x-0 overflow-hidden opacity-40 pointer-events-none mb-8 z-0"
      dir="ltr"
    >
      <div className="splash-marquee-track splash-marquee-track--left gap-4 py-4">
        {loopItems.map((item, index) => (
          <MarqueeCard key={`bottom-${index}`} icon={item.icon} label={t(item.labelKey)} />
        ))}
      </div>
    </div>
  );
}
