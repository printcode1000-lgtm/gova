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
    <ProductStyleCard id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-productstylecard-1-as4dfn'
      title="مواصفات العقار"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-div-2-p3x0r1' className="grid gap-2">
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-3-xohybc' label="المساحة" checked={value.area} disabled={disabled} onChange={(area) => onChange({ ...value, area })} />
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-4-zk8dk1' label="عدد الغرف" checked={value.rooms} disabled={disabled} onChange={(rooms) => onChange({ ...value, rooms })} />
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-5-ifxts4' label="عدد الحمامات" checked={value.bathrooms} disabled={disabled} onChange={(bathrooms) => onChange({ ...value, bathrooms })} />
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-6-uox38q' label="نوع العقار" checked={value.type} disabled={disabled} onChange={(type) => onChange({ ...value, type })} />
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-7-rl1gfi' label="العنوان" checked={value.address} disabled={disabled} onChange={(address) => onChange({ ...value, address })} />
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-8-pkucus' label="الموقع" checked={value.location} disabled={disabled} onChange={(location) => onChange({ ...value, location })} />
        <OptionCheckbox id='presentation-style-editors-property-specs-productpropertyspecsstyleeditor-optioncheckbox-9-wg5axz' label="التشطيب" checked={value.finishing} disabled={disabled} onChange={(finishing) => onChange({ ...value, finishing })} />
      </div>
    </ProductStyleCard>
  );
}
