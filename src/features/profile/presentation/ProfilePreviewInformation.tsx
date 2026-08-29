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
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "profile.profile-preview-information.div.9-xQG9sJ", id: "profile.profile-preview-information.div.9" })} id="profile.profile-preview-information.div" className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.title} {...uiAttributes({ uid: "profile.profile-preview-information.article-VC9N7d", id: "profile.profile-preview-information.article" })}
          className="min-w-0 rounded-2xl border border-outline-variant/70 bg-surface p-4 shadow-sm"
        >
          <div {...uiAttributes({ uid: "profile.profile-preview-information.div.10-UFyZ5p", id: "profile.profile-preview-information.div.10" })}
            className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${metric.tone}`}
          >
            <FontAwesomeIcon icon={metric.icon} />
          </div>
          <p {...uiAttributes({ uid: "profile.profile-preview-information.p.6-1Dg3Bk", id: "profile.profile-preview-information.p.6" })} className="break-words text-xs font-semibold text-on-surface-variant">
            {metric.title}
          </p>
          <p {...uiAttributes({ uid: "profile.profile-preview-information.p.7-06SXox", id: "profile.profile-preview-information.p.7" })} className="mt-1 break-words font-bold text-on-surface">{metric.value}</p>
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
    <section {...uiAttributes({ uid: "profile.profile-preview-information.section.2-J2UEUs", id: "profile.profile-preview-information.section.2" })} id="profile.profile-preview-information.section" className="min-w-0 rounded-3xl border border-outline-variant/70 bg-surface p-4 shadow-sm sm:p-6 lg:h-full">
      <div {...uiAttributes({ uid: "profile.profile-preview-information.div.11-FR1DWV", id: "profile.profile-preview-information.div.11" })} id="profile.profile-preview-information.div.2" className="mb-5 flex min-w-0 items-center gap-3">
        <span {...uiAttributes({ uid: "profile.profile-preview-information.span.2-8HwyZ4", id: "profile.profile-preview-information.span.2" })} id="profile.profile-preview-information.span" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-lg text-secondary sm:h-12 sm:w-12 sm:text-xl">
          <FontAwesomeIcon id="profile.profile-preview-information.font-awesome-icon" icon={faTruck} />
        </span>
        <div {...uiAttributes({ uid: "profile.profile-preview-information.div.12-wZG0Mp", id: "profile.profile-preview-information.div.12" })} id="profile.profile-preview-information.div.3" className="min-w-0 flex-1">
          <h2 {...uiAttributes({ uid: "profile.profile-preview-information.h2.2-2e0yL1", id: "profile.profile-preview-information.h2.2" })} id="profile.profile-preview-information.h2" className="break-words text-base font-bold sm:text-lg">
            {ar ? "الشحن والإرجاع" : "Shipping & returns"}
          </h2>
          <p {...uiAttributes({ uid: "profile.profile-preview-information.p.8-8OwXQA", id: "profile.profile-preview-information.p.8" })} id="profile.profile-preview-information.p" className="break-words text-xs text-on-surface-variant">
            {ar
              ? "تفاصيل واضحة قبل إتمام الطلب"
              : "Clear details before ordering"}
          </p>
        </div>
      </div>
      <div {...uiAttributes({ uid: "profile.profile-preview-information.div.13-I5Qtga", id: "profile.profile-preview-information.div.13" })} id="profile.profile-preview-information.div.4" className="grid min-w-0 gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label} {...uiAttributes({ uid: "profile.profile-preview-information.div.14-MMv3z1", id: "profile.profile-preview-information.div.14" })}
            className="min-w-0 rounded-xl bg-surface-container-low p-3"
          >
            <p {...uiAttributes({ uid: "profile.profile-preview-information.p.9-fEEmY6", id: "profile.profile-preview-information.p.9" })} className="flex min-w-0 items-start gap-2 text-xs text-on-surface-variant">
              <FontAwesomeIcon icon={row.icon} className="mt-0.5 flex-shrink-0 text-secondary" />
              <span {...uiAttributes({ uid: "profile.profile-preview-information.span.3-W6zU1b", id: "profile.profile-preview-information.span.3" })} className="min-w-0 break-words">{row.label}</span>
            </p>
            <p {...uiAttributes({ uid: "profile.profile-preview-information.p.10-7MsNAE", id: "profile.profile-preview-information.p.10" })} className="mt-1 break-words font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
      <div {...uiAttributes({ uid: "profile.profile-preview-information.div.15-soLW7X", id: "profile.profile-preview-information.div.15" })} id="profile.profile-preview-information.div.5" className="mt-4 min-w-0 rounded-2xl border border-outline-variant/60 p-4">
        <div {...uiAttributes({ uid: "profile.profile-preview-information.div.16-3AqkAB", id: "profile.profile-preview-information.div.16" })} id="profile.profile-preview-information.div.6" className="flex min-w-0 items-start gap-2 break-words font-bold">
          <FontAwesomeIcon id="profile.profile-preview-information.font-awesome-icon.2"
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
            <p {...uiAttributes({ uid: "profile.profile-preview-information.p.11-F25r1U", id: "profile.profile-preview-information.p.11" })} id="profile.profile-preview-information.p.2" className="mt-2 break-words text-sm text-on-surface-variant">
              {ar ? "تكلفة شحن الإرجاع:" : "Return shipping paid by:"}{" "}
              <strong className="text-on-surface">{payer}</strong>
            </p>
            {fulfillment.returns.policyText ? (
              <p {...uiAttributes({ uid: "profile.profile-preview-information.p.12-cq8F4Q", id: "profile.profile-preview-information.p.12" })} id="profile.profile-preview-information.p.3" className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-on-surface-variant">
                {fulfillment.returns.policyText}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {carriers.length > 0 ? (
        <div {...uiAttributes({ uid: "profile.profile-preview-information.div.17-7NC6Vy", id: "profile.profile-preview-information.div.17" })} id="profile.profile-preview-information.div.7" className="mt-4 min-w-0">
          <p {...uiAttributes({ uid: "profile.profile-preview-information.p.13-m7vF3l", id: "profile.profile-preview-information.p.13" })} id="profile.profile-preview-information.p.4" className="mb-2 break-words text-xs font-bold text-on-surface-variant">
            {ar ? "شركات التوصيل المتاحة" : "Available carriers"}
          </p>
          <div {...uiAttributes({ uid: "profile.profile-preview-information.div.18-05WW5B", id: "profile.profile-preview-information.div.18" })} id="profile.profile-preview-information.div.8" className="flex min-w-0 flex-wrap gap-2">
            {carriers.map((carrier) => (
              <span
                key={carrier.uid} {...uiAttributes({ uid: "profile.profile-preview-information.span.4-XP60hy", id: "profile.profile-preview-information.span.4" })}
                className="min-w-0 max-w-full break-words rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {carrier.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {pricing.notes ? (
        <p {...uiAttributes({ uid: "profile.profile-preview-information.p.14-KY9VF5", id: "profile.profile-preview-information.p.14" })} id="profile.profile-preview-information.p.5" className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-tertiary/10 p-3 text-sm leading-6 text-on-surface-variant">
          {pricing.notes}
        </p>
      ) : null}
    </section>
  );
}
