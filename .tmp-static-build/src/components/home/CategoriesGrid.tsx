"use client";

import { Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  CATEGORY_CONSTANTS,
  type CategoryDisplay,
} from "@/features/categories";

const CATEGORY_RINGS = [
  "asol-ring-primary",
  "asol-ring-secondary",
  "asol-ring-tertiary",
  "asol-ring-error",
] as const;

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
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" aria-hidden />
          السويس
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 pb-2">
        {displayCategories.map((cat, index) => {
          const name = locale === "ar" ? cat.nameAr : cat.nameEn;
          const imgSrc = cat.imageUrl;
          return (
            <Link
              key={cat.id}
              href={getCategoryHref(cat)}
              className="flex flex-col gap-2 group transition-transform duration-200 active:scale-95"
              aria-label={name}
            >
              <div
                className={cn(
                  "rounded-2xl overflow-hidden border-2 border-transparent p-0 transition-all w-full aspect-[4/3.5] relative shadow-sm hover:shadow-md",
                )}
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-surface-bright group-hover:opacity-90 transition-opacity">
                  <Image
                    src={imgSrc}
                    alt={name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <span className="text-[11px] font-semibold leading-3 truncate text-center text-primary">
                {name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
