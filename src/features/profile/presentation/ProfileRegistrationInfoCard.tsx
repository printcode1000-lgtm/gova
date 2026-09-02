"use client";

import { ChevronDown, Lock, Loader2, Mail } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/utils";
import { useProfileRegistration } from "@/features/auth/ui";
import { useStoreDetails } from "@/features/profile/presentation/hooks/use-store-details";
import type {
  ProfileRegistrationController,
  ProfileSectionStatus,
} from "./profile-save-controller";
import { PhoneVerification } from "@/features/auth/ui";
import { foldPasswordDigits } from "@asol/auth-core";

interface ProfileRegistrationInfoCardProps {
  onStatusChange?: (status: ProfileSectionStatus) => void;
}

export const ProfileRegistrationInfoCard = React.forwardRef<
  ProfileRegistrationController,
  ProfileRegistrationInfoCardProps
>(function ProfileRegistrationInfoCard({ onStatusChange }, ref) {
  const { t } = useTranslation();
  const {
    form,
    updateField: updateRegistrationField,
    fieldErrors,
    phoneVerified,
    setPhoneVerified,
    isDirty,
    isLoading,
    isSaving,
    error,
    saveAsync,
    prepareSnapshot,
    applySaved,
  } = useProfileRegistration();
  const { details: storeDetails, updateField } = useStoreDetails();
  const [isPasswordOpen, setIsPasswordOpen] = React.useState(false);
  const label = t("onboarding.contactInfo.primaryContact");

  React.useImperativeHandle(
    ref,
    () => ({
      isDirty,
      isSaving,
      canSave: phoneVerified,
      label,
      save: saveAsync,
      prepareSnapshot,
      applySaved,
    }),
    [
      applySaved,
      isDirty,
      isSaving,
      label,
      phoneVerified,
      prepareSnapshot,
      saveAsync,
    ],
  );

  React.useEffect(() => {
    onStatusChange?.({
      isDirty,
      isSaving,
      canSave: phoneVerified,
      label,
    });
  }, [isDirty, isSaving, label, onStatusChange, phoneVerified]);

  if (isLoading) {
    return (
      <div id='features-profile-presentation-profileregistrationinfocard-div-1-apidkk' className="py-10 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  return (
    <div id='features-profile-presentation-profileregistrationinfocard-div-2-soklq9' className="space-y-5">
      <header id='features-profile-presentation-profileregistrationinfocard-header-3-pu2bl2' className="space-y-1.5">
        <h2 id='features-profile-presentation-profileregistrationinfocard-heading-4-y7eacq' className="text-xl font-semibold text-on-surface sm:text-2xl">
          {t("onboarding.contactInfo.primaryContact")}
        </h2>
        <p id='features-profile-presentation-profileregistrationinfocard-text-5-ixmb6o' className="text-sm text-on-surface-variant">
          {t("onboarding.contactInfo.primaryContactHint")}
        </p>
      </header>
      <div id='features-profile-presentation-profileregistrationinfocard-div-6-8iorb8' className="space-y-4 sm:space-y-5">
        {error ? (
          <div id='features-profile-presentation-profileregistrationinfocard-div-7-9qnjmn' className="rounded-lg bg-error/15 px-3 py-2 text-xs sm:text-sm text-error">
            {error}
          </div>
        ) : null}
        <PhoneVerification id='features-profile-presentation-profileregistrationinfocard-phoneverification-8-ztesbg'
          phone={form.phone}
          verified={phoneVerified}
          error={fieldErrors.phone}
          onPhoneChange={(phone: string) => updateRegistrationField("phone", phone)}
          onVerifiedChange={setPhoneVerified}
        />

        <div id='features-profile-presentation-profileregistrationinfocard-div-9-yua6ah' className="space-y-2">
          <Label id='features-profile-presentation-profileregistrationinfocard-label-10-3ex0ki' className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Mail id='features-profile-presentation-profileregistrationinfocard-mail-11-cbycdj' className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            {t("onboarding.contactInfo.email")}
          </Label>
          <Input id='features-profile-presentation-profileregistrationinfocard-input-12-rggyap'
            value={form.email}
            onChange={(e) => updateRegistrationField("email", e.target.value)}
            placeholder={t("onboarding.contactInfo.emailPlaceholder")}
            type="email"
            className={fieldErrors.email ? "border-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id='features-profile-presentation-profileregistrationinfocard-text-13-eksfhq' className="text-[10px] sm:text-xs text-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div id='features-profile-presentation-profileregistrationinfocard-div-14-rstytq' className="space-y-2">
          <Label id='features-profile-presentation-profileregistrationinfocard-label-15-iahsca' className="text-xs sm:text-sm font-medium">
            {t("auth.storeName.label")}
          </Label>
          <Input id='features-profile-presentation-profileregistrationinfocard-input-16-fvyahw'
            value={storeDetails.storeName}
            onChange={(e) => updateField("storeName", e.target.value)}
            placeholder={t("auth.storeName.placeholder")}
            maxLength={120}
            autoComplete="organization"
          />
          <p id='features-profile-presentation-profileregistrationinfocard-text-17-u8ajkc' className="text-[10px] sm:text-xs text-on-surface-variant">
            {t("auth.storeName.hint")}
          </p>
        </div>

        <div id='features-profile-presentation-profileregistrationinfocard-div-18-xiccfz' className="space-y-2">
          <Button id='features-profile-presentation-profileregistrationinfocard-button-19-pwcf56'
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs sm:text-sm"
            onClick={() => setIsPasswordOpen((open) => !open)}
          >
            <Lock id='features-profile-presentation-profileregistrationinfocard-lock-20-nszvo4' className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("onboarding.contactInfo.changePassword")}
            <ChevronDown id='features-profile-presentation-profileregistrationinfocard-chevrondown-21-ddrzjg'
              className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform",
                isPasswordOpen && "rotate-180",
              )}
            />
          </Button>
          {isPasswordOpen ? (
            <div id='features-profile-presentation-profileregistrationinfocard-div-22-6umeqa' className="space-y-3 sm:space-y-4 rounded-lg border border-outline-variant/40 p-3 sm:p-4">
              <div id='features-profile-presentation-profileregistrationinfocard-div-23-nm0dtg' className="space-y-2">
                <Label id='features-profile-presentation-profileregistrationinfocard-label-24-bxos8a' htmlFor='features-profile-presentation-profileregistrationinfocard-input-25-vpa6gw' className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.currentPassword")}
                </Label>
                <Input
                  id='features-profile-presentation-profileregistrationinfocard-input-25-vpa6gw'
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) =>
                    updateRegistrationField("currentPassword", foldPasswordDigits(e.target.value))
                  }
                  placeholder={t(
                    "onboarding.contactInfo.currentPasswordPlaceholder",
                  )}
                  className={
                    fieldErrors.currentPassword ? "border-error" : undefined
                  }
                />
                {fieldErrors.currentPassword ? (
                  <p id='features-profile-presentation-profileregistrationinfocard-text-26-oylbyq' className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.currentPassword}
                  </p>
                ) : null}
              </div>
              <div id='features-profile-presentation-profileregistrationinfocard-div-27-gkksrd' className="space-y-2">
                <Label id='features-profile-presentation-profileregistrationinfocard-label-28-jaoahh' htmlFor='features-profile-presentation-profileregistrationinfocard-input-29-znczey' className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.newPassword")}
                </Label>
                <Input
                  id='features-profile-presentation-profileregistrationinfocard-input-29-znczey'
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => updateRegistrationField("newPassword", foldPasswordDigits(e.target.value))}
                  placeholder={t(
                    "onboarding.contactInfo.newPasswordPlaceholder",
                  )}
                  className={
                    fieldErrors.newPassword ? "border-error" : undefined
                  }
                />
                {fieldErrors.newPassword ? (
                  <p id='features-profile-presentation-profileregistrationinfocard-text-30-zvghgc' className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.newPassword}
                  </p>
                ) : null}
              </div>
              <div id='features-profile-presentation-profileregistrationinfocard-div-31-0dvpi8' className="space-y-2">
                <Label id='features-profile-presentation-profileregistrationinfocard-label-32-yyelml' htmlFor='features-profile-presentation-profileregistrationinfocard-input-33-qw6a39' className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.confirmPassword")}
                </Label>
                <Input
                  id='features-profile-presentation-profileregistrationinfocard-input-33-qw6a39'
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateRegistrationField("confirmPassword", foldPasswordDigits(e.target.value))
                  }
                  placeholder={t(
                    "onboarding.contactInfo.confirmPasswordPlaceholder",
                  )}
                  className={
                    fieldErrors.confirmPassword ? "border-error" : undefined
                  }
                />
                {fieldErrors.confirmPassword ? (
                  <p id='features-profile-presentation-profileregistrationinfocard-text-34-soxlb7' className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
