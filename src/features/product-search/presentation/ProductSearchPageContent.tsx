"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ProductSearchPanel } from "@/features/product-search/presentation/panel";
import { useTranslation } from "@/shared/i18n";
import { uiAttributes } from "@asol/ui-registry-core";

export function ProductSearchPageContent() {
  const { locale } = useTranslation();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  return (
    <main {...uiAttributes({ uid: "product-search.product-search-page-content.main.2-7RPn04", id: "product-search.product-search-page-content.main.2" })} id="product-search.product-search-page-content.main" className="min-h-screen bg-background px-4 pb-24 pt-20">
      <div {...uiAttributes({ uid: "product-search.product-search-page-content.div.2-2j2Zvt", id: "product-search.product-search-page-content.div.2" })} id="product-search.product-search-page-content.div" className="mx-auto max-w-6xl space-y-5">
        <header {...uiAttributes({ uid: "product-search.product-search-page-content.header.2-a3OBRM", id: "product-search.product-search-page-content.header.2" })} id="product-search.product-search-page-content.header" className="space-y-2">
          <h1 {...uiAttributes({ uid: "product-search.product-search-page-content.h1.2-FD7UqC", id: "product-search.product-search-page-content.h1.2" })} id="product-search.product-search-page-content.h1" className="flex items-center gap-2 text-xl font-bold text-on-surface">
            <Search id="product-search.product-search-page-content.search" className="h-5 w-5 text-primary" />
            {locale === "ar" ? "البحث" : "Search"}
          </h1>
          <p {...uiAttributes({ uid: "product-search.product-search-page-content.p.2-t0MI99", id: "product-search.product-search-page-content.p.2" })} id="product-search.product-search-page-content.p" className="text-sm text-on-surface-variant">
            {locale === "ar"
              ? "ابحث في المنتجات أو البائعين بعد اختيار الفئة الرئيسية والفرعية."
              : "Search products or sellers after selecting a main and sub category."}
          </p>
        </header>
        <ProductSearchPanel id="product-search.product-search-page-content.product-search-panel"
          variant="full"
          locale={locale === "ar" ? "ar" : "en"}
          initialQuery={initialQuery}
        />
      </div>
    </main>
  );
}
