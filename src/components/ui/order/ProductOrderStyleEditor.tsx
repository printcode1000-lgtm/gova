"use client";

import { OptionCheckbox, ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductOrderStyleSettings } from "@/components/ui/product-style-settings";

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
    <ProductStyleCard
      title="الطلب"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div className="grid gap-2">
        <OptionCheckbox label="السلة" checked={value.cart} disabled={disabled} onChange={(cart) => onChange({ ...value, cart })} />
        <OptionCheckbox label="المفضلة" checked={value.favorite} disabled={disabled} onChange={(favorite) => onChange({ ...value, favorite })} />
        <OptionCheckbox label="تواصل مع مقدم الخدمة" checked={value.contact} disabled={disabled} onChange={(contact) => onChange({ ...value, contact })} />
      </div>
    </ProductStyleCard>
  );
}
