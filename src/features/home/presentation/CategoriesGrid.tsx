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
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";
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
    <section {...uiAttributes({ uid: "home.categories-grid.section.2-mijN36", id: "home.categories-grid.section.2" })} id="home.categories-grid.section">
      <div {...uiAttributes({ uid: "home.categories-grid.div.2-2ZizYH", id: "home.categories-grid.div.2" })} id="home.categories-grid.div" className={categoryGridClassName}>
        {displayCategories.map((cat, index) => {
          const name = locale === "ar" ? cat.nameAr : cat.nameEn;
          const imgSrc = cat.imageUrl;
          const categoryKey = cat.canonicalKey ?? `${cat.kind}-${cat.id}`;
          return (
            <Link key={categoryKey}
              {...uiAttributes({ uid: "home-category-BxYuR3", id: "home-category", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "home-category" } , instance: createOpaqueUiInstanceId("iter-1b8b471608", String(categoryKey))})}
              href={getCategoryHref(cat)}
              className={categoryTileClassName}
              aria-label={name}
            >
              <div key="media" {...uiAttributes({ uid: "home.categories-grid.div.3-cXhT4y", id: "home.categories-grid.div.3" , instance: createOpaqueUiInstanceId("iter-a6506d5b08", String("media"))})} className={categoryTileImageClassName}>
                <Image
                  src={imgSrc}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 33vw, 220px"
                  className="object-cover"
                />
              </div>
              <span key="label" {...uiAttributes({ uid: "home.categories-grid.span-f57aFV", id: "home.categories-grid.span" , instance: createOpaqueUiInstanceId("iter-2955c38c4e", String("label"))})} className={categoryTileTitleClassName}>
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
