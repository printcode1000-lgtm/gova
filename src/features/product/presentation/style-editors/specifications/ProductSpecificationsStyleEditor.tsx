"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductSpecificationsStyleSettings } from "@/shared/ui/product-style-settings";

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
    <ProductStyleCard id='presentation-style-editors-specifications-productspecificationsstyleeditor-productstylecard-1-wxavbc'
      title="المواصفات العامة"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='presentation-style-editors-specifications-productspecificationsstyleeditor-div-2-zy82p2' className="grid gap-2">
        <OptionCheckbox id='presentation-style-editors-specifications-productspecificationsstyleeditor-optioncheckbox-3-t2annl' label="اللون" checked={value.color} disabled={disabled} onChange={(color) => onChange({ ...value, color })} />
        <OptionCheckbox id='presentation-style-editors-specifications-productspecificationsstyleeditor-optioncheckbox-4-3ejgsf' label="الأبعاد" checked={value.dimensions} disabled={disabled} onChange={(dimensions) => onChange({ ...value, dimensions })} />
        <OptionCheckbox id='presentation-style-editors-specifications-productspecificationsstyleeditor-optioncheckbox-5-wiz4mg' label="الحالة" checked={value.condition} disabled={disabled} onChange={(condition) => onChange({ ...value, condition })} />
        <OptionCheckbox id='presentation-style-editors-specifications-productspecificationsstyleeditor-optioncheckbox-6-o7bfcj' label="المقاس" checked={value.size} disabled={disabled} onChange={(size) => onChange({ ...value, size })} />
        <OptionCheckbox id='presentation-style-editors-specifications-productspecificationsstyleeditor-optioncheckbox-7-qoloxz' label="الوزن" checked={value.weight} disabled={disabled} onChange={(weight) => onChange({ ...value, weight })} />
        <OptionCheckbox id='presentation-style-editors-specifications-productspecificationsstyleeditor-optioncheckbox-8-crhjhv' label="سنة الصنع" checked={value.year} disabled={disabled} onChange={(year) => onChange({ ...value, year })} />
      </div>
    </ProductStyleCard>
  );
}
