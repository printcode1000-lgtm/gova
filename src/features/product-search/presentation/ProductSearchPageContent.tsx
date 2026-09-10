"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ProductSearchPanel } from "@/features/product-search/presentation/panel";
import { useTranslation } from "@/shared/i18n";

export function ProductSearchPageContent() {
  const { locale } = useTranslation();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  return (
    <main
      id="features-product-search-presentation-productsearchpagecontent-main-1-8izwfu"
      className="min-h-screen bg-background px-4 pb-24 pt-20"
    >
      <div
        id="features-product-search-presentation-productsearchpagecontent-div-2-vykpvt"
        className="mx-auto max-w-6xl space-y-5"
      >
        <header
          id="features-product-search-presentation-productsearchpagecontent-header-3-johmxy"
          className="space-y-2"
        >
          <h1
            id="features-product-search-presentation-productsearchpagecontent-heading-4-phvbts"
            className="flex items-center gap-2 text-xl font-bold text-on-surface"
          >
            <Search
              id="features-product-search-presentation-productsearchpagecontent-search-5-nyhmpc"
              className="h-5 w-5 text-primary"
            />
            {locale === "ar" ? "البحث" : "Search"}
          </h1>
        </header>
        <ProductSearchPanel
          id="features-product-search-presentation-productsearchpagecontent-productsearchpanel-7-pp7plb"
          variant="full"
          locale={locale === "ar" ? "ar" : "en"}
          initialQuery={initialQuery}
        />
      </div>
    </main>
  );
}
