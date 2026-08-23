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
    <section>
      <div className={categoryGridClassName}>
        {displayCategories.map((cat, index) => {
          const name = locale === "ar" ? cat.nameAr : cat.nameEn;
          const imgSrc = cat.imageUrl;
          return (
            <Link
              key={cat.id}
              href={getCategoryHref(cat)}
              className={categoryTileClassName}
              aria-label={name}
            >
              <div className={categoryTileImageClassName}>
                <Image
                  src={imgSrc}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 33vw, 220px"
                  className="object-cover"
                />
              </div>
              <span className={categoryTileTitleClassName}>
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
