"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ProductSearchPanel } from "@/components/ui/product-search";
import { useTranslation } from "@/lib/i18n";

export function ProductSearchPageContent() {
  const { locale } = useTranslation();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-20">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-xl font-bold text-on-surface">
            <Search className="h-5 w-5 text-primary" />
            {locale === "ar" ? "البحث" : "Search"}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {locale === "ar"
              ? "ابحث في المنتجات أو البائعين بعد اختيار الفئة الرئيسية والفرعية."
              : "Search products or sellers after selecting a main and sub category."}
          </p>
        </header>
        <ProductSearchPanel
          variant="full"
          locale={locale === "ar" ? "ar" : "en"}
          initialQuery={initialQuery}
        />
      </div>
    </main>
  );
}
