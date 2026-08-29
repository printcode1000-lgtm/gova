"use client";

import * as React from "react";
import {
  Copy,
  Gift,
  PackagePlus,
  Percent,
  Plus,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { ProfileSectionStatus } from "@/features/profile/ui";
import {
  createEmptySellerDiscount,
  formatMinorCurrency,
  type SaveSellerDiscountInput,
  type SellerDiscountRule,
  type SellerDiscountType,
  type SellerDiscountValueType,
} from "../domain/seller-discount.entity";
import { useSellerDiscounts } from "./hooks/use-seller-discounts";

import { SellerDiscountsController, TYPE_LABELS_AR, TYPE_LABELS_EN, DISCOUNT_TYPES, isDirty, normalizeForSave } from "./discount-editor/SellerDiscountsManager.discount-form";
import { DiscountEditor } from "./discount-editor/SellerDiscountsManager.form-controls";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.9-R5Wt7F", id: "seller-discounts.seller-discounts-manager.div.9" })} id="seller-discounts.seller-discounts-manager.div" className="space-y-4">
      <section {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.section.2-yyRc5C", id: "seller-discounts.seller-discounts-manager.section.2" })} id="seller-discounts.seller-discounts-manager.section" className="rounded-2xl border border-outline-variant bg-surface-container-low/40 p-3">
        <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.10-d7j50H", id: "seller-discounts.seller-discounts-manager.div.10" })} id="seller-discounts.seller-discounts-manager.div.2" className="flex flex-wrap items-center justify-between gap-3">
          <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.11-HGKM1W", id: "seller-discounts.seller-discounts-manager.div.11" })} id="seller-discounts.seller-discounts-manager.div.3">
            <h3 {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.h3.2-4a0DDi", id: "seller-discounts.seller-discounts-manager.h3.2" })} id="seller-discounts.seller-discounts-manager.h3" className="text-sm font-bold text-on-surface">
              {ar ? "إدارة خصومات المتجر" : "Manage store offers"}
            </h3>
            <p {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.p.2-WTz3Kr", id: "seller-discounts.seller-discounts-manager.p.2" })} id="seller-discounts.seller-discounts-manager.p" className="mt-1 text-xs text-on-surface-variant">
              {ar
                ? "كل عرض هنا قابل للحساب في السلة: منتجات، باقات، كوبونات، شحن، هدايا، وإجمالي مشتريات."
                : "Each offer is a calculable rule for products, bundles, coupons, shipping, gifts, and order totals."}
            </p>
          </div>
          <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.12-5Sjw1U", id: "seller-discounts.seller-discounts-manager.div.12" })} id="seller-discounts.seller-discounts-manager.div.4" className="grid grid-flow-col grid-rows-2 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DISCOUNT_TYPES.map((type) => (
              <button
                key={type} {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.button-Z30KIg", id: "seller-discounts.seller-discounts-manager.button" })}
                type="button"
                onClick={() => addDiscount(type)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-outline-variant bg-surface px-2.5 text-xs font-semibold text-on-surface shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                {labels[type]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.13-14nI0M", id: "seller-discounts.seller-discounts-manager.div.13" })} id="seller-discounts.seller-discounts-manager.div.5" className="rounded-xl border border-outline-variant p-4 text-sm text-on-surface-variant">
          {ar ? "جاري تحميل الخصومات..." : "Loading discounts..."}
        </div>
      ) : null}
      {error ? (
        <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.14-c3H5kA", id: "seller-discounts.seller-discounts-manager.div.14" })} id="seller-discounts.seller-discounts-manager.div.6" className="rounded-xl border border-error/30 bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      ) : null}
      {items.length === 0 && !isLoading ? (
        <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.15-1AS1eQ", id: "seller-discounts.seller-discounts-manager.div.15" })} id="seller-discounts.seller-discounts-manager.div.7" className="rounded-xl border border-dashed border-outline-variant p-5 text-center text-sm text-on-surface-variant">
          {ar
            ? "لا توجد خصومات بعد. أضف أول عرض من الأزرار بالأعلى."
            : "No offers yet. Add the first one above."}
        </div>
      ) : null}

      <div {...uiAttributes({ uid: "seller-discounts.seller-discounts-manager.div.16-C8kHAS", id: "seller-discounts.seller-discounts-manager.div.16" })} id="seller-discounts.seller-discounts-manager.div.8" className="grid gap-3">
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
    </div>
  );
});
