"use client";

import { Heart, ShoppingCart, Tag } from "lucide-react";
import Image from "next/image";

import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { shouldUseUnoptimizedImage } from "@/lib/images/external-image";

const PRODUCTS = [
  {
    id: "product-card-shoes",
    categoryKey: "category.fashion",
    titleKey: "product.proRunnerShoes",
    priceKey: "product.price.runnerShoes",
    favFilled: true,
    img: "/images/mainCategories/Clothing%20%26%20Fashion.webp",
  },
  {
    id: "product-card-medical",
    categoryKey: "category.medicalShort",
    titleKey: "product.scannerV4",
    priceKey: "product.price.scanner",
    favFilled: false,
    img: "/images/mainCategories/Medical%20Services.webp",
  },
  {
    id: "product-card-phone",
    categoryKey: "category.electronics",
    titleKey: "product.novaPhone",
    priceKey: "product.price.novaPhone",
    favFilled: false,
    img: "/images/mainCategories/Tech%20%26%20Electronics.webp",
  },
  {
    id: "product-card-watch",
    categoryKey: "category.accessories",
    titleKey: "product.timepieceWatch",
    priceKey: "product.price.timepieceWatch",
    favFilled: false,
    img: "/images/mainCategories/Clothing%20%26%20Fashion.webp",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  categoryKey: TranslationKey;
  titleKey: TranslationKey;
  priceKey: TranslationKey;
  favFilled: boolean;
  img: string;
}>;

export function CuratedOffers() {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Tag size={24} className="text-secondary" aria-hidden />
          <h3 className="gova-section-heading gova-section-heading-secondary">
            {t("home.curated.title")}
          </h3>
        </div>
        <span className="gova-accent-chip-tertiary">
          {t("home.curated.limited")}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
        {PRODUCTS.map((product) => {
          const title = t(product.titleKey);
          return (
            <article
              key={product.id}
              className="gova-card-tonal gova-card-tonal-secondary overflow-hidden transition-all active:scale-95"
            >
              <div className="relative aspect-square">
                <Image
                  src={product.img}
                  alt={title}
                  fill
                  className="object-cover transition-transform active:scale-110"
                  unoptimized={shouldUseUnoptimizedImage(product.img)}
                />
                <button
                  type="button"
                  className="absolute top-2 start-2 w-8 h-8 rounded-full gova-surface-neutral/90 backdrop-blur flex items-center justify-center shadow-sm transition-transform active:scale-90"
                  style={{
                    color: product.favFilled
                      ? "var(--error)"
                      : "var(--on-surface-variant)",
                  }}
                  aria-label={t("home.curated.addToFavorites")}
                >
                  <Heart
                    size={18}
                    fill={product.favFilled ? "currentColor" : "none"}
                  />
                </button>
              </div>

              <div className="p-3 space-y-1">
                <span className="text-xs font-semibold text-success">
                  {t(product.categoryKey)}
                </span>
                <span className="block text-sm font-bold truncate text-on-surface">
                  {title}
                </span>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-base font-bold text-primary">
                    {t(product.priceKey)}
                  </span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center gova-accent-cta transition-transform active:scale-90"
                    aria-label={t("home.curated.addToCart")}
                  >
                    <ShoppingCart size={18} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          className="gova-control px-6 rounded-full font-bold text-sm gova-surface-neutral text-primary transition-transform active:scale-95"
        >
          {t("home.curated.showMore")}
        </button>
      </div>
    </section>
  );
}
