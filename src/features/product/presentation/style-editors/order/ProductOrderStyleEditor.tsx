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
    <ProductStyleCard id="product.style-editors.order.product-order-style-editor.product-style-card"
      title="الطلب"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id="product.style-editors.order.product-order-style-editor.div" className="grid gap-2">
        <OptionCheckbox id="product.style-editors.order.product-order-style-editor.option-checkbox"
          label="السلة"
          checked={value.cart}
          disabled={disabled}
          onChange={(cart) => onChange({ ...value, cart })}
        />
        <OptionCheckbox id="product.style-editors.order.product-order-style-editor.option-checkbox.2"
          label="المفضلة"
          checked={value.favorite}
          disabled={disabled}
          onChange={(favorite) => onChange({ ...value, favorite })}
        />
        <OptionCheckbox id="product.style-editors.order.product-order-style-editor.option-checkbox.3"
          label="تواصل مع مقدم الخدمة"
          checked={value.contact}
          disabled={disabled}
          onChange={(contact) => onChange({ ...value, contact })}
        />
        <OptionCheckbox id="product.style-editors.order.product-order-style-editor.option-checkbox.4"
          label="مشاركة المنتج"
          checked={value.share}
          disabled={disabled}
          onChange={(share) => onChange({ ...value, share })}
        />
        <OptionCheckbox id="product.style-editors.order.product-order-style-editor.option-checkbox.5"
          label="بروفايل صاحب المنتج"
          checked={value.profile}
          disabled={disabled}
          onChange={(profile) => onChange({ ...value, profile })}
        />
      </div>
    </ProductStyleCard>
  );
}
