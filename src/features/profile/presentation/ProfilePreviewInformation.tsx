"use client";

import { formatPlainMoneyMajor } from "@asol/format-core";

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
import type { ProfileFulfillmentSettings } from "@/features/profile/domain/profile-fulfillment-settings.entity";
import type { StoreDetailsData } from "@/features/profile/domain/store-details.entity";
import { useProfileCarrierLabels } from "@/features/profile/presentation/hooks/use-profile-carrier-labels";

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
    <div id='features-profile-presentation-profilepreviewinformation-div-1-qkhmvk' className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.title}
          className="min-w-0 rounded-2xl border border-outline-variant/70 bg-surface p-4 shadow-sm"
        >
          <div
            className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${metric.tone}`}
          >
            <FontAwesomeIcon icon={metric.icon} />
          </div>
          <p className="break-words text-xs font-semibold text-on-surface-variant">
            {metric.title}
          </p>
          <p className="mt-1 break-words font-bold text-on-surface">{metric.value}</p>
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
  const money = (value: number) => formatPlainMoneyMajor(value, locale);
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
    <section id='features-profile-presentation-profilepreviewinformation-section-2-hkkx0h' className="min-w-0 rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm sm:p-6 lg:h-full">
      <div id='features-profile-presentation-profilepreviewinformation-div-3-vonxq9' className="mb-5 flex min-w-0 items-center gap-3">
        <span id='features-profile-presentation-profilepreviewinformation-text-4-k9u1kt' className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-lg text-secondary sm:h-12 sm:w-12 sm:text-xl">
          <FontAwesomeIcon id='features-profile-presentation-profilepreviewinformation-fontawesomeicon-5-1ywfvg' icon={faTruck} />
        </span>
        <div id='features-profile-presentation-profilepreviewinformation-div-6-vdij4s' className="min-w-0 flex-1">
          <h2 id='features-profile-presentation-profilepreviewinformation-heading-7-yti677' className="break-words text-base font-bold sm:text-lg">
            {ar ? "الشحن والإرجاع" : "Shipping & returns"}
          </h2>
          <p id='features-profile-presentation-profilepreviewinformation-text-8-ifyb3w' className="break-words text-xs text-on-surface-variant">
            {ar
              ? "تفاصيل واضحة قبل إتمام الطلب"
              : "Clear details before ordering"}
          </p>
        </div>
      </div>
      <div id='features-profile-presentation-profilepreviewinformation-div-9-cqpxyg' className="grid min-w-0 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="min-w-0 rounded-xl bg-surface-container-low p-3"
          >
            <p className="flex min-w-0 items-start gap-2 text-xs text-on-surface-variant">
              <FontAwesomeIcon icon={row.icon} className="mt-0.5 flex-shrink-0 text-secondary" />
              <span className="min-w-0 break-words">{row.label}</span>
            </p>
            <p className="mt-1 break-words font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
      <div id='features-profile-presentation-profilepreviewinformation-div-10-jxnw0w' className="mt-4 min-w-0 rounded-2xl border border-outline-variant/60 p-4">
        <div id='features-profile-presentation-profilepreviewinformation-div-11-b7fcnn' className="flex min-w-0 items-start gap-2 break-words font-bold">
          <FontAwesomeIcon id='features-profile-presentation-profilepreviewinformation-fontawesomeicon-12-m9rrzx'
            icon={fulfillment.returns.enabled ? faCircleCheck : faCircleXmark}
            className={`mt-1 flex-shrink-0 ${
              fulfillment.returns.enabled ? "text-success" : "text-error"
            }`}
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
            <p id='features-profile-presentation-profilepreviewinformation-text-13-sabytm' className="mt-2 break-words text-sm text-on-surface-variant">
              {ar ? "تكلفة شحن الإرجاع:" : "Return shipping paid by:"}{" "}
              <strong id="features-profile-presentation-profilepreviewinformation-strong-14-vwc6pr" className="text-on-surface">{payer}</strong>
            </p>
            {fulfillment.returns.policyText ? (
              <p id='features-profile-presentation-profilepreviewinformation-text-15-dahnsz' className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">
                {fulfillment.returns.policyText}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {carriers.length > 0 ? (
        <div id='features-profile-presentation-profilepreviewinformation-div-16-cdc3nj' className="mt-4 min-w-0">
          <p id='features-profile-presentation-profilepreviewinformation-text-17-ji6oee' className="mb-2 break-words text-xs font-bold text-on-surface-variant">
            {ar ? "شركات التوصيل المتاحة" : "Available carriers"}
          </p>
          <div id='features-profile-presentation-profilepreviewinformation-div-18-pvvvz9' className="flex min-w-0 flex-wrap gap-2">
            {carriers.map((carrier) => (
              <span
                key={carrier.uid}
                className="min-w-0 max-w-full break-words rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {carrier.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {pricing.notes ? (
        <p id='features-profile-presentation-profilepreviewinformation-text-19-pwlreq' className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-tertiary/10 p-3 text-sm leading-6 text-on-surface-variant">
          {pricing.notes}
        </p>
      ) : null}
    </section>
  );
}
