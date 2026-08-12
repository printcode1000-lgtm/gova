"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductSpecificationsStyleSettings } from "@/components/ui/product-style-settings";

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
    <ProductStyleCard
      title="المواصفات العامة"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="اللون" checked={value.color} disabled={disabled} onChange={(color) => onChange({ ...value, color })} />
        <OptionCheckbox label="الأبعاد" checked={value.dimensions} disabled={disabled} onChange={(dimensions) => onChange({ ...value, dimensions })} />
        <OptionCheckbox label="الحالة" checked={value.condition} disabled={disabled} onChange={(condition) => onChange({ ...value, condition })} />
        <OptionCheckbox label="المقاس" checked={value.size} disabled={disabled} onChange={(size) => onChange({ ...value, size })} />
        <OptionCheckbox label="الوزن" checked={value.weight} disabled={disabled} onChange={(weight) => onChange({ ...value, weight })} />
        <OptionCheckbox label="سنة الصنع" checked={value.year} disabled={disabled} onChange={(year) => onChange({ ...value, year })} />
      </div>
    </ProductStyleCard>
  );
}
