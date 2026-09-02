"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductVehicleSpecsStyleSettings } from "@/shared/ui/product-style-settings";

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
    <ProductStyleCard id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-productstylecard-1-yhzcqw'
      title="مواصفات المركبة"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-div-2-2hpbif' className="grid gap-2">
        <OptionCheckbox id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-optioncheckbox-3-zwfvug' label="العلامة التجارية" checked={value.brand} disabled={disabled} onChange={(brand) => onChange({ ...value, brand })} />
        <OptionCheckbox id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-optioncheckbox-4-0w62oq' label="نوع الهيكل" checked={value.bodyType} disabled={disabled} onChange={(bodyType) => onChange({ ...value, bodyType })} />
        <OptionCheckbox id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-optioncheckbox-5-crtskq' label="الوقود" checked={value.fuel} disabled={disabled} onChange={(fuel) => onChange({ ...value, fuel })} />
        <OptionCheckbox id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-optioncheckbox-6-szfugx' label="ناقل الحركة" checked={value.transmission} disabled={disabled} onChange={(transmission) => onChange({ ...value, transmission })} />
        <OptionCheckbox id='presentation-style-editors-vehicle-specs-productvehiclespecsstyleeditor-optioncheckbox-7-bisu0l' label="خاص" checked={value.special} disabled={disabled} onChange={(special) => onChange({ ...value, special })} />
      </div>
    </ProductStyleCard>
  );
}
