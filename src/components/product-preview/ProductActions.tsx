"use client";

import { ProductComponentFrame } from "./shared";
import type { ProductPreviewComponentProps } from "./types";

export function ProductActions({
  cart,
  favorite,
  contact,
}: ProductPreviewComponentProps & {
  cart: boolean;
  favorite: boolean;
  contact: boolean;
}) {
  return (
    <ProductComponentFrame title="الطلب">
      <div className="flex flex-wrap gap-2">
        {cart ? (
          <button
            type="button"
            className="rounded-xl bg-primary px-4 py-2 text-on-primary"
          >
            إضافة إلى السلة
          </button>
        ) : null}
        {favorite ? (
          <button type="button" className="rounded-xl border px-4 py-2">
            إضافة إلى المفضلة
          </button>
        ) : null}
        {contact ? (
          <button type="button" className="rounded-xl border px-4 py-2">
            تواصل مع مقدم الخدمة
          </button>
        ) : null}
      </div>
    </ProductComponentFrame>
  );
}
