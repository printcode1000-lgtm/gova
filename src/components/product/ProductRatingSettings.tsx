"use client";

import type { ProductFieldValues } from "@/features/product/entities/product.entity";

export function ProductRatingSettings({
  fields,
  onChange,
}: {
  fields: ProductFieldValues;
  onChange: (fields: ProductFieldValues) => void;
}) {
  const set = (key: string, value: string) =>
    onChange({ ...fields, [key]: value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex items-center gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={fields["rating.enabled"] !== "false"}
          onChange={(event) =>
            set("rating.enabled", String(event.target.checked))
          }
          className="h-5 w-5 accent-primary"
        />
        <span>استقبال التقييمات</span>
      </label>
      <label className="flex items-center gap-3 rounded-xl border p-3">
        <input
          type="checkbox"
          checked={fields["rating.targetEnabled"] !== "false"}
          onChange={(event) =>
            set("rating.targetEnabled", String(event.target.checked))
          }
          className="h-5 w-5 accent-primary"
        />
        <span>تقييم المنتج أو الخدمة</span>
      </label>
      <label className="space-y-2 sm:col-span-2">
        <span className="text-sm font-medium">وضع التقييم</span>
        <select
          value={fields["rating.mode"] || ""}
          onChange={(event) => set("rating.mode", event.target.value)}
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
