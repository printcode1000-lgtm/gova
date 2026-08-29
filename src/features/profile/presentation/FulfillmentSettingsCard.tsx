"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
  const [openSection, setOpenSection] = React.useState<
    "carriers" | "shipping" | "returns" | null
  >(null);
  const toggleSection = (key: "carriers" | "shipping" | "returns") => {
    setOpenSection((current) => (current === key ? null : key));
  };
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

  React.useEffect(() => {
    if (fulfillmentSection === "shipping" || fulfillmentSection === "returns") {
      setOpenSection(fulfillmentSection);
    }
  }, [fulfillmentSection]);

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
      <div id="profile.fulfillment-settings-card.div" className="py-10 text-center text-sm text-on-surface-variant">
        {text.loading}
      </div>
    );
  }

  return (
    <div id="profile.fulfillment-settings-card.div.2" className="space-y-5">
      {error ? (
        <div id="profile.fulfillment-settings-card.div.3" className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error === "invalidDeliveryCarrier" ? text.invalidCarrier : error}
        </div>
      ) : null}
      {saved && !isDirty ? (
        <div id="profile.fulfillment-settings-card.div.4" className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
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
        open={openSection === "carriers"}
        onToggle={() => toggleSection("carriers")}
      />

      <section
        ref={shippingSectionRef}
        id={PROFILE_FULFILLMENT_SECTION_IDS.shipping}
        className="space-y-4 rounded-xl border border-outline-variant p-4"
      >
        <button id="profile.fulfillment-settings-card.button"
          type="button"
          onClick={() => toggleSection("shipping")}
          aria-expanded={openSection === "shipping"}
          aria-label={text.shippingPricing}
          className="flex w-full items-center justify-between gap-2"
        >
          <h3 id="profile.fulfillment-settings-card.h3" className="text-sm font-bold">{text.shippingPricing}</h3>
          <ChevronDown id="profile.fulfillment-settings-card.chevron-down"
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              openSection === "shipping" ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSection === "shipping" ? (
        <>
        <div id="profile.fulfillment-settings-card.div.5" className="space-y-2">
          <Label id="profile.fulfillment-settings-card.label">{text.shippingPricingMode}</Label>
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
            <SelectTrigger id="profile.fulfillment-settings-card.select-trigger" ui={{ uid: "profile.fulfillment.shipping-pricing-mode-ih0EJI", id: "profile.fulfillment.shipping-pricing-mode", kind: "field", part: "shipping" }} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent id="profile.fulfillment-settings-card.select-content">
              <SelectItem id="profile.fulfillment-settings-card.select-item" value="free">{text.freeShipping}</SelectItem>
              <SelectItem id="profile.fulfillment-settings-card.select-item.2" value="flat">{text.flatShipping}</SelectItem>
              <SelectItem id="profile.fulfillment-settings-card.select-item.3" value="by_location">
                {text.locationShipping}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div id="profile.fulfillment-settings-card.div.6" className="grid gap-3 sm:grid-cols-2">
          {safeSettings.shippingPricing.mode === "flat" ? (
            <div id="profile.fulfillment-settings-card.div.7" className="space-y-2">
              <Label id="profile.fulfillment-settings-card.label.2" htmlFor="shippingFlatRate">{text.flatRate}</Label>
              <Input ui={{ uid: "profile.fulfillment.flat-rate-1v4uEV", id: "profile.fulfillment.flat-rate", kind: "field", part: "shipping" }}
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

          <div id="profile.fulfillment-settings-card.div.8" className="space-y-2">
            <Label id="profile.fulfillment-settings-card.label.3" htmlFor="shippingSpecialVehicleFee">
              {text.specialVehicleFee}
            </Label>
            <Input ui={{ uid: "profile.fulfillment.special-vehicle-fee-2pRxC0", id: "profile.fulfillment.special-vehicle-fee", kind: "field", part: "shipping" }}
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
            <div id="profile.fulfillment-settings-card.div.9" className="space-y-2">
              <Label id="profile.fulfillment-settings-card.label.4" htmlFor="shippingFreeThreshold">
                {text.freeShippingThreshold}
              </Label>
              <Input ui={{ uid: "profile.fulfillment.free-threshold-JxW3bc", id: "profile.fulfillment.free-threshold", kind: "field", part: "shipping" }}
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
          <p id="profile.fulfillment-settings-card.p" className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm leading-6 text-on-surface">
            {locale === "ar"
              ? "سيتم تحديد قيمة الشحن بعد إنشاء الطلب ومراجعة عنوان المشتري، ولن تُضاف إلى الإجمالي إلا بعد موافقة المشتري على العرض."
              : "Shipping will be quoted after the order and buyer address are reviewed, and will only be added after the buyer accepts the quote."}
          </p>
        ) : null}

        <div id="profile.fulfillment-settings-card.div.10" className="space-y-2">
          <Label id="profile.fulfillment-settings-card.label.5" htmlFor="shippingNotes">{text.shippingNotes}</Label>
          <Textarea ui={{ uid: "profile.fulfillment.shipping-notes-6A7WVg", id: "profile.fulfillment.shipping-notes", kind: "field", part: "shipping" }}
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
          <p id="profile.fulfillment-settings-card.p.2" className="text-end text-xs text-muted-foreground">
            {safeSettings.shippingPricing.notes.length}/1000
          </p>
        </div>
        </>
        ) : null}
      </section>

      <section
        ref={returnsSectionRef}
        id={PROFILE_FULFILLMENT_SECTION_IDS.returns}
        className="space-y-4 rounded-xl border border-outline-variant p-4"
      >
        <button id="profile.fulfillment-settings-card.button.2"
          type="button"
          onClick={() => toggleSection("returns")}
          aria-expanded={openSection === "returns"}
          aria-label={text.returnPolicy}
          className="flex w-full items-center justify-between gap-2"
        >
          <h3 id="profile.fulfillment-settings-card.h3.2" className="text-sm font-bold">{text.returnPolicy}</h3>
          <ChevronDown id="profile.fulfillment-settings-card.chevron-down.2"
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              openSection === "returns" ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSection === "returns" ? (
        <>
        <div id="profile.fulfillment-settings-card.div.11" className="flex items-center gap-3">
          <span id="profile.fulfillment-settings-card.span" className="text-sm font-medium leading-none">
            {settings.returns.enabled
              ? text.returnsAvailable
              : text.returnsUnavailable}
          </span>
          <ToggleSwitch id="profile.fulfillment-settings-card.toggle-switch"
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

        <div id="profile.fulfillment-settings-card.div.12" className="space-y-2">
          <Label id="profile.fulfillment-settings-card.label.6" htmlFor="returnWindowDays">{text.returnWindowDays}</Label>
          <Input ui={{ uid: "profile.fulfillment.return-window-days-ZRYy72", id: "profile.fulfillment.return-window-days", kind: "field", part: "returns" }}
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

        <div id="profile.fulfillment-settings-card.div.13" className="space-y-2">
          <Label id="profile.fulfillment-settings-card.label.7">{text.returnShippingPayer}</Label>
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
            <SelectTrigger id="profile.fulfillment-settings-card.select-trigger.2" ui={{ uid: "profile.fulfillment.return-shipping-payer-rU9AMx", id: "profile.fulfillment.return-shipping-payer", kind: "field", part: "returns" }} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent id="profile.fulfillment-settings-card.select-content.2">
              <SelectItem id="profile.fulfillment-settings-card.select-item.4" value="buyer">{text.buyer}</SelectItem>
              <SelectItem id="profile.fulfillment-settings-card.select-item.5" value="seller">{text.seller}</SelectItem>
              <SelectItem id="profile.fulfillment-settings-card.select-item.6" value="case_by_case">{text.caseByCase}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div id="profile.fulfillment-settings-card.div.14" className="space-y-2">
          <Label id="profile.fulfillment-settings-card.label.8" htmlFor="returnPolicyText">{text.policyText}</Label>
          <Textarea ui={{ uid: "profile.fulfillment.return-policy-text-3X6pyz", id: "profile.fulfillment.return-policy-text", kind: "field", part: "returns" }}
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
          <p id="profile.fulfillment-settings-card.p.3" className="text-end text-xs text-muted-foreground">
            {settings.returns.policyText.length}/2000
          </p>
        </div>
        </>
        ) : null}
      </section>
    </div>
  );
});

export default FulfillmentSettingsCard;
