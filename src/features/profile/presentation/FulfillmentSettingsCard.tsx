"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { ToggleSwitch } from "@/shared/ui/toggle-switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { CATEGORY_CONSTANTS } from "@/features/categories";
import { normalizeProfileFulfillmentSettings } from "@/features/profile/domain/profile-fulfillment-settings.entity";
import { useProfileFulfillmentSettings } from "@/features/profile/presentation/hooks/use-profile-fulfillment-settings";
import { useUsersBySpecialty } from "@/features/profile/presentation/hooks/use-users-by-specialty";
import type { UserProfileRow } from "@/features/profile/application/services/profile-service.interface";
import { useTranslation } from "@/shared/i18n";
import type {
  ProfileFulfillmentController,
  ProfileSectionStatus,
} from "./profile-save-controller";

import { FulfillmentSettingsCardProps } from "./fulfillment-settings/FulfillmentSettingsCard.fulfillment-types";
import { PROFILE_FULFILLMENT_SECTION_IDS } from "./profile-page.types";
import { fulfillmentSettingsCopy } from "./fulfillment-settings/fulfillment-settings-copy";
import { useFulfillmentSectionScroll } from "./fulfillment-settings/use-fulfillment-section-scroll";
import { FulfillmentCarrierSearch } from "./fulfillment-settings/FulfillmentCarrierSearch";

export const FulfillmentSettingsCard = React.forwardRef<
  ProfileFulfillmentController,
  FulfillmentSettingsCardProps
>(function FulfillmentSettingsCard({ onStatusChange }, ref) {
  const { locale } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fulfillmentSection = searchParams.get("section");
  const shippingSectionRef = React.useRef<HTMLElement>(null);
  const returnsSectionRef = React.useRef<HTMLElement>(null);
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
  const text = fulfillmentSettingsCopy(locale);
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

  useFulfillmentSectionScroll({
    fulfillmentSection,
    isLoading,
    returnsSectionRef,
    shippingSectionRef,
  });

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

      <FulfillmentCarrierSearch
        text={text}
        searchText={searchText}
        setSearchText={setSearchText}
        submitSearch={submitSearch}
        isLoadingDeliveryUsers={isLoadingDeliveryUsers}
        displayedUsers={displayedUsers}
        emptyDeliveryProvidersMessage={emptyDeliveryProvidersMessage}
        selected={selected}
        toggleCarrier={toggleCarrier}
        openProviderProfile={openProviderProfile}
        selectedCount={safeSettings.carrierUids.length}
      />

      <section
        ref={shippingSectionRef}
        id={PROFILE_FULFILLMENT_SECTION_IDS.shipping}
        className="space-y-4 rounded-xl border border-outline-variant p-4"
      >
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

      <section
        ref={returnsSectionRef}
        id={PROFILE_FULFILLMENT_SECTION_IDS.returns}
        className="space-y-4 rounded-xl border border-outline-variant p-4"
      >
        <h3 className="text-sm font-bold">{text.returnPolicy}</h3>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium leading-none">
            {settings.returns.enabled
              ? text.returnsAvailable
              : text.returnsUnavailable}
          </span>
          <ToggleSwitch
            checked={settings.returns.enabled}
            onChange={(checked) =>
              updateSettings((current) => ({
                ...current,
                returns: { ...current.returns, enabled: checked },
              }))
            }
            label={
              settings.returns.enabled
                ? text.returnsAvailable
                : text.returnsUnavailable
            }
          />
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
