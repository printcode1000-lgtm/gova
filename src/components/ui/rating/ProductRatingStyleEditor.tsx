"use client";

import { RatingSettingsEditor } from "@/components/ui/rating/RatingSettingsEditor";
import { ProductStyleCard } from "@/components/ui/product-style-card";
import type { ProductRatingStyleSettings } from "@/components/ui/product-style-settings";

interface ProductRatingStyleEditorProps {
  value: ProductRatingStyleSettings;
  disabled?: boolean;
  onChange: (value: ProductRatingStyleSettings) => void;
}

export function ProductRatingStyleEditor({
  value,
  disabled = false,
  onChange,
}: ProductRatingStyleEditorProps) {
  return (
    <ProductStyleCard
      title="التقييم"
      visible={value.visible}
      order={value.order}
      disabled={disabled}
      onVisibleChange={(visible) => onChange({ ...value, visible })}
      onOrderChange={(order) => onChange({ ...value, order })}
    >
      <RatingSettingsEditor
        enabled={value.visible}
        mode={value.type}
        disabled={disabled}
        labels={{
          title: "إعدادات التقييم",
          enabled: "إظهار التقييم في المنتج",
          mode: "طريقة التقييم",
          placeholder: "اختر طريقة التقييم",
          stars: "نجوم فقط",
          starsComments: "نجوم وتعليقات",
        }}
        onChange={(next) =>
          onChange({ ...value, visible: next.enabled, type: next.mode })
        }
      />
    </ProductStyleCard>
  );
}
