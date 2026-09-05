"use client";

import { BriefcaseBusiness, ChevronDown, Lock, Loader2, Mail } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
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
  const [isProviderAccountOpen, setIsProviderAccountOpen] = React.useState(false);
  const [isProviderAccountEnabled, setIsProviderAccountEnabled] = React.useState(false);
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

          <div id='features-profile-presentation-profileregistrationinfocard-div-35-uv2m4q' className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface">
            <Button
              id='features-profile-presentation-profileregistrationinfocard-button-36-gt9k2a'
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 rounded-none px-3 py-3 text-xs sm:text-sm"
              aria-expanded={isProviderAccountOpen}
              aria-controls="features-profile-presentation-profileregistrationinfocard-div-39-yw6c1p"
              onClick={() => setIsProviderAccountOpen((open) => !open)}
            >
              <BriefcaseBusiness
                id='features-profile-presentation-profileregistrationinfocard-briefcasebusiness-37-t4d8kb'
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span
                id='features-profile-presentation-profileregistrationinfocard-span-48-q1n7vc'
                className="min-w-0 flex-1 text-start font-medium"
              >
                {t("profile.providerAccount.title")}
              </span>
              <ChevronDown
                id='features-profile-presentation-profileregistrationinfocard-chevrondown-38-mq7e3n'
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isProviderAccountOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </Button>

            {isProviderAccountOpen ? (
              <div
                id='features-profile-presentation-profileregistrationinfocard-div-39-yw6c1p'
                className="space-y-4 border-t border-outline-variant/40 bg-surface-container-lowest p-3 sm:p-4"
              >
                <div id='features-profile-presentation-profileregistrationinfocard-div-40-r8h5vc' className="flex items-start justify-between gap-4">
                  <div id='features-profile-presentation-profileregistrationinfocard-div-41-j2b7fd' className="min-w-0 space-y-1">
                    <Label
                      id='features-profile-presentation-profileregistrationinfocard-label-42-x3n9es'
                      htmlFor='features-profile-presentation-profileregistrationinfocard-switch-44-k5p2zr'
                      className="text-xs font-semibold text-on-surface sm:text-sm"
                    >
                      {t("profile.providerAccount.toggleLabel")}
                    </Label>
                    <p id='features-profile-presentation-profileregistrationinfocard-text-43-a6c1wu' className="text-[11px] leading-5 text-on-surface-variant sm:text-xs">
                      {t("profile.providerAccount.toggleDescription")}
                    </p>
                  </div>
                  <Switch
                    id='features-profile-presentation-profileregistrationinfocard-switch-44-k5p2zr'
                    checked={isProviderAccountEnabled}
                    onCheckedChange={setIsProviderAccountEnabled}
                    aria-label={t("profile.providerAccount.toggleLabel")}
                  />
                </div>

                <div id='features-profile-presentation-profileregistrationinfocard-div-45-z7v3nm' className="space-y-2 rounded-lg bg-surface-container-low px-3 py-3">
                  <p id='features-profile-presentation-profileregistrationinfocard-text-46-c4q8hy' className="text-xs leading-5 text-on-surface sm:text-sm">
                    {t("profile.providerAccount.description")}
                  </p>
                  <p id='features-profile-presentation-profileregistrationinfocard-text-47-b9m2tk' className="text-[11px] leading-5 text-on-surface-variant sm:text-xs">
                    {t("profile.providerAccount.personalToProviderHint")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
