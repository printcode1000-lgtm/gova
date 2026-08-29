"use client";

import * as React from "react";

import { ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductImagesStyleSettings } from "@/shared/ui/product-style-settings";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <ProductStyleCard id="product.style-editors.images.product-images-style-editor.product-style-card"
      title="الصور"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <label {...uiAttributes({ uid: "product.style-editors.images.product-images-style-editor.label.2-Edt5gT", id: "product.style-editors.images.product-images-style-editor.label.2" })} id="product.style-editors.images.product-images-style-editor.label" className="flex items-center gap-3 text-sm">
        عدد الصور
        <input {...uiAttributes({ uid: "product.style-editors.images.product-images-style-editor.input.2-7n9UFO", id: "product.style-editors.images.product-images-style-editor.input.2" })} id="product.style-editors.images.product-images-style-editor.input"
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
          className="asol-control asol-field-surface h-9 w-24 border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
    </ProductStyleCard>
  );
}
