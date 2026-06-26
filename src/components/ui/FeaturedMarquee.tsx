'use client';

import { Sparkles } from 'lucide-react';
import Image from 'next/image';

import { shouldUseUnoptimizedImage } from '@/lib/images/external-image';

export interface FeaturedMarqueeItem {
  id: string;
  title: string;
  price: string;
  image: string;
  action: string;
}

export interface FeaturedMarqueeConfig {
  sectionTitle: string;
  items: FeaturedMarqueeItem[];
  onAction?: (action: string) => void;
}

export interface FeaturedMarqueeProps {
  config: FeaturedMarqueeConfig;
}

export function FeaturedMarquee({ config }: FeaturedMarqueeProps) {
  const { sectionTitle, items, onAction } = config || {};
  if (!items || items.length === 0) return null;

  // Duplicate items array to ensure seamless infinite horizontal scrolling (marquee)
  const marqueeItems = [...items, ...items];

  return (
    <section className="space-y-3 overflow-hidden">
      <div className="flex justify-between items-center">
        <h3 className="gova-section-heading gova-section-heading-tertiary">
          <Sparkles className="w-5 h-5 text-tertiary animate-pulse-subtle" aria-hidden />
          {sectionTitle}
        </h3>
      </div>

      <div className="relative overflow-hidden py-4 rounded-xl gova-surface-neutral" dir="ltr">
        <div className="home-marquee-cards-track gap-4 pr-4">
          {marqueeItems.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              role="button"
              tabIndex={0}
              aria-label={item.title}
              onClick={() => onAction?.(item.action)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAction?.(item.action); } }}
              className="shrink-0 w-40 rounded-xl p-2 gova-card-tonal gova-card-tonal-tertiary cursor-pointer active:scale-95 transition-transform focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Image
                src={item.image}
                alt={item.title}
                width={160}
                height={160}
                className="w-full aspect-square object-cover rounded-lg mb-2"
                unoptimized={shouldUseUnoptimizedImage(item.image)}
              />
              <p className="truncate text-xs font-semibold text-on-surface">{item.title}</p>
              <p className="text-xs font-bold text-primary">{item.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
