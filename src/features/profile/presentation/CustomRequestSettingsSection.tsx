"use client";

import * as React from "react";

import { EMPTY_PROFILE_SHOWCASE, type StoreDetailsData } from "../domain/store-details.entity";
import { useStoreDetails } from "./hooks/use-store-details";
import { useTranslation } from "@/shared/i18n";

/** Profile custom-request availability, surfaced from notification settings. */
export function CustomRequestSettingsSection() {
  const { locale } = useTranslation();
  const { details, updateField, isLoading, isSaving, saveAsync } = useStoreDetails();
  const showcase = details.profileShowcase ?? EMPTY_PROFILE_SHOWCASE;

  const toggleCustomRequest = React.useCallback(async () => {
    if (isLoading || isSaving) return;

    const previousShowcase = showcase;
    const nextShowcase = {
      ...showcase,
      customRequestEnabled: !showcase.customRequestEnabled,
    };
    const nextDetails: StoreDetailsData = {
      ...details,
      profileShowcase: nextShowcase,
    };

    updateField("profileShowcase", nextShowcase);
    try {
      await saveAsync(nextDetails);
    } catch {
      updateField("profileShowcase", previousShowcase);
    }
  }, [details, isLoading, isSaving, saveAsync, showcase, updateField]);

  return (
    <section
      id='features-profile-presentation-productscard-section-17-hkgevz'
      className="rounded-xl border border-outline-variant bg-transparent p-4"
      aria-busy={isSaving}
    >
      <label id='features-profile-presentation-productscard-label-18-lou07b' className="flex items-center justify-between gap-4">
        <span id='features-profile-presentation-productscard-text-19-ulb5hm' className="min-w-0">
          <span id='features-profile-presentation-productscard-text-20-zhkl1i' className="block text-sm font-semibold text-on-surface">
            {locale === "ar" ? "الطلب الخاص" : "Custom requests"}
          </span>
          <span id='features-profile-presentation-productscard-text-21-309oz3' className="mt-1 block text-xs leading-5 text-on-surface-variant">
            {locale === "ar"
              ? "يسمح للعميل بإرسال وصف وصور لطلب، لتراجعه وترد عليه من الطلبات."
              : "Lets customers send a description and images for an item not listed in your products."}
          </span>
        </span>
        <input
          id='features-profile-presentation-productscard-input-22-bmjfu5'
          type="checkbox"
          className="peer sr-only"
          checked={showcase.customRequestEnabled}
          disabled={isLoading || isSaving}
          onChange={() => void toggleCustomRequest()}
        />
        <span
          id='features-profile-presentation-productscard-text-23-hbodsi'
          className="relative h-7 w-12 shrink-0 rounded-full bg-outline-variant transition peer-disabled:opacity-50 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5"
        />
      </label>
    </section>
  );
}
