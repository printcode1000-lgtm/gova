"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCalendarDays,
  faCircleCheck,
  faCircleXmark,
  faCoins,
  faGift,
  faRotateLeft,
  faStar,
  faTruck,
} from "@fortawesome/free-solid-svg-icons";
import type { ProfileFulfillmentSettings } from "@/features/profile/entities/profile-fulfillment-settings.entity";
import type { StoreDetailsData } from "@/features/profile/entities/store-details.entity";
import { useProfileCarrierLabels } from "@/features/profile/hooks/use-profile-carrier-labels";

interface ProfilePreviewInformationProps {
  locale: "ar" | "en";
  details: StoreDetailsData;
  fulfillment: ProfileFulfillmentSettings;
}

export function ProfilePreviewMetrics({
  locale,
  details,
  fulfillment,
}: ProfilePreviewInformationProps) {
  const ar = locale === "ar";
  const openDays = details.workingHours.days.filter(
    (day) => day.open && day.periods.length > 0,
  ).length;
  const shippingLabel =
    fulfillment.shippingPricing.mode === "free"
      ? ar
        ? "شحن مجاني"
        : "Free shipping"
      : fulfillment.shippingPricing.mode === "flat"
        ? ar
          ? "سعر ثابت"
          : "Flat rate"
        : ar
          ? "حسب الموقع"
          : "By location";
  const metrics: Array<{
    icon: IconDefinition;
    title: string;
    value: string;
    tone: string;
  }> = [
    {
      icon: faCalendarDays,
      title: ar ? "مواعيد العمل" : "Working hours",
      value: openDays
        ? `${openDays} ${ar ? "أيام متاحة" : "open days"}`
        : ar
          ? "غير محددة"
          : "Not specified",
      tone: "bg-primary/10 text-primary",
    },
    {
      icon: faTruck,
      title: ar ? "الشحن" : "Shipping",
      value: shippingLabel,
      tone: "bg-secondary/10 text-secondary",
    },
    {
      icon: faRotateLeft,
      title: ar ? "الإرجاع" : "Returns",
      value: fulfillment.returns.enabled
        ? `${fulfillment.returns.returnWindowDays} ${ar ? "يومًا" : "days"}`
        : ar
          ? "غير متاح"
          : "Unavailable",
      tone: fulfillment.returns.enabled
        ? "bg-success/10 text-success"
        : "bg-error/10 text-error",
    },
    {
      icon: faStar,
      title: ar ? "التقييمات" : "Reviews",
      value: details.ratingSettings.enabled
        ? ar
          ? "مفعلة"
          : "Enabled"
        : ar
          ? "غير مفعلة"
          : "Disabled",
      tone: "bg-tertiary/10 text-tertiary",
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.title}
          className="rounded-2xl border border-outline-variant/70 bg-surface p-4 shadow-sm"
        >
          <div
            className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${metric.tone}`}
          >
            <FontAwesomeIcon icon={metric.icon} />
          </div>
          <p className="text-xs font-semibold text-on-surface-variant">
            {metric.title}
          </p>
          <p className="mt-1 font-bold text-on-surface">{metric.value}</p>
        </article>
      ))}
    </div>
  );
}

export function ProfileFulfillmentPreviewCard({
  locale,
  fulfillment,
}: Pick<ProfilePreviewInformationProps, "locale" | "fulfillment">) {
  const ar = locale === "ar";
  const carriers = useProfileCarrierLabels(fulfillment.carrierUids);
  const money = (value: number) =>
    `${Number(value || 0).toLocaleString(ar ? "ar-EG" : "en-US")} ${ar ? "ج.م" : "EGP"}`;
  const payer =
    fulfillment.returns.returnShippingPayer === "buyer"
      ? ar
        ? "المشتري"
        : "Buyer"
      : fulfillment.returns.returnShippingPayer === "seller"
        ? ar
          ? "البائع"
          : "Seller"
        : ar
          ? "حسب الحالة"
          : "Case by case";
  const pricing = fulfillment.shippingPricing;
  const rows = [
    {
      icon: faCoins,
      label: ar ? "طريقة التسعير" : "Pricing method",
      value:
        pricing.mode === "free"
          ? ar
            ? "مجاني"
            : "Free"
          : pricing.mode === "flat"
            ? ar
              ? "سعر ثابت"
              : "Flat rate"
            : ar
              ? "حسب الموقع"
              : "By location",
    },
    ...(pricing.mode === "flat"
      ? [
          {
            icon: faTruck,
            label: ar ? "تكلفة الشحن" : "Shipping fee",
            value: money(pricing.flatRate),
          },
        ]
      : []),
    ...(pricing.mode === "by_location"
      ? [
          {
            icon: faTruck,
            label: ar ? "التسعير حسب المكان" : "Location pricing",
            value: ar
              ? "تُحدد القيمة بعد الطلب وتحتاج موافقة المشتري"
              : "Quoted after ordering and requires buyer approval",
          },
        ]
      : []),
    ...(pricing.specialVehicleFee > 0
      ? [
          {
            icon: faTruck,
            label: ar ? "رسوم المركبة الخاصة" : "Special vehicle fee",
            value: money(pricing.specialVehicleFee),
          },
        ]
      : []),
    ...(pricing.freeShippingThreshold > 0
      ? [
          {
            icon: faGift,
            label: ar ? "الشحن المجاني يبدأ من" : "Free shipping from",
            value: money(pricing.freeShippingThreshold),
          },
        ]
      : []),
  ];

  return (
    <section className="h-full rounded-3xl border border-outline-variant/70 bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-xl text-secondary">
          <FontAwesomeIcon icon={faTruck} />
        </span>
        <div>
          <h2 className="text-lg font-bold">
            {ar ? "الشحن والإرجاع" : "Shipping & returns"}
          </h2>
          <p className="text-xs text-on-surface-variant">
            {ar
              ? "تفاصيل واضحة قبل إتمام الطلب"
              : "Clear details before ordering"}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl bg-surface-container-low p-3"
          >
            <p className="flex items-center gap-2 text-xs text-on-surface-variant">
              <FontAwesomeIcon icon={row.icon} className="text-secondary" />
              {row.label}
            </p>
            <p className="mt-1 font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-outline-variant/60 p-4">
        <div className="flex items-center gap-2 font-bold">
          <FontAwesomeIcon
            icon={fulfillment.returns.enabled ? faCircleCheck : faCircleXmark}
            className={
              fulfillment.returns.enabled ? "text-success" : "text-error"
            }
          />
          {fulfillment.returns.enabled
            ? ar
              ? `الإرجاع متاح خلال ${fulfillment.returns.returnWindowDays} يومًا`
              : `Returns within ${fulfillment.returns.returnWindowDays} days`
            : ar
              ? "الإرجاع غير متاح"
              : "Returns unavailable"}
        </div>
        {fulfillment.returns.enabled ? (
          <>
            <p className="mt-2 text-sm text-on-surface-variant">
              {ar ? "تكلفة شحن الإرجاع:" : "Return shipping paid by:"}{" "}
              <strong className="text-on-surface">{payer}</strong>
            </p>
            {fulfillment.returns.policyText ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                {fulfillment.returns.policyText}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {carriers.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-on-surface-variant">
            {ar ? "شركات التوصيل المتاحة" : "Available carriers"}
          </p>
          <div className="flex flex-wrap gap-2">
            {carriers.map((carrier) => (
              <span
                key={carrier.uid}
                className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {carrier.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {pricing.notes ? (
        <p className="mt-4 rounded-xl bg-tertiary/10 p-3 text-sm leading-6 text-on-surface-variant">
          {pricing.notes}
        </p>
      ) : null}
    </section>
  );
}
