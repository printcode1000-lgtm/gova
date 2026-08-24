"use client";

import { usePageSaveRegistration } from "@/features/page-save/presentation/hooks/use-page-save-registration";
import { buildImageUploadPageSaveItem } from "@/features/page-save/application/utils/page-save-image-items";
import { buildPageSaveOperationDescription } from "@/features/page-save/application/utils/page-save-operation-description";
import { uploadPageSaveImageUploadHandles } from "@/features/page-save/infrastructure/runtime/page-save-image-upload-registry";
import { useOnboardingStore } from "@/features/onboarding";
import { useTranslation } from "@/shared/i18n";

export const ONBOARDING_IMAGE_UPLOAD_HANDLES = [
  "onboarding-store-logo",
  "onboarding-store-cover",
  "onboarding-product-image",
  "onboarding-collection-cover",
] as const;

export function useOnboardingPageSave(
  active: boolean,
  imagesPending: boolean,
): void {
  const { t } = useTranslation();
  const { isDirty, currentStep } = useOnboardingStore();

  usePageSaveRegistration({
    id: "onboarding",
    label: "إعداد المتجر",
    returnPath: "/onboarding",
    enabled: active && (isDirty || imagesPending),
    items: [
      {
        id: `onboarding-${currentStep}`,
        label: currentStep,
        isDirty,
        canSave: isDirty,
        description: buildPageSaveOperationDescription(t, ["save"]),
      },
      buildImageUploadPageSaveItem({
        id: "onboarding-images",
        label: "صور الإعداد",
        hasPending: imagesPending,
        t,
      }),
    ],
    isSaving: false,
    canSave: isDirty || imagesPending,
    prepareForSave: async (selectedItemIds) => {
      if (!selectedItemIds.includes("onboarding-images")) return true;
      return uploadPageSaveImageUploadHandles([...ONBOARDING_IMAGE_UPLOAD_HANDLES]);
    },
    save: async (selectedItemIds) => {
      if (!selectedItemIds.includes(`onboarding-${currentStep}`)) return true;
      useOnboardingStore.setState({
        isDirty: false,
        lastSaved: new Date().toISOString(),
      });
      return true;
    },
  });
}
