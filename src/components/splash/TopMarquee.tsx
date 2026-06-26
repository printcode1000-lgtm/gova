'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

import MarqueeCard from './MarqueeCard';

interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: string;
  updated_at: string;
}

function getRandomCategories(categories: Category[], count: number): Category[] {
  const shuffled = [...categories];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default function TopMarquee() {
  const { locale } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [centerCards, setCenterCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/catagory/categories.json');
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    loadCategories();
  }, []);

  const selectedCategories = getRandomCategories(categories, 6);
  const loopItems = [...selectedCategories, ...selectedCategories];

  const getTitle = (category: Category, loc: Locale) => {
    return loc === 'ar' ? category.title_ar : category.title_en;
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
              image={item.image} 
              isCenter={centerCards.has(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
