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
      <p className="rounded-lg border border-dashed border-outline-variant p-3 text-xs text-on-surface-variant">
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface">
          <SlidersHorizontal className="h-4 w-4" />
          {locale === "ar" ? "أعمدة البحث" : "Search fields"}
        </span>
        <button
          type="button"
          onClick={() =>
            onChange(selectedKeys.length === fields.length ? [] : fields.map((field) => field.key))
          }
          className="text-xs font-semibold text-primary"
        >
          {selectedKeys.length === fields.length
            ? locale === "ar"
              ? "إلغاء الكل"
              : "Clear all"
            : locale === "ar"
              ? "اختيار الكل"
              : "Select all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <label
            key={field.key}
            className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border px-2 text-xs transition ${
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
