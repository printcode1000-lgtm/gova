"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductMainDataStyleSettings } from "@/shared/ui/product-style-settings";
import { uiAttributes } from "@asol/ui-registry-core";

interface ProductMainDataStyleEditorProps {
  value: ProductMainDataStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductMainDataStyleSettings) => void;
}

export function ProductMainDataStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductMainDataStyleEditorProps) {
  return (
    <ProductStyleCard id="product.style-editors.main-data.product-main-data-style-editor.product-style-card"
      title="البيانات الرئيسية"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div {...uiAttributes({ uid: "product.style-editors.main-data.product-main-data-style-editor.div.2-y76rGv", id: "product.style-editors.main-data.product-main-data-style-editor.div.2" })} id="product.style-editors.main-data.product-main-data-style-editor.div" className="grid gap-2">
        <OptionCheckbox id="product.style-editors.main-data.product-main-data-style-editor.option-checkbox" label="الاسم" checked={value.name} disabled={disabled} onChange={(name) => onChange({ ...value, name })} />
        <OptionCheckbox id="product.style-editors.main-data.product-main-data-style-editor.option-checkbox.2" label="العلامة التجارية" checked={value.brand} disabled={disabled} onChange={(brand) => onChange({ ...value, brand })} />
        <OptionCheckbox id="product.style-editors.main-data.product-main-data-style-editor.option-checkbox.3" label="الشركة المصنعة" checked={value.manufacturer} disabled={disabled} onChange={(manufacturer) => onChange({ ...value, manufacturer })} />
        <OptionCheckbox id="product.style-editors.main-data.product-main-data-style-editor.option-checkbox.4" label="متوفر" checked={value.available} disabled={disabled} onChange={(available) => onChange({ ...value, available })} />
        <OptionCheckbox id="product.style-editors.main-data.product-main-data-style-editor.option-checkbox.5" label="وصف" checked={value.description} disabled={disabled} onChange={(description) => onChange({ ...value, description })} />
      </div>
    </ProductStyleCard>
  );
}
