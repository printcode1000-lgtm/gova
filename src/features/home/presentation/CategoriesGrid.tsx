"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import {
  categoryGridClassName,
  categoryTileClassName,
  categoryTileImageClassName,
  categoryTileTitleClassName,
} from "@/features/categories/ui";
import { useTranslation } from "@/shared/i18n";
import { uiAttributes } from "@asol/ui-registry-core";
import {
  CATEGORY_CONSTANTS,
  type CategoryDisplay,
} from "@/features/categories";

function getCategoryHref(cat: CategoryDisplay): string {
  if (cat.id === CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID) {
    return `/categories/${cat.id}/sellers/1`;
  }
  return cat.isCollection ? `/collections/${cat.id}` : `/categories/${cat.id}`;
}

interface CategoriesGridProps {
  displayCategories: readonly CategoryDisplay[];
}

export function CategoriesGrid({ displayCategories }: CategoriesGridProps) {
  const { locale } = useTranslation();

  return (
    <section id="home.categories-grid.section">
      <div id="home.categories-grid.div" className={categoryGridClassName}>
        {displayCategories.map((cat, index) => {
          const name = locale === "ar" ? cat.nameAr : cat.nameEn;
          const imgSrc = cat.imageUrl;
          const categoryKey = cat.canonicalKey ?? `${cat.kind}-${cat.id}`;
          return (
            <Link key={categoryKey}
              {...uiAttributes({ uid: "home-category-BxYuR3", id: "home-category", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "home-category" } })}
              href={getCategoryHref(cat)}
              className={categoryTileClassName}
              aria-label={name}
            >
              <div key="media" className={categoryTileImageClassName}>
                <Image
                  src={imgSrc}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 33vw, 220px"
                  className="object-cover"
                />
              </div>
              <span key="label" className={categoryTileTitleClassName}>
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
