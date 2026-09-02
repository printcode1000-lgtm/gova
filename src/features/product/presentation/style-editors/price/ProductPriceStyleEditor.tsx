"use client";

import { OptionCheckbox, ProductStyleCard } from "@/shared/ui/product-style-card";
import type { ProductPriceStyleSettings } from "@/shared/ui/product-style-settings";

interface ProductPriceStyleEditorProps {
  value: ProductPriceStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductPriceStyleSettings) => void;
}

export function ProductPriceStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductPriceStyleEditorProps) {
  return (
    <ProductStyleCard id='presentation-style-editors-price-productpricestyleeditor-productstylecard-1-xmzmng'
      title="السعر"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <div id='presentation-style-editors-price-productpricestyleeditor-div-2-c4eady' className="grid gap-2">
        <OptionCheckbox id='presentation-style-editors-price-productpricestyleeditor-optioncheckbox-3-clb8st' label="السعر الحالي" checked={value.current} disabled={disabled} onChange={(current) => onChange({ ...value, current })} />
        <OptionCheckbox id='presentation-style-editors-price-productpricestyleeditor-optioncheckbox-4-azvrcy' label="قبل الخصم" checked={value.beforeDiscount} disabled={disabled} onChange={(beforeDiscount) => onChange({ ...value, beforeDiscount })} />
        <OptionCheckbox id='presentation-style-editors-price-productpricestyleeditor-optioncheckbox-5-4fnqnl' label="يحتاج سيارة" checked={value.needsCar} disabled={disabled} onChange={(needsCar) => onChange({ ...value, needsCar })} />
      </div>
    </ProductStyleCard>
  );
}
