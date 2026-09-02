"use client";

import {
  OptionCheckbox,
  ProductStyleCard,
} from "@/shared/ui/product-style-card";
import type { ProductOrderStyleSettings } from "@/shared/ui/product-style-settings";

interface ProductOrderStyleEditorProps {
  value: ProductOrderStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductOrderStyleSettings) => void;
}

export function ProductOrderStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductOrderStyleEditorProps) {
  return (
    <ProductStyleCard id='presentation-style-editors-order-productorderstyleeditor-productstylecard-1-qayuzg'
      title="الطلب"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='presentation-style-editors-order-productorderstyleeditor-div-2-jr5fwx' className="grid gap-2">
        <OptionCheckbox id='presentation-style-editors-order-productorderstyleeditor-optioncheckbox-3-ggdfwi'
          label="السلة"
          checked={value.cart}
          disabled={disabled}
          onChange={(cart) => onChange({ ...value, cart })}
        />
        <OptionCheckbox id='presentation-style-editors-order-productorderstyleeditor-optioncheckbox-4-dvjqea'
          label="المفضلة"
          checked={value.favorite}
          disabled={disabled}
          onChange={(favorite) => onChange({ ...value, favorite })}
        />
        <OptionCheckbox id='presentation-style-editors-order-productorderstyleeditor-optioncheckbox-5-yje2w3'
          label="تواصل مع مقدم الخدمة"
          checked={value.contact}
          disabled={disabled}
          onChange={(contact) => onChange({ ...value, contact })}
        />
        <OptionCheckbox id='presentation-style-editors-order-productorderstyleeditor-optioncheckbox-6-tgva22'
          label="مشاركة المنتج"
          checked={value.share}
          disabled={disabled}
          onChange={(share) => onChange({ ...value, share })}
        />
        <OptionCheckbox id='presentation-style-editors-order-productorderstyleeditor-optioncheckbox-7-li0u6y'
          label="بروفايل صاحب المنتج"
          checked={value.profile}
          disabled={disabled}
          onChange={(profile) => onChange({ ...value, profile })}
        />
      </div>
    </ProductStyleCard>
  );
}
