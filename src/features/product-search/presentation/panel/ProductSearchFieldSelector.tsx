"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import type { ProductSearchField } from "@/features/product-search";

interface ProductSearchFieldSelectorProps {
  fields: ProductSearchField[];
  selectedKeys: string[];
  locale: "ar" | "en";
  onChange: (keys: string[]) => void;
}

export function ProductSearchFieldSelector({
  fields,
  selectedKeys,
  locale,
  onChange,
}: ProductSearchFieldSelectorProps) {
  const selected = new Set(selectedKeys);

  if (fields.length === 0) {
    return (
      <p id='product-search-presentation-panel-productsearchfieldselector-text-1-rrur5w' className="rounded-lg border border-dashed border-outline-variant p-3 text-xs text-on-surface-variant">
        {locale === "ar"
          ? "اختر الفئة الرئيسية والفرعية أولًا لعرض أعمدة البحث المناسبة."
          : "Select a main and sub category first to show matching search fields."}
      </p>
    );
  }

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(Array.from(next));
  };

  return (
    <div id='product-search-presentation-panel-productsearchfieldselector-div-2-sphbyg' className="overflow-hidden rounded-lg border border-outline-variant bg-surface">
      <div id='product-search-presentation-panel-productsearchfieldselector-div-3-jv1vja' className="flex items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-3 py-2">
        <span id='product-search-presentation-panel-productsearchfieldselector-text-4-75qoly' className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface">
          <SlidersHorizontal id='product-search-presentation-panel-productsearchfieldselector-slidershorizontal-5-jihwkh' className="h-4 w-4" />
          {locale === "ar" ? "سوف يتم البحث في" : "Search in"}
        </span>
      </div>
      <div id='product-search-presentation-panel-productsearchfieldselector-div-7-jsb2yp' className="flex flex-wrap gap-2 p-2">
        {fields.map((field) => (
          <label
            key={field.key}
            className={`inline-flex h-8  items-center gap-2 rounded-lg border px-2 text-xs transition ${
              selected.has(field.key)
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface text-on-surface"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(field.key)}
              onChange={() => toggle(field.key)}
              className="sr-only"
            />
            <span>{locale === "ar" ? field.labelAr : field.labelEn}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
