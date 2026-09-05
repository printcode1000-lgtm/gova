"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Package, Store } from "lucide-react";

import { ProductCard } from "@asol/product-card-core/ui";
import { SellerCard } from "@asol/seller-card-core/ui";
import { LoadingSpinner } from "@/shared/ui";
import {
  productCardFromFavorite,
  sellerCardFromFavorite,
  type FavoriteTargetType,
} from "@asol/favorites-core";
import { useFavorites } from "@asol/favorites-core/ui";
import {
  ProductCardFavoriteSlot,
  SellerCardFavoriteSlot,
} from "@/features/favorites/ui";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/utils";

export default function FavoritesPage() {
  const router = useRouter();
  const { isRTL } = useTranslation();
  const { items, isLoading, productCount, sellerCount } = useFavorites();
  const [activeTab, setActiveTab] = React.useState<FavoriteTargetType>("product");
  const visibleItems = items.filter((item) => item.type === activeTab);

  const labels = isRTL
    ? {
        title: "المفضلة",
        description: "كل المنتجات والبائعين الذين حفظتهم على هذا الجهاز.",
        products: "المنتجات",
        sellers: "البائعون",
        emptyProducts: "لم تحفظ أي منتجات في المفضلة بعد.",
        emptySellers: "لم تحفظ أي بائعين في المفضلة بعد.",
        browse: "ابدأ التصفح",
      }
    : {
        title: "Favorites",
        description: "Products and sellers saved on this device.",
        products: "Products",
        sellers: "Sellers",
        emptyProducts: "You have not saved any products yet.",
        emptySellers: "You have not saved any sellers yet.",
        browse: "Start browsing",
      };

  return (
    <div id='app-favorites-page-div-1-lijkxc' className="mx-auto w-full max-w-6xl px-4 py-6" dir={isRTL ? "rtl" : "ltr"}>
      <header id='app-favorites-page-header-2-0r6sox' className="mb-5">
        <div id='app-favorites-page-div-3-c5ycov' className="flex items-center gap-3">
          <div id='app-favorites-page-div-4-dqlxg6' className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Heart id='app-favorites-page-heart-5-r5f2gb' className={cn("h-6 w-6", items.length > 0 && "fill-current")} />
          </div>
          <div id='app-favorites-page-div-6-ppctaf'>
            <h1 id='app-favorites-page-heading-7-bqer3x' className="text-xl font-bold text-on-surface">{labels.title}</h1>
            <p id='app-favorites-page-text-8-fx13ul' className="mt-0.5 text-xs text-on-surface-variant">{labels.description}</p>
          </div>
        </div>
      </header>

      <div id='app-favorites-page-div-9-g55fup' className="mb-5 grid grid-cols-2 rounded-xl bg-surface-container p-1">
        <button id="app-favorites-page-button-10-smeit7"
          type="button"
          onClick={() => setActiveTab("product")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
            activeTab === "product" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant",
          )}
        >
          <Package id='app-favorites-page-package-11-wvnf6f' className="h-4 w-4" />
          {labels.products}
          <span id='app-favorites-page-text-12-6mtyyf' className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{productCount}</span>
        </button>
        <button id="app-favorites-page-button-13-kvatuw"
          type="button"
          onClick={() => setActiveTab("seller")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
            activeTab === "seller" ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant",
          )}
        >
          <Store id='app-favorites-page-store-14-ce4xab' className="h-4 w-4" />
          {labels.sellers}
          <span id='app-favorites-page-text-15-ufvifd' className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{sellerCount}</span>
        </button>
      </div>

      {isLoading ? (
        <div id='app-favorites-page-div-16-zfka4k' className="flex min-h-48 items-center justify-center">
          <LoadingSpinner id='app-favorites-page-loadingspinner-17-v5kmkn' size="sm" />
        </div>
      ) : visibleItems.length === 0 ? (
        <section id='app-favorites-page-section-18-fp4k7t' className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
          {activeTab === "product" ? (
            <Package id='app-favorites-page-package-19-wfzspw' className="mb-3 h-10 w-10 text-on-surface-variant" />
          ) : (
            <Store id='app-favorites-page-store-20-kgfify' className="mb-3 h-10 w-10 text-on-surface-variant" />
          )}
          <p id='app-favorites-page-text-21-9l6ihi' className="text-sm font-medium text-on-surface">
            {activeTab === "product" ? labels.emptyProducts : labels.emptySellers}
          </p>
          <Link id='app-favorites-page-link-22-whekha' href="/search" className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary no-underline transition active:scale-95">
            {labels.browse}
          </Link>
        </section>
      ) : activeTab === "product" ? (
        <div id='app-favorites-page-div-23-rxrgeo' className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const card = productCardFromFavorite(item);
            return (
              <ProductCard
                key={item.key}
                card={card}
                variant="search"
                favoriteSlot={<ProductCardFavoriteSlot card={card} />}
                onOpen={() => router.push(card.href || "/search")}
              />
            );
          })}
        </div>
      ) : (
        <div id='app-favorites-page-div-24-wxte0r' className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const card = sellerCardFromFavorite(item);
            return (
              <SellerCard
                key={item.key}
                card={card}
                variant="search"
                favoriteSlot={<SellerCardFavoriteSlot card={card} />}
                onOpen={() => router.push(card.href || "/search")}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
