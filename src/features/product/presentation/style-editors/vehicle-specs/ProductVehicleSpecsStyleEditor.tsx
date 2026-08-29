"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductVehicleSpecsStyleSettings } from "@/shared/ui/product-style-settings";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <ProductStyleCard id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.product-style-card"
      title="مواصفات المركبة"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div {...uiAttributes({ uid: "product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.div.2-SeD1T4", id: "product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.div.2" })} id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.div" className="grid gap-2">
        <OptionCheckbox id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.option-checkbox" label="العلامة التجارية" checked={value.brand} disabled={disabled} onChange={(brand) => onChange({ ...value, brand })} />
        <OptionCheckbox id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.option-checkbox.2" label="نوع الهيكل" checked={value.bodyType} disabled={disabled} onChange={(bodyType) => onChange({ ...value, bodyType })} />
        <OptionCheckbox id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.option-checkbox.3" label="الوقود" checked={value.fuel} disabled={disabled} onChange={(fuel) => onChange({ ...value, fuel })} />
        <OptionCheckbox id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.option-checkbox.4" label="ناقل الحركة" checked={value.transmission} disabled={disabled} onChange={(transmission) => onChange({ ...value, transmission })} />
        <OptionCheckbox id="product.style-editors.vehicle-specs.product-vehicle-specs-style-editor.option-checkbox.5" label="خاص" checked={value.special} disabled={disabled} onChange={(special) => onChange({ ...value, special })} />
      </div>
    </ProductStyleCard>
  );
}
