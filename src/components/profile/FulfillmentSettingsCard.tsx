"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Search, Truck } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_CONSTANTS } from "@/features/categories";
import { useProfileFulfillmentSettings } from "@/features/profile/hooks/use-profile-fulfillment-settings";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import { useTranslation } from "@/lib/i18n";
import type {
  ProfileFulfillmentController,
  ProfileSectionStatus,
} from "./profile-save-controller";

type DeliveryUser = {
  uid: string;
  storeDetailsJson?: string | null;
  avatarUrl?: string | null;
};

function parseStoreName(user: DeliveryUser): string {
  try {
    const details = JSON.parse(user.storeDetailsJson || "{}") as {
      storeName?: unknown;
    };
    return typeof details.storeName === "string" && details.storeName.trim()
      ? details.storeName
      : user.uid;
  } catch {
    return user.uid;
  }
}

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
    selfDelivery:
      locale === "ar" ? "أقوم بالتوصيل بنفسي" : "I handle delivery myself",
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
    returnsAvailable:
      locale === "ar" ? "الإرجاع متاح" : "Returns are available",
    returnWindowDays:
      locale === "ar" ? "عدد أيام الإرجاع" : "Return window days",
    returnShippingPayer:
      locale === "ar"
        ? "من يتحمل تكلفة شحن الإرجاع"
        : "Return shipping payer",
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

  const users = (deliveryUsers ?? []) as DeliveryUser[];
  const selected = new Set(settings.carrierUids);
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
          {error === "invalidDeliveryCarrier"
            ? text.invalidCarrier
            : error}
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

        <div className="flex items-center gap-2">
          <Checkbox
            id="selfDeliveryEnabled"
            checked={settings.selfDeliveryEnabled}
            onCheckedChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                selfDeliveryEnabled: checked === true,
              }))
            }
          />
          <Label htmlFor="selfDeliveryEnabled" className="cursor-pointer">
            {text.selfDelivery}
          </Label>
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
                const name = parseStoreName(user);
                const isSelected = selected.has(user.uid);
                return (
                  <div
                    key={user.uid}
                    className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 text-start transition ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-outline-variant bg-surface hover:border-primary/50"
                    }`}
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-bright">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-bold text-on-surface-variant">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.uid}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openProviderProfile(user.uid)}
                        className="inline-flex h-8 items-center gap-1 rounded-full border border-outline-variant bg-surface px-3 text-xs font-semibold text-on-surface transition hover:border-primary hover:text-primary"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {text.viewProfile}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleCarrier(user.uid)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isSelected
                          ? "bg-primary text-on-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                      >
                        {isSelected ? text.remove : text.select}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {settings.carrierUids.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {text.selectedCount(settings.carrierUids.length)}
            </p>
          ) : null}
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
              <SelectItem value="buyer">
                {text.buyer}
              </SelectItem>
              <SelectItem value="seller">
                {text.seller}
              </SelectItem>
              <SelectItem value="case_by_case">
                {text.caseByCase}
              </SelectItem>
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
