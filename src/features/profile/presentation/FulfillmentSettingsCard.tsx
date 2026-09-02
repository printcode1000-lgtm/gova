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
      <div id='features-profile-presentation-fulfillmentsettingscard-div-1-pnfzyu' className="py-10 text-center text-sm text-on-surface-variant">
        {text.loading}
      </div>
    );
  }

  return (
    <div id='features-profile-presentation-fulfillmentsettingscard-div-2-kh3fft' className="space-y-5">
      {error ? (
        <div id='features-profile-presentation-fulfillmentsettingscard-div-3-bjk7ub' className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
          {error === "invalidDeliveryCarrier" ? text.invalidCarrier : error}
        </div>
      ) : null}
      {saved && !isDirty ? (
        <div id='features-profile-presentation-fulfillmentsettingscard-div-4-nhytes' className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
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
        <button id='features-profile-presentation-fulfillmentsettingscard-button-6-w8y8lk'
          type="button"
          onClick={() => toggleSection("shipping")}
          aria-expanded={openSection === "shipping"}
          aria-label={text.shippingPricing}
          className="flex w-full items-center justify-between gap-2"
        >
          <h3 id='features-profile-presentation-fulfillmentsettingscard-heading-7-2cdtia' className="text-sm font-bold">{text.shippingPricing}</h3>
          <ChevronDown id='features-profile-presentation-fulfillmentsettingscard-chevrondown-8-vxboms'
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              openSection === "shipping" ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSection === "shipping" ? (
        <>
        <div id='features-profile-presentation-fulfillmentsettingscard-div-9-jtfwyu' className="space-y-2">
          <Label id='features-profile-presentation-fulfillmentsettingscard-label-10-j8xoe9'>{text.shippingPricingMode}</Label>
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
            <SelectTrigger id='features-profile-presentation-fulfillmentsettingscard-selecttrigger-11-fbp0tm' className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent id='features-profile-presentation-fulfillmentsettingscard-selectcontent-12-otopla'>
              <SelectItem id='features-profile-presentation-fulfillmentsettingscard-selectitem-13-eeumie' value="free">{text.freeShipping}</SelectItem>
              <SelectItem id='features-profile-presentation-fulfillmentsettingscard-selectitem-14-v3dpfp' value="flat">{text.flatShipping}</SelectItem>
              <SelectItem id='features-profile-presentation-fulfillmentsettingscard-selectitem-15-prer2z' value="by_location">
                {text.locationShipping}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div id='features-profile-presentation-fulfillmentsettingscard-div-16-w1uwlv' className="grid gap-3 sm:grid-cols-2">
          {safeSettings.shippingPricing.mode === "flat" ? (
            <div id='features-profile-presentation-fulfillmentsettingscard-div-17-swfrdt' className="space-y-2">
              <Label id='features-profile-presentation-fulfillmentsettingscard-label-18-eggcow' htmlFor='features-profile-presentation-fulfillmentsettingscard-input-19-c4bzc2'>{text.flatRate}</Label>
              <Input
                id='features-profile-presentation-fulfillmentsettingscard-input-19-c4bzc2'
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

          <div id='features-profile-presentation-fulfillmentsettingscard-div-20-9igefi' className="space-y-2">
            <Label id='features-profile-presentation-fulfillmentsettingscard-label-21-v9odj0' htmlFor='features-profile-presentation-fulfillmentsettingscard-input-22-nop4sr'>
              {text.specialVehicleFee}
            </Label>
            <Input
              id='features-profile-presentation-fulfillmentsettingscard-input-22-nop4sr'
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
            <div id='features-profile-presentation-fulfillmentsettingscard-div-23-icpwvt' className="space-y-2">
              <Label id='features-profile-presentation-fulfillmentsettingscard-label-24-vp9emd' htmlFor='features-profile-presentation-fulfillmentsettingscard-input-25-zbaq3h'>
                {text.freeShippingThreshold}
              </Label>
              <Input
                id='features-profile-presentation-fulfillmentsettingscard-input-25-zbaq3h'
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
          <p id='features-profile-presentation-fulfillmentsettingscard-text-26-cirxxq' className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm leading-6 text-on-surface">
            {locale === "ar"
              ? "سيتم تحديد قيمة الشحن بعد إنشاء الطلب ومراجعة عنوان المشتري، ولن تُضاف إلى الإجمالي إلا بعد موافقة المشتري على العرض."
              : "Shipping will be quoted after the order and buyer address are reviewed, and will only be added after the buyer accepts the quote."}
          </p>
        ) : null}

        <div id='features-profile-presentation-fulfillmentsettingscard-div-27-9lyciq' className="space-y-2">
          <Label id='features-profile-presentation-fulfillmentsettingscard-label-28-bfm8wh' htmlFor='features-profile-presentation-fulfillmentsettingscard-textarea-29-mfbaxl'>{text.shippingNotes}</Label>
          <Textarea
            id='features-profile-presentation-fulfillmentsettingscard-textarea-29-mfbaxl'
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
          <p id='features-profile-presentation-fulfillmentsettingscard-text-30-x4lchd' className="text-end text-xs text-muted-foreground">
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
        <button id='features-profile-presentation-fulfillmentsettingscard-button-32-pzeeul'
          type="button"
          onClick={() => toggleSection("returns")}
          aria-expanded={openSection === "returns"}
          aria-label={text.returnPolicy}
          className="flex w-full items-center justify-between gap-2"
        >
          <h3 id='features-profile-presentation-fulfillmentsettingscard-heading-33-njhcye' className="text-sm font-bold">{text.returnPolicy}</h3>
          <ChevronDown id='features-profile-presentation-fulfillmentsettingscard-chevrondown-34-n05tuu'
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              openSection === "returns" ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSection === "returns" ? (
        <>
        <div id='features-profile-presentation-fulfillmentsettingscard-div-35-50cp1l' className="flex items-center gap-3">
          <span id='features-profile-presentation-fulfillmentsettingscard-text-36-qgcuyo' className="text-sm font-medium leading-none">
            {settings.returns.enabled
              ? text.returnsAvailable
              : text.returnsUnavailable}
          </span>
          <ToggleSwitch id='features-profile-presentation-fulfillmentsettingscard-toggleswitch-37-jhjb3q'
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

        <div id='features-profile-presentation-fulfillmentsettingscard-div-38-1hvvw9' className="space-y-2">
          <Label id='features-profile-presentation-fulfillmentsettingscard-label-39-y8wro3' htmlFor='features-profile-presentation-fulfillmentsettingscard-input-40-loblta'>{text.returnWindowDays}</Label>
          <Input
            id='features-profile-presentation-fulfillmentsettingscard-input-40-loblta'
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

        <div id='features-profile-presentation-fulfillmentsettingscard-div-41-10so26' className="space-y-2">
          <Label id='features-profile-presentation-fulfillmentsettingscard-label-42-plc0ab'>{text.returnShippingPayer}</Label>
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
            <SelectTrigger id='features-profile-presentation-fulfillmentsettingscard-selecttrigger-43-gckz1a' className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent id='features-profile-presentation-fulfillmentsettingscard-selectcontent-44-f3ryey'>
              <SelectItem id='features-profile-presentation-fulfillmentsettingscard-selectitem-45-wpnglk' value="buyer">{text.buyer}</SelectItem>
              <SelectItem id='features-profile-presentation-fulfillmentsettingscard-selectitem-46-yhpm6n' value="seller">{text.seller}</SelectItem>
              <SelectItem id='features-profile-presentation-fulfillmentsettingscard-selectitem-47-4hn6bu' value="case_by_case">{text.caseByCase}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div id='features-profile-presentation-fulfillmentsettingscard-div-48-n7oeo9' className="space-y-2">
          <Label id='features-profile-presentation-fulfillmentsettingscard-label-49-q13av6' htmlFor='features-profile-presentation-fulfillmentsettingscard-textarea-50-6eo4x3'>{text.policyText}</Label>
          <Textarea
            id='features-profile-presentation-fulfillmentsettingscard-textarea-50-6eo4x3'
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
          <p id='features-profile-presentation-fulfillmentsettingscard-text-51-h6duty' className="text-end text-xs text-muted-foreground">
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
