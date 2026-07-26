'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { CategoryDisplay } from '@/features/categories';

import MarqueeCard from './MarqueeCard';

function getRandomCategories(categories: readonly CategoryDisplay[], count: number): CategoryDisplay[] {
  const shuffled = [...categories];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

interface TopMarqueeProps {
  displayCategories: readonly CategoryDisplay[];
}

export default function TopMarquee({ displayCategories }: TopMarqueeProps) {
  const { locale } = useTranslation();
  const [centerCards, setCenterCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [selectedCategories, setSelectedCategories] = useState<CategoryDisplay[]>(() =>
    displayCategories.slice(0, 6)
  );

  useEffect(() => {
    setSelectedCategories(getRandomCategories(displayCategories, 6));
  }, [displayCategories]);

  const loopItems = [...selectedCategories, ...selectedCategories];

  const getTitle = (category: CategoryDisplay, loc: Locale) => {
    return loc === 'ar' ? category.nameAr : category.nameEn;
  };

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    setCenterCards((prev) => {
      const newSet = new Set(prev);
      entries.forEach((entry) => {
        const target = entry.target as HTMLElement;
        const index = Number(target.dataset.index);
        if (entry.isIntersecting && entry.intersectionRatio > 0.7) {
          newSet.add(index);
        } else {
          newSet.delete(index);
        }
      });
      return newSet;
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      threshold: [0, 0.7, 1],
      rootMargin: "-40% 0px -40% 0px"
    });

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, loopItems.length]);

  return (
    <div
      className="absolute top-0 inset-x-0 overflow-hidden pointer-events-none z-0"
      dir="ltr"
    >
      <div className="splash-marquee-track splash-marquee-track--right gap-4 py-4">
        {loopItems.map((item, index) => (
          <div 
            key={`top-${index}`} 
            data-index={index}
            ref={(el) => {
              if (el) cardRefs.current.set(index, el);
            }}
          >
            <MarqueeCard 
              label={getTitle(item, locale)} 
              image={item.imageUrl} 
              isCenter={centerCards.has(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
