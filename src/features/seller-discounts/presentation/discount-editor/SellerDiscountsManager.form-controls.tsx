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
} from "../../domain/seller-discount.entity";
import { useSellerDiscounts } from "../hooks/use-seller-discounts";

import {
  MinorCurrencyInput,
  NumberInput,
  Toggle,
} from "./SellerDiscountsManager.section-03";

export function DiscountEditor({ id,
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
} & { id?: string }) {
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
    <article id={id} className="rounded-2xl border border-outline-variant bg-surface p-3 shadow-sm">
      <div id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-div-2-lmmbzr" className="flex flex-wrap items-start justify-between gap-3">
        <div id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-div-3-fkktmt" className="flex min-w-0 items-center gap-3">
          <span id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-text-4-8vpzwe" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-div-5-09ihtz">
            <h4 id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-heading-6-lavugs" className="text-sm font-bold text-on-surface">{typeLabel}</h4>
            <p id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-text-7-uuip2n" className="text-xs text-on-surface-variant">
              {discount.title ||
                (ar ? "عرض جديد يحتاج عنوانًا وشروطًا" : "New offer needs a title and rules")}
            </p>
          </div>
        </div>
        <div id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-div-8-fxbikf" className="flex items-center gap-2">
          <select id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-select-9-pikffr"
            value={discount.status}
            onChange={(event) =>
              set("status", event.target.value as SellerDiscountRule["status"])
            }
            className="h-9 rounded-lg border border-outline-variant bg-surface px-2 text-xs"
          >
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-10-bvsrxc" value="draft">{ar ? "مسودة" : "Draft"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-11-vz8psq" value="active">{ar ? "نشط" : "Active"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-12-s9izrr" value="paused">{ar ? "متوقف" : "Paused"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-13-3qy8yo" value="expired">{ar ? "منتهي" : "Expired"}</option>
          </select>
          <button id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-button-14-uqyhls"
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-error/30 text-error"
            aria-label={ar ? "إزالة الخصم" : "Delete discount"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-div-15-7daduj" className="mt-4 grid gap-3 md:grid-cols-2">
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-51f293" label={ar ? "عنوان العرض" : "Title"} description={ar ? "اسم واضح وقصير يراه العميل." : "A clear, short name customers will see."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-ff5588"
            value={discount.title}
            onChange={(event) => set("title", event.target.value)}
            maxLength={90}
            placeholder={ar ? "مثال: خصم نهاية الأسبوع" : "Example: Weekend discount"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-509c98" label={ar ? "الأولوية" : "Priority"} description={ar ? "العرض ذو الرقم الأعلى يُفحص أولًا." : "Higher numbers are evaluated first."}>
          <NumberInput
            value={discount.priority}
            onChange={(value) => set("priority", value)}
            placeholder={ar ? "مثال: 100" : "Example: 100"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-73573e" label={ar ? "نوع القيمة" : "Value type"} description={ar ? "حدد كيف تُحسب فائدة العرض." : "Choose how the offer benefit is calculated."}>
          <select id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-select-16-uafsia"
            value={discount.valueType}
            onChange={(event) =>
              set("valueType", event.target.value as SellerDiscountValueType)
            }
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
          >
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-17-ypblro" value="percentage">{ar ? "نسبة مئوية" : "Percentage"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-18-6iu1gz" value="fixed_amount">{ar ? "مبلغ ثابت" : "Fixed amount"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-19-kjd48s" value="fixed_bundle_price">{ar ? "سعر باقة ثابت" : "Bundle price"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-20-pkbr0z" value="free_shipping">{ar ? "شحن مجاني" : "Free shipping"}</option>
            <option id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-option-21-if2ynr" value="free_gift">{ar ? "هدية مجانية" : "Free gift"}</option>
          </select>
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-3c45eb"
          description={ar ? "أدخل النسبة أو المبلغ بالجنيه حسب النوع المختار." : "Enter the percentage or EGP amount for the selected type."}
          label={
            discount.valueType === "percentage"
              ? ar
                ? "النسبة %"
                : "Percent"
              : ar
                ? "القيمة بالجنيهات"
                : "Value in EGP"
          }
        >
          {discount.valueType === "percentage" ? (
            <NumberInput value={discount.value} onChange={(value) => set("value", value)} placeholder={ar ? "مثال: 10" : "Example: 10"} />
          ) : (
            <MinorCurrencyInput value={discount.value} onChange={(value) => set("value", value)} placeholder={ar ? "مثال: 50.00" : "Example: 50.00"} />
          )}
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-f70f99" label={ar ? "حد أدنى للمشتريات بالجنيهات" : "Minimum purchases in EGP"} description={ar ? "أقل إجمالي مشتريات مطلوب لتطبيق العرض؛ اتركه فارغًا لعدم التقييد." : "Minimum cart subtotal required; leave empty for no minimum."}>
          <MinorCurrencyInput
            value={discount.conditions.minSubtotalMinor}
            onChange={(value) => setCondition("minSubtotalMinor", value)}
            placeholder={ar ? "مثال: 250.00" : "Example: 250.00"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-6f14b5" label={ar ? "حد أقصى للخصم بالجنيهات" : "Maximum discount in EGP"} description={ar ? "سقف قيمة الخصم؛ اتركه فارغًا لعدم وضع سقف." : "Discount ceiling; leave empty for no cap."}>
          <MinorCurrencyInput
            value={discount.maxDiscountMinor}
            onChange={(value) => set("maxDiscountMinor", value)}
            placeholder={ar ? "مثال: 100.00" : "Example: 100.00"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-857b71" label={ar ? "حد أدنى للكمية" : "Minimum quantity"} description={ar ? "عدد القطع اللازم حتى يصبح العرض مؤهلًا." : "Number of items required before the offer qualifies."}>
          <NumberInput
            value={discount.conditions.minQuantity}
            onChange={(value) => setCondition("minQuantity", value)}
            placeholder={ar ? "مثال: 2" : "Example: 2"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-3c1198" label={ar ? "كمية الشراء لخصم الكمية" : "Buy quantity"} description={ar ? "عدد القطع التي يبدأ عندها خصم الكمية." : "Item count at which the quantity discount starts."}>
          <NumberInput
            value={discount.conditions.buyQuantity}
            onChange={(value) => setCondition("buyQuantity", value)}
            placeholder={ar ? "مثال: 3" : "Example: 3"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-0701c2" label={ar ? "كود الكوبون" : "Coupon code"} description={ar ? "الكود الذي يدخله العميل للاستفادة من العرض." : "Code customers enter to redeem the offer."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-5df686"
            value={discount.couponCode}
            onChange={(event) => set("couponCode", event.target.value)}
            placeholder={ar ? "مثال: WELCOME10" : "Example: WELCOME10"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-774e6b" label={ar ? "منتج الهدية" : "Gift product ID"} description={ar ? "معرّف المنتج الذي سيُضاف مجانًا." : "ID of the product added as a free gift."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-033d55"
            value={discount.scope.giftProductId}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                scope: { ...current.scope, giftProductId: event.target.value.trim() },
              }))
            }
            placeholder={ar ? "أدخل معرّف منتج الهدية" : "Enter gift product ID"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-c477f2" label={ar ? "منتجات محددة" : "Product IDs"} description={ar ? "معرّفات المنتجات المشمولة، مفصولة بفواصل." : "Included product IDs, separated by commas."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-0c629e"
            value={discount.scope.productIds.join(", ")}
            onChange={(event) => setScopeText("productIds", event.target.value)}
            placeholder={ar ? "مثال: product-1, product-2" : "Example: product-1, product-2"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-8c0b6d" label={ar ? "تصنيفات محددة" : "Category IDs"} description={ar ? "معرّفات التصنيفات المشمولة، مفصولة بفواصل." : "Included category IDs, separated by commas."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-2aeeac"
            value={discount.scope.categoryIds.join(", ")}
            onChange={(event) => setScopeText("categoryIds", event.target.value)}
            placeholder={ar ? "مثال: category-1, category-2" : "Example: category-1, category-2"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-7d3b0e" label={ar ? "منتجات الباقة" : "Bundle product IDs"} description={ar ? "معرّفات المنتجات التي يجب شراؤها معًا." : "Product IDs that must be purchased together."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-9d25b8"
            value={discount.scope.bundleProductIds.join(", ")}
            onChange={(event) =>
              setScopeText("bundleProductIds", event.target.value)
            }
            placeholder={ar ? "مثال: product-1, product-2" : "Example: product-1, product-2"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-96539e" label={ar ? "منتجات مستثناة" : "Excluded product IDs"} description={ar ? "منتجات لا ينطبق عليها العرض، مفصولة بفواصل." : "Products excluded from the offer, separated by commas."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-23e4aa"
            value={discount.scope.excludedProductIds.join(", ")}
            onChange={(event) =>
              setScopeText("excludedProductIds", event.target.value)
            }
            placeholder={ar ? "مثال: product-3, product-4" : "Example: product-3, product-4"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-4939a9" label={ar ? "بداية العرض" : "Starts at"} description={ar ? "التاريخ والوقت اللذان يبدأ عندهما العرض." : "Date and time when the offer begins."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-9934a3"
            type="datetime-local"
            value={discount.startsAt.slice(0, 16)}
            onChange={(event) => set("startsAt", event.target.value)}
            placeholder={ar ? "اختر تاريخ ووقت البداية" : "Choose start date and time"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-9dd048" label={ar ? "نهاية العرض" : "Ends at"} description={ar ? "التاريخ والوقت اللذان يتوقف عندهما العرض." : "Date and time when the offer ends."}>
          <Input id="seller-discounts-manager-form-controls-discount-editor-input-bc615e"
            type="datetime-local"
            value={discount.endsAt.slice(0, 16)}
            onChange={(event) => set("endsAt", event.target.value)}
            placeholder={ar ? "اختر تاريخ ووقت النهاية" : "Choose end date and time"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-aefb0c" label={ar ? "حد الاستخدام الكلي" : "Total usage limit"} description={ar ? "أقصى عدد مرات لاستخدام العرض من جميع العملاء." : "Maximum redemptions across all customers."}>
          <NumberInput
            value={discount.usageLimits.total}
            onChange={(value) => setUsage("total", value)}
            placeholder={ar ? "مثال: 100" : "Example: 100"}
          />
        </Field>
        <Field id="seller-discounts-manager-form-controls-discount-editor-field-027a74" label={ar ? "حد الاستخدام لكل مشتري" : "Per-buyer limit"} description={ar ? "أقصى عدد مرات مسموح بها لكل عميل." : "Maximum redemptions allowed for each customer."}>
          <NumberInput
            value={discount.usageLimits.perBuyer}
            onChange={(value) => setUsage("perBuyer", value)}
            placeholder={ar ? "مثال: 1" : "Example: 1"}
          />
        </Field>
      </div>

      <div id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-div-22-j0sfdr" className="mt-4 flex flex-wrap gap-2">
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

      <p id="seller-discounts-presentation-discount-editor-sellerdiscountsmanager-form-controls-text-23-7kovrm" className="mt-3 text-xs text-on-surface-variant">
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

export function Field({ id,
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
} & { id?: string }) {
  return (
    <label id={id} className="space-y-1.5 text-xs font-semibold text-on-surface">
      <span id={id ? `${id}-text-25-m2nrhl` : undefined} className="block">{label}</span>
      <span id={id ? `${id}-text-26-yj1gif` : undefined} className="block font-normal leading-5 text-on-surface-variant">{description}</span>
      {children}
    </label>
  );
}
