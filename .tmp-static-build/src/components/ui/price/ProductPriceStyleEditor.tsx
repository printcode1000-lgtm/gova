"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductPriceStyleSettings } from "@/components/ui/product-style-settings";

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
    <ProductStyleCard
      title="السعر"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="السعر الحالي" checked={value.current} disabled={disabled} onChange={(current) => onChange({ ...value, current })} />
        <OptionCheckbox label="قبل الخصم" checked={value.beforeDiscount} disabled={disabled} onChange={(beforeDiscount) => onChange({ ...value, beforeDiscount })} />
        <OptionCheckbox label="يحتاج سيارة" checked={value.needsCar} disabled={disabled} onChange={(needsCar) => onChange({ ...value, needsCar })} />
      </div>
    </ProductStyleCard>
  );
}
