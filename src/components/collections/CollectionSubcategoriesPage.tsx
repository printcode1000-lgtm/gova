"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { useTranslation } from "@/lib/i18n";
import type { CollectionDisplay } from "@/features/categories";
import {
  categoryGridClassName,
  categoryTileClassName,
  categoryTileImageClassName,
  categoryTileTitleClassName,
} from "@/components/categories/category-grid-styles";

interface CollectionSubcategoriesPageProps {
  collection: CollectionDisplay;
}

export function CollectionSubcategoriesPage({
  collection,
}: CollectionSubcategoriesPageProps) {
  const { locale } = useTranslation();
  const [searchText, setSearchText] = React.useState("");

  const title = locale === "ar" ? collection.nameAr : collection.nameEn;
  const heroImage = collection.image;
  const items = collection.items;

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredItems = normalizedSearchText
    ? items.filter((item) => {
        const arabicTitle = item.nameAr.toLowerCase();
        const englishTitle = item.nameEn.toLowerCase();
        return (
          arabicTitle.includes(normalizedSearchText) ||
          englishTitle.includes(normalizedSearchText)
        );
      })
    : items;

  return (
    <div className="space-y-5 px-4 py-5">
      <div className="relative min-h-28 rounded-3xl bg-surface-bright space-y-3 p-4 overflow-hidden">
        {heroImage && (
          <Image
            src={collection.imageUrl}
            alt={title}
            fill
            className="object-cover opacity-20"
            priority
          />
        )}
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        </div>
        <div className="relative">
          <Search
            className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
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
            className="asol-input-decorated-start w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629"
            : "No matching results"}
        </p>
      ) : (
        <div className="asol-section-tonal asol-section-tonal-primary">
          <div className={categoryGridClassName}>
          {filteredItems.map((item) => {
            const name = locale === "ar" ? item.nameAr : item.nameEn;
            const imageSrc = item.imageUrl;
            const altText = name || "Category image";

            return (
              <Link
                key={item.id}
                href={`/categories/${item.id}`}
                className={categoryTileClassName}
                aria-label={altText}
              >
                <div className={categoryTileImageClassName}>
                  <Image
                    src={imageSrc}
                    alt={altText}
                    fill
                    className="object-cover transition-opacity group-hover:opacity-90"
                  />
                </div>
                <span className={categoryTileTitleClassName}>{name}</span>
              </Link>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
