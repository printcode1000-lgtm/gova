"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Truck } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SellerCard } from "@/components/ui/seller-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_CONSTANTS } from "@/features/categories";
import { normalizeProfileFulfillmentSettings } from "@/features/profile/entities/profile-fulfillment-settings.entity";
import { useProfileFulfillmentSettings } from "@/features/profile/hooks/use-profile-fulfillment-settings";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import type { UserProfileRow } from "@/features/profile/services/profile-service.interface";
import {
  createSellerCardViewModel,
  type SellerCardAction,
} from "@/features/seller-card";
import { useTranslation } from "@/lib/i18n";
import type {
  ProfileFulfillmentController,
  ProfileSectionStatus,
} from "./profile-save-controller";

interface FulfillmentSettingsCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}

export const FulfillmentSettingsCard = React.forwardRef<
  ProfileFulfillmentController,
  FulfillmentSettingsCardProps
>(function FulfillmentSettingsCard({ onStatusChange }, ref) {
  const { locale } = useTranslation();
  const router = useRouter();
  const {
    settings,
    updateSettings,
    isDirty,
    isLoading,
    isSaving,
    error,
    saveAsync,
    applySaved,
    saved,
  } = useProfileFulfillmentSettings();
  const [searchText, setSearchText] = React.useState("");
  const [submittedSearchText, setSubmittedSearchText] = React.useState("");
  const label = locale === "ar" ? "الشحن والإرجاع" : "Shipping and returns";
  const text = {
    loading: locale === "ar" ? "جاري التحميل..." : "Loading...",
    invalidCarrier:
      locale === "ar"
        ? "يجب اختيار مقدمي توصيل لديهم تخصص خدمات التوصيل."
        : "Selected carriers must have the delivery services specialty.",
    saved: locale === "ar" ? "تم الحفظ" : "Saved",
    shippingMethods: locale === "ar" ? "طرق الشحن" : "Shipping methods",
    linkedProviders:
      locale === "ar"
        ? "مقدمو خدمات التوصيل المرتبطون"
        : "Linked delivery providers",
    searchPlaceholder:
      locale === "ar" ? "ابحث بالاسم أو uid" : "Search by name or uid",
    search: locale === "ar" ? "بحث" : "Search",
    loadingProviders:
      locale === "ar"
        ? "جاري تحميل مقدمي التوصيل..."
        : "Loading delivery providers...",
    noMatchingProviders:
      locale === "ar" ? "لا توجد نتائج مطابقة." : "No matching providers.",
    noDeliveryProviders:
      locale === "ar"
        ? "لا يوجد مقدمو خدمات توصيل حتى الآن."
        : "No delivery service providers yet.",
    remove: locale === "ar" ? "إلغاء" : "Remove",
    select: locale === "ar" ? "تحديد" : "Select",
    viewProfile: locale === "ar" ? "عرض البروفايل" : "View profile",
    selectedCount: (count: number) =>
      locale === "ar"
        ? `تم اختيار ${count} مقدم توصيل.`
        : `${count} delivery provider(s) selected.`,
    returnPolicy: locale === "ar" ? "سياسة الإرجاع" : "Return policy",
    shippingPricing: locale === "ar" ? "تسعير الشحن" : "Shipping pricing",
    shippingPricingMode:
      locale === "ar" ? "طريقة حساب الشحن" : "Shipping pricing method",
    freeShipping: locale === "ar" ? "شحن مجاني" : "Free shipping",
    flatShipping: locale === "ar" ? "قيمة ثابتة" : "Flat rate",
    locationShipping: locale === "ar" ? "حسب المكان" : "By location",
    flatRate: locale === "ar" ? "قيمة الشحن الثابتة" : "Flat shipping rate",
    specialVehicleFee:
      locale === "ar"
        ? "رسوم سيارة النقل عند الحاجة"
        : "Special vehicle fee when needed",
    freeShippingThreshold:
      locale === "ar"
        ? "حد أدنى للطلب لشحن مجاني"
        : "Free shipping minimum order",
    shippingNotes: locale === "ar" ? "ملاحظات الشحن" : "Shipping notes",
    shippingNotesPlaceholder:
      locale === "ar"
        ? "مثال: السعر النهائي قد يختلف حسب العنوان أو حجم الطلب."
        : "Example: final shipping may vary by address or order size.",
    returnsAvailable:
      locale === "ar" ? "الإرجاع متاح" : "Returns are available",
    returnWindowDays:
      locale === "ar" ? "عدد أيام الإرجاع" : "Return window days",
    returnShippingPayer:
      locale === "ar" ? "من يتحمل تكلفة شحن الإرجاع" : "Return shipping payer",
    buyer: locale === "ar" ? "المشتري" : "Buyer",
    seller: locale === "ar" ? "البائع" : "Seller",
    caseByCase: locale === "ar" ? "حسب الحالة" : "Case by case",
    policyText: locale === "ar" ? "نص السياسة" : "Policy text",
    policyPlaceholder:
      locale === "ar"
        ? "اكتب شروط الإرجاع الخاصة بمتجرك."
        : "Write your store return policy.",
  };
  const hasSubmittedSearch = submittedSearchText.trim().length > 0;
  const { data: deliveryUsers, isLoading: isLoadingDeliveryUsers } =
    useUsersBySpecialty(
      CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID,
      CATEGORY_CONSTANTS.DELIVERY_SERVICES_ID,
      0,
      hasSubmittedSearch ? 50 : 5,
      submittedSearchText,
    );

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty,
      isSaving,
      canSave: true,
      label,
      save: saveAsync,
      getSnapshot: () => settings,
      applySaved,
    }),
    [applySaved, isDirty, isSaving, label, saveAsync, settings],
  );

  React.useEffect(() => {
    onStatusChange?.({ isDirty, isSaving, canSave: true, label });
  }, [isDirty, isSaving, label, onStatusChange]);

  const users = (deliveryUsers ?? []) as UserProfileRow[];
  const safeSettings = normalizeProfileFulfillmentSettings(settings);
  const selected = new Set(safeSettings.carrierUids);
  const displayedUsers = users;
  const emptyDeliveryProvidersMessage = hasSubmittedSearch
    ? text.noMatchingProviders
    : text.noDeliveryProviders;

  const toggleCarrier = (uid: string) => {
    updateSettings((current) => {
      const next = new Set(current.carrierUids);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return { ...current, carrierUids: Array.from(next) };
    });
  };

  const submitSearch = () => {
    setSubmittedSearchText(searchText);
  };

  const openProviderProfile = (uid: string) => {
    router.push(`/profile?mode=view&uid=${encodeURIComponent(uid)}`);
  };

  if (isLoading) {
    return (
      <div className="py-10 text-center text-sm text-on-surface-variant">
        {text.loading}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error === "invalidDeliveryCarrier" ? text.invalidCarrier : error}
        </div>
      ) : null}
      {saved && !isDirty ? (
        <div className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
          {text.saved}
        </div>
      ) : null}

      <section className="space-y-4 rounded-xl border border-outline-variant p-4">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold">{text.shippingMethods}</h3>
        </div>

        <div className="space-y-3">
          <Label htmlFor="deliveryProviderSearch">{text.linkedProviders}</Label>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="deliveryProviderSearch"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={text.searchPlaceholder}
                className="ps-9"
              />
            </div>
            <button
              type="submit"
              className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
            >
              {text.search}
            </button>
          </form>

          {isLoadingDeliveryUsers ? (
            <p className="text-sm text-muted-foreground">
              {text.loadingProviders}
            </p>
          ) : displayedUsers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline-variant p-4 text-center text-sm text-muted-foreground">
              {emptyDeliveryProvidersMessage}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {displayedUsers.map((user) => {
                const isSelected = selected.has(user.uid);
                const card = createSellerCardViewModel(user, {
                  badge: locale === "ar" ? "خدمة توصيل" : "Delivery provider",
                });
                const actions: SellerCardAction[] = [
                  {
                    kind: "view",
                    label: text.viewProfile,
                    onClick: () => openProviderProfile(user.uid),
                  },
                  {
                    kind: isSelected ? "remove" : "select",
                    label: isSelected ? text.remove : text.select,
                    active: isSelected,
                    tone: isSelected ? "tertiary" : "primary",
                    onClick: () => toggleCarrier(user.uid),
                  },
                ];
                return (
                  <SellerCard
                    key={user.uid}
                    card={card}
                    variant="linked-provider"
                    actions={actions}
                    className={
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/50"
                    }
                    onOpen={() => openProviderProfile(user.uid)}
                  />
                );
              })}
            </div>
          )}

          {safeSettings.carrierUids.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {text.selectedCount(safeSettings.carrierUids.length)}
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-outline-variant p-4">
        <h3 className="text-sm font-bold">{text.shippingPricing}</h3>

        <div className="space-y-2">
          <Label>{text.shippingPricingMode}</Label>
          <Select
            value={safeSettings.shippingPricing.mode}
            onValueChange={(value: "free" | "flat" | "by_location") =>
              updateSettings((current) => ({
                ...current,
                shippingPricing: {
                  ...current.shippingPricing,
                  mode: value,
                },
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">{text.freeShipping}</SelectItem>
              <SelectItem value="flat">{text.flatShipping}</SelectItem>
              <SelectItem value="by_location">
                {text.locationShipping}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {safeSettings.shippingPricing.mode === "flat" ? (
            <div className="space-y-2">
              <Label htmlFor="shippingFlatRate">{text.flatRate}</Label>
              <Input
                id="shippingFlatRate"
                type="number"
                min={0}
                step="0.01"
                value={safeSettings.shippingPricing.flatRate}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    shippingPricing: {
                      ...current.shippingPricing,
                      flatRate: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="shippingSpecialVehicleFee">
              {text.specialVehicleFee}
            </Label>
            <Input
              id="shippingSpecialVehicleFee"
              type="number"
              min={0}
              step="0.01"
              value={safeSettings.shippingPricing.specialVehicleFee}
              onChange={(event) =>
                updateSettings((current) => ({
                  ...current,
                  shippingPricing: {
                    ...current.shippingPricing,
                    specialVehicleFee: Number(event.target.value),
                  },
                }))
              }
            />
          </div>

          {safeSettings.shippingPricing.mode !== "free" ? (
            <div className="space-y-2">
              <Label htmlFor="shippingFreeThreshold">
                {text.freeShippingThreshold}
              </Label>
              <Input
                id="shippingFreeThreshold"
                type="number"
                min={0}
                step="0.01"
                value={safeSettings.shippingPricing.freeShippingThreshold}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    shippingPricing: {
                      ...current.shippingPricing,
                      freeShippingThreshold: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
          ) : null}
        </div>

        {safeSettings.shippingPricing.mode === "by_location" ? (
          <p className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm leading-6 text-on-surface">
            {locale === "ar"
              ? "سيتم تحديد قيمة الشحن بعد إنشاء الطلب ومراجعة عنوان المشتري، ولن تُضاف إلى الإجمالي إلا بعد موافقة المشتري على العرض."
              : "Shipping will be quoted after the order and buyer address are reviewed, and will only be added after the buyer accepts the quote."}
          </p>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="shippingNotes">{text.shippingNotes}</Label>
          <Textarea
            id="shippingNotes"
            value={safeSettings.shippingPricing.notes}
            onChange={(event) =>
              updateSettings((current) => ({
                ...current,
                shippingPricing: {
                  ...current.shippingPricing,
                  notes: event.target.value,
                },
              }))
            }
            maxLength={1000}
            rows={3}
            placeholder={text.shippingNotesPlaceholder}
          />
          <p className="text-end text-xs text-muted-foreground">
            {safeSettings.shippingPricing.notes.length}/1000
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-outline-variant p-4">
        <h3 className="text-sm font-bold">{text.returnPolicy}</h3>

        <div className="flex items-center gap-2">
          <Checkbox
            id="returnsEnabled"
            checked={settings.returns.enabled}
            onCheckedChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                returns: { ...current.returns, enabled: checked === true },
              }))
            }
          />
          <Label htmlFor="returnsEnabled" className="cursor-pointer">
            {text.returnsAvailable}
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnWindowDays">{text.returnWindowDays}</Label>
          <Input
            id="returnWindowDays"
            type="number"
            min={0}
            max={365}
            value={settings.returns.returnWindowDays}
            onChange={(event) =>
              updateSettings((current) => ({
                ...current,
                returns: {
                  ...current.returns,
                  returnWindowDays: Number(event.target.value),
                },
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>{text.returnShippingPayer}</Label>
          <Select
            value={settings.returns.returnShippingPayer}
            onValueChange={(value: "buyer" | "seller" | "case_by_case") =>
              updateSettings((current) => ({
                ...current,
                returns: {
                  ...current.returns,
                  returnShippingPayer: value,
                },
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">{text.buyer}</SelectItem>
              <SelectItem value="seller">{text.seller}</SelectItem>
              <SelectItem value="case_by_case">{text.caseByCase}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnPolicyText">{text.policyText}</Label>
          <Textarea
            id="returnPolicyText"
            value={settings.returns.policyText}
            onChange={(event) =>
              updateSettings((current) => ({
                ...current,
                returns: {
                  ...current.returns,
                  policyText: event.target.value,
                },
              }))
            }
            maxLength={2000}
            rows={5}
            placeholder={text.policyPlaceholder}
          />
          <p className="text-end text-xs text-muted-foreground">
            {settings.returns.policyText.length}/2000
          </p>
        </div>
      </section>
    </div>
  );
});

export default FulfillmentSettingsCard;
