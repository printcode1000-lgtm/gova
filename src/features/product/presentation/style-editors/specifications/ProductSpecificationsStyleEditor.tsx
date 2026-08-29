"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductSpecificationsStyleSettings } from "@/shared/ui/product-style-settings";
import { uiAttributes } from "@asol/ui-registry-core";

interface ProductSpecificationsStyleEditorProps {
  value: ProductSpecificationsStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductSpecificationsStyleSettings) => void;
}

export function ProductSpecificationsStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductSpecificationsStyleEditorProps) {
  return (
    <ProductStyleCard id="product.style-editors.specifications.product-specifications-style-editor.product-style-card"
      title="المواصفات العامة"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div {...uiAttributes({ uid: "product.style-editors.specifications.product-specifications-style-editor.div.2-eEu2V8", id: "product.style-editors.specifications.product-specifications-style-editor.div.2" })} id="product.style-editors.specifications.product-specifications-style-editor.div" className="grid gap-2">
        <OptionCheckbox id="product.style-editors.specifications.product-specifications-style-editor.option-checkbox" label="اللون" checked={value.color} disabled={disabled} onChange={(color) => onChange({ ...value, color })} />
        <OptionCheckbox id="product.style-editors.specifications.product-specifications-style-editor.option-checkbox.2" label="الأبعاد" checked={value.dimensions} disabled={disabled} onChange={(dimensions) => onChange({ ...value, dimensions })} />
        <OptionCheckbox id="product.style-editors.specifications.product-specifications-style-editor.option-checkbox.3" label="الحالة" checked={value.condition} disabled={disabled} onChange={(condition) => onChange({ ...value, condition })} />
        <OptionCheckbox id="product.style-editors.specifications.product-specifications-style-editor.option-checkbox.4" label="المقاس" checked={value.size} disabled={disabled} onChange={(size) => onChange({ ...value, size })} />
        <OptionCheckbox id="product.style-editors.specifications.product-specifications-style-editor.option-checkbox.5" label="الوزن" checked={value.weight} disabled={disabled} onChange={(weight) => onChange({ ...value, weight })} />
        <OptionCheckbox id="product.style-editors.specifications.product-specifications-style-editor.option-checkbox.6" label="سنة الصنع" checked={value.year} disabled={disabled} onChange={(year) => onChange({ ...value, year })} />
      </div>
    </ProductStyleCard>
  );
}
