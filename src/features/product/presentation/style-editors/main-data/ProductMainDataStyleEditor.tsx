"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductMainDataStyleSettings } from "@/shared/ui/product-style-settings";

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
    <ProductStyleCard id='presentation-style-editors-main-data-productmaindatastyleeditor-productstylecard-1-xcniup'
      title="البيانات الرئيسية"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='presentation-style-editors-main-data-productmaindatastyleeditor-div-2-izihic' className="grid gap-2">
        <OptionCheckbox id='presentation-style-editors-main-data-productmaindatastyleeditor-optioncheckbox-3-cwi9tq' label="الاسم" checked={value.name} disabled={disabled} onChange={(name) => onChange({ ...value, name })} />
        <OptionCheckbox id='presentation-style-editors-main-data-productmaindatastyleeditor-optioncheckbox-4-89ofpb' label="العلامة التجارية" checked={value.brand} disabled={disabled} onChange={(brand) => onChange({ ...value, brand })} />
        <OptionCheckbox id='presentation-style-editors-main-data-productmaindatastyleeditor-optioncheckbox-5-osbuma' label="الشركة المصنعة" checked={value.manufacturer} disabled={disabled} onChange={(manufacturer) => onChange({ ...value, manufacturer })} />
        <OptionCheckbox id='presentation-style-editors-main-data-productmaindatastyleeditor-optioncheckbox-6-ld2tbz' label="متوفر" checked={value.available} disabled={disabled} onChange={(available) => onChange({ ...value, available })} />
        <OptionCheckbox id='presentation-style-editors-main-data-productmaindatastyleeditor-optioncheckbox-7-xnlsy6' label="وصف" checked={value.description} disabled={disabled} onChange={(description) => onChange({ ...value, description })} />
      </div>
    </ProductStyleCard>
  );
}
