"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductVehicleSpecsStyleSettings } from "@/components/ui/product-style-settings";

interface ProductVehicleSpecsStyleEditorProps {
  value: ProductVehicleSpecsStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductVehicleSpecsStyleSettings) => void;
}

export function ProductVehicleSpecsStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductVehicleSpecsStyleEditorProps) {
  return (
    <ProductStyleCard
      title="مواصفات المركبة"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="العلامة التجارية" checked={value.brand} disabled={disabled} onChange={(brand) => onChange({ ...value, brand })} />
        <OptionCheckbox label="نوع الهيكل" checked={value.bodyType} disabled={disabled} onChange={(bodyType) => onChange({ ...value, bodyType })} />
        <OptionCheckbox label="الوقود" checked={value.fuel} disabled={disabled} onChange={(fuel) => onChange({ ...value, fuel })} />
        <OptionCheckbox label="ناقل الحركة" checked={value.transmission} disabled={disabled} onChange={(transmission) => onChange({ ...value, transmission })} />
        <OptionCheckbox label="خاص" checked={value.special} disabled={disabled} onChange={(special) => onChange({ ...value, special })} />
      </div>
    </ProductStyleCard>
  );
}
