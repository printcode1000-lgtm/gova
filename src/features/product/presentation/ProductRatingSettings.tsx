"use client";

import type { ProductRatingData } from "@/features/product";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "product.product-rating-settings.div-8KwpKB", id: "product.product-rating-settings.div" })} id={id} className="grid gap-4 sm:grid-cols-2">
      <label {...uiAttributes({ uid: "product.product-rating-settings.label-9NsulS", id: "product.product-rating-settings.label" })} className="flex items-center gap-3 rounded-xl border p-3">
        <input {...uiAttributes({ uid: "product.product-rating-settings.input-Bf8hq7", id: "product.product-rating-settings.input" })}
          type="checkbox"
          checked={rating.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span {...uiAttributes({ uid: "product.product-rating-settings.span-OdCGZ3", id: "product.product-rating-settings.span" })}>استقبال التقييمات</span>
      </label>
      <label {...uiAttributes({ uid: "product.product-rating-settings.label.2-898CrM", id: "product.product-rating-settings.label.2" })} className="flex items-center gap-3 rounded-xl border p-3">
        <input {...uiAttributes({ uid: "product.product-rating-settings.input.2-j9HVR4", id: "product.product-rating-settings.input.2" })}
          type="checkbox"
          checked={rating.targetEnabled}
          onChange={(event) => set({ targetEnabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span {...uiAttributes({ uid: "product.product-rating-settings.span.2-6ZQPeU", id: "product.product-rating-settings.span.2" })}>تقييم المنتج أو الخدمة</span>
      </label>
      <label {...uiAttributes({ uid: "product.product-rating-settings.label.3-4D9lY7", id: "product.product-rating-settings.label.3" })} className="space-y-2 sm:col-span-2">
        <span {...uiAttributes({ uid: "product.product-rating-settings.span.3-8tl5Rb", id: "product.product-rating-settings.span.3" })} className="text-sm font-medium">وضع التقييم</span>
        <select {...uiAttributes({ uid: "product.product-rating-settings.select-WpvQ8T", id: "product.product-rating-settings.select" })}
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
          <option {...uiAttributes({ uid: "product.product-rating-settings.option-0y1K1P", id: "product.product-rating-settings.option" })} value="">استخدام إعداد Style</option>
          <option {...uiAttributes({ uid: "product.product-rating-settings.option.2-Fnw17l", id: "product.product-rating-settings.option.2" })} value="stars-comments">نجوم + تعليقات</option>
          <option {...uiAttributes({ uid: "product.product-rating-settings.option.3-JVu7VO", id: "product.product-rating-settings.option.3" })} value="stars">نجوم فقط</option>
        </select>
      </label>
    </div>
  );
}
