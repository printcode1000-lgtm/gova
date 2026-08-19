"use client";

import * as React from "react";
import {
  Copy,
  Gift,
  PackagePlus,
  Percent,
  Plus,
  Save,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileSectionStatus } from "@/components/profile/profile-save-controller";
import {
  createEmptySellerDiscount,
  formatMinorCurrency,
  type SaveSellerDiscountInput,
  type SellerDiscountRule,
  type SellerDiscountType,
  type SellerDiscountValueType,
} from "../entities/seller-discount.entity";
import { useSellerDiscounts } from "../hooks/use-seller-discounts";

import { SellerDiscountsController, TYPE_LABELS_AR, TYPE_LABELS_EN, DISCOUNT_TYPES, isDirty, normalizeForSave } from "./discount-editor/SellerDiscountsManager.discount-form";
import { DiscountEditor } from "./discount-editor/SellerDiscountsManager.form-controls";

export type { SellerDiscountsController } from "./discount-editor/SellerDiscountsManager.discount-form";

export const SellerDiscountsManager = React.forwardRef<
  SellerDiscountsController,
  {
    sellerUid: string;
    locale: "ar" | "en";
    onStatusChange?: (status: ProfileSectionStatus) => void;
  }
>(function SellerDiscountsManager({ sellerUid, locale, onStatusChange }, ref) {
  const ar = locale === "ar";
  const labels = ar ? TYPE_LABELS_AR : TYPE_LABELS_EN;
  const { discounts, isLoading, error, save } = useSellerDiscounts(
    sellerUid,
    true,
  );
  const [items, setItems] = React.useState<SellerDiscountRule[]>([]);
  const [savedItems, setSavedItems] = React.useState<SellerDiscountRule[]>([]);
  const dirty = isDirty(items, savedItems);
  const label = ar ? "العروض والخصومات" : "Offers";

  React.useEffect(() => {
    setItems(discounts);
    setSavedItems(discounts);
  }, [discounts]);

  React.useEffect(() => {
    onStatusChange?.({ isDirty: dirty, isSaving: false, canSave: true, label });
  }, [dirty, label, onStatusChange]);

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty: dirty,
      isSaving: false,
      canSave: true,
      label,
      save: async () => {
        const saved = await save(items.map(normalizeForSave));
        setItems(saved);
        setSavedItems(saved);
        return true;
      },
      getSnapshot: () => items,
      applySaved: (next) => {
        setItems(next);
        setSavedItems(next);
      },
    }),
    [dirty, items, label, save],
  );

  const addDiscount = (type: SellerDiscountType) => {
    setItems((current) => [
      createEmptySellerDiscount(sellerUid, type),
      ...current,
    ]);
  };

  const updateDiscount = (
    id: string,
    updater: (discount: SellerDiscountRule) => SellerDiscountRule,
  ) => {
    setItems((current) =>
      current.map((discount) =>
        discount.id === id ? updater(discount) : discount,
      ),
    );
  };

  const removeDiscount = (id: string) => {
    setItems((current) => current.filter((discount) => discount.id !== id));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-outline-variant bg-surface-container-low/40 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              {ar ? "إدارة خصومات المتجر" : "Manage store offers"}
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              {ar
                ? "كل عرض هنا قابل للحساب في السلة: منتجات، باقات، كوبونات، شحن، هدايا، وإجمالي مشتريات."
                : "Each offer is a calculable rule for products, bundles, coupons, shipping, gifts, and order totals."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DISCOUNT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addDiscount(type)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-2.5 text-xs font-semibold text-on-surface shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                {labels[type]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-outline-variant p-4 text-sm text-on-surface-variant">
          {ar ? "جاري تحميل الخصومات..." : "Loading discounts..."}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      ) : null}
      {items.length === 0 && !isLoading ? (
        <div className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-sm text-on-surface-variant">
          {ar
            ? "لا توجد خصومات بعد. أضف أول عرض من الأزرار بالأعلى."
            : "No offers yet. Add the first one above."}
        </div>
      ) : null}

      <div className="grid gap-3">
        {items.map((discount) => (
          <DiscountEditor
            key={discount.id}
            discount={discount}
            locale={locale}
            typeLabel={labels[discount.type]}
            onRemove={() => removeDiscount(discount.id)}
            onChange={(updater) => updateDiscount(discount.id, updater)}
          />
        ))}
      </div>

      {dirty ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Save className="h-3.5 w-3.5" />
          {ar
            ? "لديك تغييرات غير محفوظة. استخدم زر حفظ الملف بالأعلى."
            : "You have unsaved offer changes. Use the profile save button."}
        </p>
      ) : null}
    </div>
  );
});
