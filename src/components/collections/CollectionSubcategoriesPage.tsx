"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { govaApi } from "@/core/api";
import { useTranslation } from "@/lib/i18n";

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

interface CollectionSubcategoriesPageProps {
  collectionId: string;
}

export function CollectionSubcategoriesPage({
  collectionId,
}: CollectionSubcategoriesPageProps) {
  const { locale, isRTL } = useTranslation();
  const numericCollectionId = Number(collectionId);
  const [title, setTitle] = React.useState("");
  const [heroImage, setHeroImage] = React.useState("");
  const [items, setItems] = React.useState<Category[]>([]);
  const [searchText, setSearchText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadCollection = async () => {
      setLoading(true);
      setNotFound(false);
      setSearchText("");

      try {
        const categories = await govaApi.getPublicJson<Category[]>(
          "/catagory/categories.json",
        );

        if (Number.isNaN(numericCollectionId)) {
          setNotFound(true);
          return;
        }

        const collectionItems = categories.filter(
          (category) => category.collection === numericCollectionId,
        );

        if (collectionItems.length === 0) {
          setNotFound(true);
          return;
        }

        const firstCollectionItem = collectionItems[0];
        const collectionTitle =
          locale === "ar"
            ? firstCollectionItem.collection_ar
            : firstCollectionItem.collection_en;

        if (!cancelled) {
          setTitle(collectionTitle || "");
          setHeroImage(firstCollectionItem.collection_image || "");
          setItems(collectionItems);
        }
      } catch (error) {
        console.error("Failed to load collection:", error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCollection();

    return () => {
      cancelled = true;
    };
  }, [locale, numericCollectionId]);

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredItems = normalizedSearchText
    ? items.filter((item) => {
        const arabicTitle = item.title_ar.toLowerCase();
        const englishTitle = item.title_en.toLowerCase();
        return (
          arabicTitle.includes(normalizedSearchText) ||
          englishTitle.includes(normalizedSearchText)
        );
      })
    : items;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="px-4 py-6">
        <p className="mt-8 text-center text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629"
            : "Collection not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="gova-section-tonal gova-section-tonal-primary overflow-hidden">
        <div className="relative min-h-28 rounded-2xl bg-surface-bright p-4">
          {heroImage && (
            <Image
              src={`/images/mainCategories/${heroImage}`}
              alt={title}
              fill
              className="object-cover opacity-20"
              priority
            />
          )}
          <div className="relative z-10">
            <p className="text-xs font-medium text-on-surface-variant">
              {locale === "ar"
                ? "\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a"
                : "Collections"}
            </p>
            <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
          </div>
        </div>
      </section>

      <div className="relative">
        <Search
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant ${
            isRTL ? "right-4" : "left-4"
          }`}
          aria-hidden
        />
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder={
            locale === "ar"
              ? "\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629"
              : "Search collection"
          }
          className={`w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary ${
            isRTL ? "pr-12" : "pl-12"
          }`}
        />
      </div>

      {filteredItems.length === 0 ? (
        <p className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629"
            : "No matching results"}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
          {filteredItems.map((item) => {
            const name = locale === "ar" ? item.title_ar : item.title_en;
            const imageSrc = `/images/mainCategories/${item.image}`;

            return (
              <button
                key={item.id}
                type="button"
                className="group flex flex-col gap-2 text-start transition-transform duration-200 active:scale-95"
                onClick={() => {
                  // Navigate to the category page
                  window.location.href = `/categories/${item.id}`;
                }}
                aria-label={name}
              >
                <div className="relative aspect-[4/3.5] overflow-hidden rounded-2xl bg-surface-bright shadow-sm">
                  <Image
                    src={imageSrc}
                    alt={name}
                    fill
                    className="object-cover transition-opacity group-hover:opacity-90"
                  />
                  <span
                    className={`absolute bottom-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-black/50 px-2 py-1 text-[11px] font-normal leading-3 text-white ${
                      isRTL ? "right-2" : "left-2"
                    }`}
                  >
                    {name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
