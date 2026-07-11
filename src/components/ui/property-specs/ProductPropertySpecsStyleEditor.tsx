"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductPropertySpecsStyleSettings } from "@/components/ui/product-style-settings";

interface ProductPropertySpecsStyleEditorProps {
  value: ProductPropertySpecsStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductPropertySpecsStyleSettings) => void;
}

export function ProductPropertySpecsStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductPropertySpecsStyleEditorProps) {
  return (
    <ProductStyleCard
      title="مواصفات العقار"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="المساحة" checked={value.area} disabled={disabled} onChange={(area) => onChange({ ...value, area })} />
        <OptionCheckbox label="عدد الغرف" checked={value.rooms} disabled={disabled} onChange={(rooms) => onChange({ ...value, rooms })} />
        <OptionCheckbox label="عدد الحمامات" checked={value.bathrooms} disabled={disabled} onChange={(bathrooms) => onChange({ ...value, bathrooms })} />
        <OptionCheckbox label="نوع العقار" checked={value.type} disabled={disabled} onChange={(type) => onChange({ ...value, type })} />
        <OptionCheckbox label="العنوان" checked={value.address} disabled={disabled} onChange={(address) => onChange({ ...value, address })} />
        <OptionCheckbox label="الموقع" checked={value.location} disabled={disabled} onChange={(location) => onChange({ ...value, location })} />
        <OptionCheckbox label="التشطيب" checked={value.finishing} disabled={disabled} onChange={(finishing) => onChange({ ...value, finishing })} />
      </div>
    </ProductStyleCard>
  );
}
