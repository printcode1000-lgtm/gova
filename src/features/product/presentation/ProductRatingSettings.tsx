"use client";

import type { ProductRatingData } from "@/features/product";

export function ProductRatingSettings({ id,
  rating,
  onChange,
}: {
  rating: ProductRatingData;
  onChange: (rating: ProductRatingData) => void;
} & { id?: string }) {
  const set = (next: Partial<ProductRatingData>) =>
    onChange({ ...rating, ...next });


  return (
    <div id={id} className="grid gap-4 sm:grid-cols-2">
      <label id="features-product-presentation-productratingsettings-label-2-65i0ov" className="flex items-center gap-3 rounded-xl border p-3">
        <input id="features-product-presentation-productratingsettings-input-3-ko3x6o"
          type="checkbox"
          checked={rating.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span id="features-product-presentation-productratingsettings-text-4-dm7irm">استقبال التقييمات</span>
      </label>
      <label id="features-product-presentation-productratingsettings-label-5-6umspg" className="flex items-center gap-3 rounded-xl border p-3">
        <input id="features-product-presentation-productratingsettings-input-6-zqin0t"
          type="checkbox"
          checked={rating.targetEnabled}
          onChange={(event) => set({ targetEnabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span id="features-product-presentation-productratingsettings-text-7-4jrfp7">تقييم المنتج أو الخدمة</span>
      </label>
      <label id="features-product-presentation-productratingsettings-label-8-3ohivr" className="space-y-2 sm:col-span-2">
        <span id="features-product-presentation-productratingsettings-text-9-5zj5va" className="text-sm font-medium">وضع التقييم</span>
        <select id="features-product-presentation-productratingsettings-select-10-sy4t8a"
          value={rating.mode}
          onChange={(event) =>
            set({
              mode:
                event.target.value === "stars" ||
                event.target.value === "stars-comments"
                  ? event.target.value
                  : "",
            })
          }
          className="asol-control asol-field-surface w-full border border-input px-3"
        >
          <option id="features-product-presentation-productratingsettings-option-11-cotrqo" value="">استخدام إعداد Style</option>
          <option id="features-product-presentation-productratingsettings-option-12-ch1up4" value="stars-comments">نجوم + تعليقات</option>
          <option id="features-product-presentation-productratingsettings-option-13-77bue4" value="stars">نجوم فقط</option>
        </select>
      </label>
    </div>
  );
}
