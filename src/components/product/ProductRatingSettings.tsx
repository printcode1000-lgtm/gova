"use client";

import type { ProductRatingData } from "@/features/product/entities/product.entity";

export function ProductRatingSettings({
  rating,
  onChange,
}: {
  rating: ProductRatingData;
  onChange: (rating: ProductRatingData) => void;
}) {
  const set = (next: Partial<ProductRatingData>) =>
    onChange({ ...rating, ...next });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex items-center gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={rating.enabled}
          onChange={(event) => set({ enabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span>استقبال التقييمات</span>
      </label>
      <label className="flex items-center gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={rating.targetEnabled}
          onChange={(event) => set({ targetEnabled: event.target.checked })}
          className="h-5 w-5 accent-primary"
        />
        <span>تقييم المنتج أو الخدمة</span>
      </label>
      <label className="space-y-2 sm:col-span-2">
        <span className="text-sm font-medium">وضع التقييم</span>
        <select
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
          className="gova-control gova-field-surface w-full border border-input px-3"
        >
          <option value="">استخدام إعداد Style</option>
          <option value="stars-comments">نجوم + تعليقات</option>
          <option value="stars">نجوم فقط</option>
        </select>
      </label>
    </div>
  );
}
