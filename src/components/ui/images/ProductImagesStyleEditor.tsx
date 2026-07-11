"use client";

import * as React from "react";

import { ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductImagesStyleSettings } from "@/components/ui/product-style-settings";

interface ProductImagesStyleEditorProps {
  value: ProductImagesStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductImagesStyleSettings) => void;
}

export function ProductImagesStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductImagesStyleEditorProps) {
  return (
    <ProductStyleCard
      title="الصور"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <label className="flex items-center gap-3 text-sm">
        عدد الصور
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={value.count}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isInteger(next) && next >= 1) {
              onChange({ ...value, count: next });
            }
          }}
          disabled={disabled}
          className="gova-control gova-field-surface h-9 w-24 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
    </ProductStyleCard>
  );
}
