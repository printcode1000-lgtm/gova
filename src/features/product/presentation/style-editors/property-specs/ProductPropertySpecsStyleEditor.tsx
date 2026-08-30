"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductPropertySpecsStyleSettings } from "@/shared/ui/product-style-settings";

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
    <ProductStyleCard id="product.style-editors.property-specs.product-property-specs-style-editor.product-style-card"
      title="مواصفات العقار"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id="product.style-editors.property-specs.product-property-specs-style-editor.div" className="grid gap-2">
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox" label="المساحة" checked={value.area} disabled={disabled} onChange={(area) => onChange({ ...value, area })} />
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox.2" label="عدد الغرف" checked={value.rooms} disabled={disabled} onChange={(rooms) => onChange({ ...value, rooms })} />
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox.3" label="عدد الحمامات" checked={value.bathrooms} disabled={disabled} onChange={(bathrooms) => onChange({ ...value, bathrooms })} />
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox.4" label="نوع العقار" checked={value.type} disabled={disabled} onChange={(type) => onChange({ ...value, type })} />
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox.5" label="العنوان" checked={value.address} disabled={disabled} onChange={(address) => onChange({ ...value, address })} />
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox.6" label="الموقع" checked={value.location} disabled={disabled} onChange={(location) => onChange({ ...value, location })} />
        <OptionCheckbox id="product.style-editors.property-specs.product-property-specs-style-editor.option-checkbox.7" label="التشطيب" checked={value.finishing} disabled={disabled} onChange={(finishing) => onChange({ ...value, finishing })} />
      </div>
    </ProductStyleCard>
  );
}
