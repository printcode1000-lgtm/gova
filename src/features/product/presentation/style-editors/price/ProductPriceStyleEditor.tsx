"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductPriceStyleSettings } from "@/shared/ui/product-style-settings";

interface ProductPriceStyleEditorProps {
  value: ProductPriceStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductPriceStyleSettings) => void;
}

export function ProductPriceStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductPriceStyleEditorProps) {
  return (
    <ProductStyleCard id="product.style-editors.price.product-price-style-editor.product-style-card"
      title="السعر"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id="product.style-editors.price.product-price-style-editor.div" className="grid gap-2">
        <OptionCheckbox id="product.style-editors.price.product-price-style-editor.option-checkbox" label="السعر الحالي" checked={value.current} disabled={disabled} onChange={(current) => onChange({ ...value, current })} />
        <OptionCheckbox id="product.style-editors.price.product-price-style-editor.option-checkbox.2" label="قبل الخصم" checked={value.beforeDiscount} disabled={disabled} onChange={(beforeDiscount) => onChange({ ...value, beforeDiscount })} />
        <OptionCheckbox id="product.style-editors.price.product-price-style-editor.option-checkbox.3" label="يحتاج سيارة" checked={value.needsCar} disabled={disabled} onChange={(needsCar) => onChange({ ...value, needsCar })} />
      </div>
    </ProductStyleCard>
  );
}
