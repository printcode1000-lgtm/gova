"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductMainDataStyleSettings } from "@/components/ui/product-style-settings";

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
    <ProductStyleCard
      title="البيانات الرئيسية"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="الاسم" checked={value.name} disabled={disabled} onChange={(name) => onChange({ ...value, name })} />
        <OptionCheckbox label="العلامة التجارية" checked={value.brand} disabled={disabled} onChange={(brand) => onChange({ ...value, brand })} />
        <OptionCheckbox label="الشركة المصنعة" checked={value.manufacturer} disabled={disabled} onChange={(manufacturer) => onChange({ ...value, manufacturer })} />
        <OptionCheckbox label="متوفر" checked={value.available} disabled={disabled} onChange={(available) => onChange({ ...value, available })} />
        <OptionCheckbox label="وصف" checked={value.description} disabled={disabled} onChange={(description) => onChange({ ...value, description })} />
      </div>
    </ProductStyleCard>
  );
}
