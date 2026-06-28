'use client';

import { Store } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';

import { govaApi } from '@/core/api';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const CATEGORY_RINGS = ['gova-ring-primary', 'gova-ring-secondary', 'gova-ring-tertiary', 'gova-ring-error'] as const;

interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: string;
  updated_at: string;
  collection: number | null;
  collection_ar: string | null;
  collection_en: string | null;
  collection_image: string | null;
  order: number | null;
}

interface DisplayCategory {
  id: number;
  name_ar: string;
  name_en: string;
  image: string;
  isCollection: boolean;
  order: number | null;
}

export function CategoriesGrid() {
  const { t, isRTL, locale } = useTranslation();
  const [displayCategories, setDisplayCategories] = React.useState<DisplayCategory[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await govaApi.getPublicJson<Category[]>('/catagory/categories.json');
        
        // Sort categories by order
        const sortedData = [...data].sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          return orderA - orderB;
        });

        // Group categories by collection
        const collectionMap = new Map<number | null, Category[]>();
        
        sortedData.forEach((cat) => {
          const key = cat.collection;
          if (!collectionMap.has(key)) {
            collectionMap.set(key, []);
          }
          collectionMap.get(key)!.push(cat);
        });

        // Convert to display categories
        const displayCats: DisplayCategory[] = [];
        
        // Add individual categories (collection === null)
        const individualCats = collectionMap.get(null) || [];
        individualCats.forEach((cat) => {
          displayCats.push({
            id: cat.id,
            name_ar: cat.title_ar,
            name_en: cat.title_en,
            image: cat.image,
            isCollection: false,
            order: cat.order,
          });
        });

        // Add collections (collection !== null)
        const collectionKeys = Array.from(collectionMap.keys()).filter(key => key !== null);
        collectionKeys.forEach((collectionKey) => {
          const cats = collectionMap.get(collectionKey) || [];
          const firstCat = cats[0];
          displayCats.push({
            id: collectionKey,
            name_ar: firstCat.collection_ar || '',
            name_en: firstCat.collection_en || '',
            image: firstCat.collection_image || '',
            isCollection: true,
            order: firstCat.order,
          });
        });

        // Sort all display categories by order
        displayCats.sort((a, b) => {
          const orderA = a.order ?? Infinity;
          const orderB = b.order ?? Infinity;
          return orderA - orderB;
        });

        setDisplayCategories(displayCats);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <section>
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" aria-hidden />
          {t('home.suezMarkets')}
        </h3>
        <div className="title-line-contact"></div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-2">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          displayCategories.map((cat, index) => {
            const name = locale === 'ar' ? cat.name_ar : cat.name_en;
            const imgSrc = `/images/mainCategories/${cat.image}`;
            return (
              <button
                key={cat.id}
                type="button"
                className="flex flex-col gap-2 group transition-transform duration-200 active:scale-95"
                aria-label={name}
              >
                <div
                  className={cn(
                    'rounded-2xl overflow-hidden border-2 border-transparent p-0 transition-all w-full aspect-[4/3.5] relative shadow-sm hover:shadow-md',
                  )}
                >
                  <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface-bright group-hover:opacity-90 transition-opacity">
                    <Image
                      src={imgSrc}
                      alt={name}
                      fill
                      className="object-cover"
                    />
                    <span
                      className={cn(
                        'absolute bottom-2 text-[11px] font-normal leading-3 truncate px-2 py-1 rounded-md',
                        'bg-black/50 text-white',
                        isRTL ? 'right-2' : 'left-2'
                      )}
                    >
                      {name}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
