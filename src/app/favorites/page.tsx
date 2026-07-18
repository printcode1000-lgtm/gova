"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Package, Store } from "lucide-react";

import { ProductCard } from "@/components/ui/product-card";
import { SellerCard } from "@/components/ui/seller-card";
import { LoadingSpinner } from "@/components/ui";
import {
  productCardFromFavorite,
  sellerCardFromFavorite,
  useFavorites,
  type FavoriteTargetType,
} from "@/features/favorites";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function FavoritesPage() {
  const router = useRouter();
  const { isRTL } = useTranslation();
  const {
    items,
    isLoading,
    productCount,
    sellerCount,
  } = useFavorites();
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
    <div className="mx-auto w-full max-w-6xl px-4 py-6" dir={isRTL ? "rtl" : "ltr"}>
      <header className="mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Heart className={cn("h-6 w-6", items.length > 0 && "fill-current")} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-on-surface">{labels.title}</h1>
            <p className="mt-0.5 text-xs text-on-surface-variant">{labels.description}</p>
          </div>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 rounded-xl bg-surface-container p-1">
        <button
          type="button"
          onClick={() => setActiveTab("product")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
            activeTab === "product"
              ? "bg-surface text-primary shadow-sm"
              : "text-on-surface-variant",
          )}
        >
          <Package className="h-4 w-4" />
          {labels.products}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {productCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("seller")}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
            activeTab === "seller"
              ? "bg-surface text-primary shadow-sm"
              : "text-on-surface-variant",
          )}
        >
          <Store className="h-4 w-4" />
          {labels.sellers}
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {sellerCount}
          </span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      ) : visibleItems.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
          {activeTab === "product" ? (
            <Package className="mb-3 h-10 w-10 text-on-surface-variant" />
          ) : (
            <Store className="mb-3 h-10 w-10 text-on-surface-variant" />
          )}
          <p className="text-sm font-medium text-on-surface">
            {activeTab === "product" ? labels.emptyProducts : labels.emptySellers}
          </p>
          <Link
            href="/search"
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary no-underline transition active:scale-95"
          >
            {labels.browse}
          </Link>
        </section>
      ) : activeTab === "product" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const card = productCardFromFavorite(item);
            return (
              <ProductCard
                key={item.key}
                card={card}
                variant="search"
                onOpen={() => router.push(card.href || "/search")}
              />
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => {
            const card = sellerCardFromFavorite(item);
            return (
              <SellerCard
                key={item.key}
                card={card}
                variant="search"
                onOpen={() => router.push(card.href || "/search")}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
