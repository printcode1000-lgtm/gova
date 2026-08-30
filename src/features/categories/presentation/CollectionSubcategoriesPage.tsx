"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { useTranslation } from "@/shared/i18n";
import type { CollectionDisplay } from "@/features/categories";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";
import {
  categoryGridClassName,
  categoryTileClassName,
  categoryTileImageClassName,
  categoryTileTitleClassName,
} from "@/features/categories/presentation/category-grid-styles";

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
    <div {...uiAttributes({ uid: "categories.collection-subcategories-page.div.7-wk9YIl", id: "categories.collection-subcategories-page.div.7" })} id="categories.collection-subcategories-page.div" className="space-y-5 px-4 py-5">
      <div {...uiAttributes({ uid: "categories.collection-subcategories-page.div.8-E4U5Eq", id: "categories.collection-subcategories-page.div.8" })} id="categories.collection-subcategories-page.div.2" className="relative min-h-28 rounded-3xl bg-surface-bright space-y-3 p-4 overflow-hidden">
        {heroImage && (
          <Image id="categories.collection-subcategories-page.image"
            src={collection.imageUrl}
            alt={title}
            fill
            className="object-cover opacity-20"
            priority
          />
        )}
        <div {...uiAttributes({ uid: "categories.collection-subcategories-page.div.9-5UuTlP", id: "categories.collection-subcategories-page.div.9" })} id="categories.collection-subcategories-page.div.3" className="relative z-10">
          <h1 {...uiAttributes({ uid: "categories.collection-subcategories-page.h1.2-2UOr0B", id: "categories.collection-subcategories-page.h1.2" })} id="categories.collection-subcategories-page.h1" className="text-2xl font-bold text-on-surface">{title}</h1>
        </div>
        <div {...uiAttributes({ uid: "categories.collection-subcategories-page.div.10-eT28EX", id: "categories.collection-subcategories-page.div.10" })} id="categories.collection-subcategories-page.div.4" className="relative">
          <Search id="categories.collection-subcategories-page.search"
            className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <input {...uiAttributes({ uid: "categories.collection-subcategories-page.input.2-m8NK1I", id: "categories.collection-subcategories-page.input.2" })} id="categories.collection-subcategories-page.input"
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
        <p {...uiAttributes({ uid: "categories.collection-subcategories-page.p.2-b5WDK1", id: "categories.collection-subcategories-page.p.2" })} id="categories.collection-subcategories-page.p" className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629"
            : "No matching results"}
        </p>
      ) : (
        <div {...uiAttributes({ uid: "categories.collection-subcategories-page.div.11-J6Z3ms", id: "categories.collection-subcategories-page.div.11" })} id="categories.collection-subcategories-page.div.5" className="asol-section-tonal asol-section-tonal-primary">
          <div {...uiAttributes({ uid: "categories.collection-subcategories-page.div.12-Q63NYl", id: "categories.collection-subcategories-page.div.12" })} id="categories.collection-subcategories-page.div.6" className={categoryGridClassName}>
          {filteredItems.map((item) => {
            const name = locale === "ar" ? item.nameAr : item.nameEn;
            const imageSrc = item.imageUrl;
            const altText = name || "Category image";

            return (
              <Link key={item.id}
                {...uiAttributes({ uid: "collection-item-XJ5IGf", id: "collection-item", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "collection-item" } , instance: createOpaqueUiInstanceId("iter-d2507a7444", String(item.id))})}
                href={`/categories/${item.id}`}
                className={categoryTileClassName}
                aria-label={altText}
              >
                <div key="media" {...uiAttributes({ uid: "categories.collection-subcategories-page.div.13-UZX92K", id: "categories.collection-subcategories-page.div.13" , instance: createOpaqueUiInstanceId("iter-2454d55556", String("media"))})} className={categoryTileImageClassName}>
                  <Image
                    src={imageSrc}
                    alt={altText}
                    fill
                    className="object-cover transition-opacity"
                  />
                </div>
                <span key="label" {...uiAttributes({ uid: "categories.collection-subcategories-page.span-OmRU04", id: "categories.collection-subcategories-page.span" , instance: createOpaqueUiInstanceId("iter-6622d4fe36", String("label"))})} className={categoryTileTitleClassName}>{name}</span>
              </Link>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
