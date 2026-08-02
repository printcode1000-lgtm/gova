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

export interface SellerDiscountsController extends ProfileSectionStatus {
  save: () => Promise<boolean>;
  getSnapshot: () => SellerDiscountRule[];
  applySaved: (discounts: SellerDiscountRule[]) => void;
}

const TYPE_LABELS_AR: Record<SellerDiscountType, string> = {
  quantity: "خصم الكمية",
  bundle: "خصم الباقات",
  free_shipping: "شحن مجاني",
  coupon: "كوبون خصم",
  free_gift: "هدية مجانية",
  automatic: "خصم تلقائي",
  order_total: "خصم إجمالي المشتريات",
};

const TYPE_LABELS_EN: Record<SellerDiscountType, string> = {
  quantity: "Quantity discount",
  bundle: "Bundle discount",
  free_shipping: "Free shipping",
  coupon: "Coupon",
  free_gift: "Free gift",
  automatic: "Automatic discount",
  order_total: "Order total discount",
};

const DISCOUNT_TYPES: SellerDiscountType[] = [
  "order_total",
  "coupon",
  "free_shipping",
  "quantity",
  "bundle",
  "free_gift",
  "automatic",
];

function isDirty(current: SellerDiscountRule[], saved: SellerDiscountRule[]) {
  return JSON.stringify(current) !== JSON.stringify(saved);
}

function normalizeForSave(discount: SellerDiscountRule): SaveSellerDiscountInput {
  return {
    ...discount,
    title: discount.title.trim(),
    description: discount.description.trim(),
    couponCode: discount.couponCode.trim(),
    value: Math.max(0, Math.floor(discount.value || 0)),
    maxDiscountMinor: Math.max(0, Math.floor(discount.maxDiscountMinor || 0)),
  };
}

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
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-2.5 text-xs font-semibold text-on-surface shadow-sm hover:bg-surface-container"
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

function DiscountEditor({
  discount,
  locale,
  typeLabel,
  onRemove,
  onChange,
}: {
  discount: SellerDiscountRule;
  locale: "ar" | "en";
  typeLabel: string;
  onRemove: () => void;
  onChange: (updater: (discount: SellerDiscountRule) => SellerDiscountRule) => void;
}) {
  const ar = locale === "ar";
  const Icon =
    discount.type === "free_shipping"
      ? Truck
      : discount.type === "coupon"
        ? Ticket
        : discount.type === "free_gift"
          ? Gift
          : discount.type === "bundle"
            ? PackagePlus
            : discount.type === "quantity"
              ? Copy
              : Percent;
  const set = <K extends keyof SellerDiscountRule>(
    key: K,
    value: SellerDiscountRule[K],
  ) => onChange((current) => ({ ...current, [key]: value }));
  const setCondition = (
    key: keyof SellerDiscountRule["conditions"],
    value: number | boolean,
  ) =>
    onChange((current) => ({
      ...current,
      conditions: { ...current.conditions, [key]: value },
    }));
  const setScopeText = (
    key: "productIds" | "categoryIds" | "excludedProductIds" | "bundleProductIds",
    value: string,
  ) =>
    onChange((current) => ({
      ...current,
      scope: {
        ...current.scope,
        [key]: value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    }));
  const setUsage = (
    key: keyof SellerDiscountRule["usageLimits"],
    value: number,
  ) =>
    onChange((current) => ({
      ...current,
      usageLimits: { ...current.usageLimits, [key]: value },
    }));

  return (
    <article className="rounded-2xl border border-outline-variant bg-surface p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-on-surface">{typeLabel}</h4>
            <p className="text-xs text-on-surface-variant">
              {discount.title ||
                (ar ? "عرض جديد يحتاج عنوانًا وشروطًا" : "New offer needs a title and rules")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={discount.status}
            onChange={(event) =>
              set("status", event.target.value as SellerDiscountRule["status"])
            }
            className="h-9 rounded-lg border border-outline-variant bg-surface px-2 text-xs"
          >
            <option value="draft">{ar ? "مسودة" : "Draft"}</option>
            <option value="active">{ar ? "نشط" : "Active"}</option>
            <option value="paused">{ar ? "متوقف" : "Paused"}</option>
            <option value="expired">{ar ? "منتهي" : "Expired"}</option>
          </select>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-error/30 text-error"
            aria-label={ar ? "حذف الخصم" : "Delete discount"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label={ar ? "عنوان العرض" : "Title"}>
          <Input
            value={discount.title}
            onChange={(event) => set("title", event.target.value)}
            maxLength={90}
          />
        </Field>
        <Field label={ar ? "الأولوية" : "Priority"}>
          <NumberInput
            value={discount.priority}
            onChange={(value) => set("priority", value)}
          />
        </Field>
        <Field label={ar ? "نوع القيمة" : "Value type"}>
          <select
            value={discount.valueType}
            onChange={(event) =>
              set("valueType", event.target.value as SellerDiscountValueType)
            }
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
          >
            <option value="percentage">{ar ? "نسبة مئوية" : "Percentage"}</option>
            <option value="fixed_amount">{ar ? "مبلغ ثابت" : "Fixed amount"}</option>
            <option value="fixed_bundle_price">{ar ? "سعر باقة ثابت" : "Bundle price"}</option>
            <option value="free_shipping">{ar ? "شحن مجاني" : "Free shipping"}</option>
            <option value="free_gift">{ar ? "هدية مجانية" : "Free gift"}</option>
          </select>
        </Field>
        <Field
          label={
            discount.valueType === "percentage"
              ? ar
                ? "النسبة %"
                : "Percent"
              : ar
                ? "القيمة بالقروش"
                : "Value in minor units"
          }
        >
          <NumberInput value={discount.value} onChange={(value) => set("value", value)} />
        </Field>
        <Field label={ar ? "حد أدنى للمشتريات بالقروش" : "Min subtotal minor"}>
          <NumberInput
            value={discount.conditions.minSubtotalMinor}
            onChange={(value) => setCondition("minSubtotalMinor", value)}
          />
        </Field>
        <Field label={ar ? "حد أقصى للخصم بالقروش" : "Max discount minor"}>
          <NumberInput
            value={discount.maxDiscountMinor}
            onChange={(value) => set("maxDiscountMinor", value)}
          />
        </Field>
        <Field label={ar ? "حد أدنى للكمية" : "Min quantity"}>
          <NumberInput
            value={discount.conditions.minQuantity}
            onChange={(value) => setCondition("minQuantity", value)}
          />
        </Field>
        <Field label={ar ? "كمية الشراء لخصم الكمية" : "Buy quantity"}>
          <NumberInput
            value={discount.conditions.buyQuantity}
            onChange={(value) => setCondition("buyQuantity", value)}
          />
        </Field>
        <Field label={ar ? "كود الكوبون" : "Coupon code"}>
          <Input
            value={discount.couponCode}
            onChange={(event) => set("couponCode", event.target.value)}
            placeholder="WELCOME10"
          />
        </Field>
        <Field label={ar ? "منتج الهدية" : "Gift product id"}>
          <Input
            value={discount.scope.giftProductId}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                scope: { ...current.scope, giftProductId: event.target.value.trim() },
              }))
            }
          />
        </Field>
        <Field label={ar ? "منتجات محددة، مفصولة بفواصل" : "Product ids"}>
          <Input
            value={discount.scope.productIds.join(", ")}
            onChange={(event) => setScopeText("productIds", event.target.value)}
          />
        </Field>
        <Field label={ar ? "تصنيفات محددة، مفصولة بفواصل" : "Category ids"}>
          <Input
            value={discount.scope.categoryIds.join(", ")}
            onChange={(event) => setScopeText("categoryIds", event.target.value)}
          />
        </Field>
        <Field label={ar ? "منتجات الباقة" : "Bundle product ids"}>
          <Input
            value={discount.scope.bundleProductIds.join(", ")}
            onChange={(event) =>
              setScopeText("bundleProductIds", event.target.value)
            }
          />
        </Field>
        <Field label={ar ? "منتجات مستثناة" : "Excluded product ids"}>
          <Input
            value={discount.scope.excludedProductIds.join(", ")}
            onChange={(event) =>
              setScopeText("excludedProductIds", event.target.value)
            }
          />
        </Field>
        <Field label={ar ? "بداية العرض" : "Starts at"}>
          <Input
            type="datetime-local"
            value={discount.startsAt.slice(0, 16)}
            onChange={(event) => set("startsAt", event.target.value)}
          />
        </Field>
        <Field label={ar ? "نهاية العرض" : "Ends at"}>
          <Input
            type="datetime-local"
            value={discount.endsAt.slice(0, 16)}
            onChange={(event) => set("endsAt", event.target.value)}
          />
        </Field>
        <Field label={ar ? "حد الاستخدام الكلي" : "Total usage limit"}>
          <NumberInput
            value={discount.usageLimits.total}
            onChange={(value) => setUsage("total", value)}
          />
        </Field>
        <Field label={ar ? "حد الاستخدام لكل مشتري" : "Per buyer limit"}>
          <NumberInput
            value={discount.usageLimits.perBuyer}
            onChange={(value) => setUsage("perBuyer", value)}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Toggle
          active={discount.combinable}
          label={ar ? "قابل للدمج" : "Combinable"}
          onClick={() => set("combinable", !discount.combinable)}
        />
        <Toggle
          active={discount.conditions.firstOrderOnly}
          label={ar ? "أول طلب فقط" : "First order"}
          onClick={() =>
            setCondition("firstOrderOnly", !discount.conditions.firstOrderOnly)
          }
        />
        <Toggle
          active={discount.conditions.followersOnly}
          label={ar ? "للمتابعين فقط" : "Followers"}
          onClick={() =>
            setCondition("followersOnly", !discount.conditions.followersOnly)
          }
        />
        <Toggle
          active={discount.conditions.appOnly}
          label={ar ? "مستخدمي التطبيق" : "App users"}
          onClick={() => setCondition("appOnly", !discount.conditions.appOnly)}
        />
      </div>

      <p className="mt-3 text-xs text-on-surface-variant">
        {ar ? "معاينة مختصرة: " : "Preview: "}
        {discount.valueType === "percentage"
          ? `${discount.value}%`
          : discount.valueType === "fixed_amount"
            ? formatMinorCurrency(discount.value, locale)
            : discount.valueType === "fixed_bundle_price"
              ? `${ar ? "سعر الباقة" : "Bundle price"} ${formatMinorCurrency(discount.value, locale)}`
              : discount.valueType === "free_shipping"
                ? ar
                  ? "شحن مجاني"
                  : "Free shipping"
                : ar
                  ? "هدية مجانية"
                  : "Free gift"}
      </p>
    </article>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-xs font-semibold text-on-surface">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input
      type="number"
      min={0}
      value={String(value)}
      onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
    />
  );
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className="h-8 rounded-full px-3 text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
