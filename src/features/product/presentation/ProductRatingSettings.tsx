"use client";

import type { ProductRatingData } from "@/features/product";
import { createOpaqueUiInstanceId, uiAttributes, type UiInstanceId } from "@asol/ui-registry-core";

export function ProductRatingSettings({ id,
  rating,
  onChange,
  instance,
}: {
  rating: ProductRatingData;
  onChange: (rating: ProductRatingData) => void;
  instance?: UiInstanceId;
} & { id?: string }) {
  const set = (next: Partial<ProductRatingData>) =>
    onChange({ ...rating, ...next });

  const resolvedInstance = id ? createOpaqueUiInstanceId("rating-settings", id) : instance;

  return (
    <div {...uiAttributes({ uid: "product.product-rating-settings.div-8KwpKB", id: "product.product-rating-settings.div", instance: resolvedInstance })} id={id} className="grid gap-4 sm:grid-cols-2">
      <label {...uiAttributes({ uid: "product.product-rating-settings.label-9NsulS", id: "product.product-rating-settings.label", instance: resolvedInstance })} className="flex items-center gap-3 rounded-xl border p-3">
        <input {...uiAttributes({ uid: "product.product-rating-settings.input-Bf8hq7", id: "product.product-rating-settings.input", instance: resolvedInstance })}
          type="checkbox"
          checked={rating.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span {...uiAttributes({ uid: "product.product-rating-settings.span-OdCGZ3", id: "product.product-rating-settings.span", instance: resolvedInstance })}>استقبال التقييمات</span>
      </label>
      <label {...uiAttributes({ uid: "product.product-rating-settings.label.2-898CrM", id: "product.product-rating-settings.label.2", instance: resolvedInstance })} className="flex items-center gap-3 rounded-xl border p-3">
        <input {...uiAttributes({ uid: "product.product-rating-settings.input.2-j9HVR4", id: "product.product-rating-settings.input.2", instance: resolvedInstance })}
          type="checkbox"
          checked={rating.targetEnabled}
          onChange={(event) => set({ targetEnabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span {...uiAttributes({ uid: "product.product-rating-settings.span.2-6ZQPeU", id: "product.product-rating-settings.span.2", instance: resolvedInstance })}>تقييم المنتج أو الخدمة</span>
      </label>
      <label {...uiAttributes({ uid: "product.product-rating-settings.label.3-4D9lY7", id: "product.product-rating-settings.label.3", instance: resolvedInstance })} className="space-y-2 sm:col-span-2">
        <span {...uiAttributes({ uid: "product.product-rating-settings.span.3-8tl5Rb", id: "product.product-rating-settings.span.3", instance: resolvedInstance })} className="text-sm font-medium">وضع التقييم</span>
        <select {...uiAttributes({ uid: "product.product-rating-settings.select-WpvQ8T", id: "product.product-rating-settings.select", instance: resolvedInstance })}
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
          <option {...uiAttributes({ uid: "product.product-rating-settings.option-0y1K1P", id: "product.product-rating-settings.option", instance: resolvedInstance })} value="">استخدام إعداد Style</option>
          <option {...uiAttributes({ uid: "product.product-rating-settings.option.2-Fnw17l", id: "product.product-rating-settings.option.2", instance: resolvedInstance })} value="stars-comments">نجوم + تعليقات</option>
          <option {...uiAttributes({ uid: "product.product-rating-settings.option.3-JVu7VO", id: "product.product-rating-settings.option.3", instance: resolvedInstance })} value="stars">نجوم فقط</option>
        </select>
      </label>
    </div>
  );
}
