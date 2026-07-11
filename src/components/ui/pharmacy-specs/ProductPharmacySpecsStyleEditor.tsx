"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductPharmacySpecsStyleSettings } from "@/components/ui/product-style-settings";

interface ProductPharmacySpecsStyleEditorProps {
  value: ProductPharmacySpecsStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductPharmacySpecsStyleSettings) => void;
}

export function ProductPharmacySpecsStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductPharmacySpecsStyleEditorProps) {
  return (
    <ProductStyleCard
      title="مواصفات الصيدلية"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="الاسم بالعربي" checked={value.nameAr} disabled={disabled} onChange={(nameAr) => onChange({ ...value, nameAr })} />
        <OptionCheckbox label="الاسم بالإنجليزي" checked={value.nameEn} disabled={disabled} onChange={(nameEn) => onChange({ ...value, nameEn })} />
        <OptionCheckbox label="شكل الدواء" checked={value.form} disabled={disabled} onChange={(form) => onChange({ ...value, form })} />
        <OptionCheckbox label="التركيز" checked={value.concentration} disabled={disabled} onChange={(concentration) => onChange({ ...value, concentration })} />
        <OptionCheckbox label="المادة الفعالة" checked={value.activeIngredient} disabled={disabled} onChange={(activeIngredient) => onChange({ ...value, activeIngredient })} />
      </div>
    </ProductStyleCard>
  );
}
