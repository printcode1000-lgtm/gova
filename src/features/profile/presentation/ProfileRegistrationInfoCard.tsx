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
      <div id="profile.profile-registration-info-card.div" className="py-10 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  return (
    <div id="profile.profile-registration-info-card.div.2" className="space-y-5">
      <header id="profile.profile-registration-info-card.header" className="space-y-1.5">
        <h2 id="profile.profile-registration-info-card.h2" className="text-xl font-semibold text-on-surface sm:text-2xl">
          {t("onboarding.contactInfo.primaryContact")}
        </h2>
        <p id="profile.profile-registration-info-card.p" className="text-sm text-on-surface-variant">
          {t("onboarding.contactInfo.primaryContactHint")}
        </p>
      </header>
      <div id="profile.profile-registration-info-card.div.3" className="space-y-4 sm:space-y-5">
        {error ? (
          <div id="profile.profile-registration-info-card.div.4" className="rounded-lg bg-error/15 px-3 py-2 text-xs sm:text-sm text-error">
            {error}
          </div>
        ) : null}
        <PhoneVerification id="profile.profile-registration-info-card.phone-verification"
          phone={form.phone}
          verified={phoneVerified}
          error={fieldErrors.phone}
          onPhoneChange={(phone: string) => updateRegistrationField("phone", phone)}
          onVerifiedChange={setPhoneVerified}
        />

        <div id="profile.profile-registration-info-card.div.5" className="space-y-2">
          <Label id="profile.profile-registration-info-card.label" className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Mail id="profile.profile-registration-info-card.mail" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            {t("onboarding.contactInfo.email")}
          </Label>
          <Input id="profile.profile-registration-info-card.input"
            value={form.email}
            onChange={(e) => updateRegistrationField("email", e.target.value)}
            placeholder={t("onboarding.contactInfo.emailPlaceholder")}
            type="email"
            className={fieldErrors.email ? "border-error" : undefined}
          />
          {fieldErrors.email ? (
            <p id="profile.profile-registration-info-card.p.2" className="text-[10px] sm:text-xs text-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div id="profile.profile-registration-info-card.div.6" className="space-y-2">
          <Label id="profile.profile-registration-info-card.label.2" className="text-xs sm:text-sm font-medium">
            {t("auth.storeName.label")}
          </Label>
          <Input id="profile.profile-registration-info-card.input.2"
            value={storeDetails.storeName}
            onChange={(e) => updateField("storeName", e.target.value)}
            placeholder={t("auth.storeName.placeholder")}
            maxLength={120}
            autoComplete="organization"
          />
          <p id="profile.profile-registration-info-card.p.3" className="text-[10px] sm:text-xs text-on-surface-variant">
            {t("auth.storeName.hint")}
          </p>
        </div>

        <div id="profile.profile-registration-info-card.div.7" className="space-y-2">
          <Button id="profile.profile-registration-info-card.button"
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs sm:text-sm"
            onClick={() => setIsPasswordOpen((open) => !open)}
          >
            <Lock id="profile.profile-registration-info-card.lock" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("onboarding.contactInfo.changePassword")}
            <ChevronDown id="profile.profile-registration-info-card.chevron-down"
              className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform",
                isPasswordOpen && "rotate-180",
              )}
            />
          </Button>
          {isPasswordOpen ? (
            <div id="profile.profile-registration-info-card.div.8" className="space-y-3 sm:space-y-4 rounded-lg border border-outline-variant/40 p-3 sm:p-4">
              <div id="profile.profile-registration-info-card.div.9" className="space-y-2">
                <Label id="profile.profile-registration-info-card.label.3" htmlFor="profile.registration.current-password" className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.currentPassword")}
                </Label>
                <Input
                  id="profile.registration.current-password"
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
                  <p id="profile.profile-registration-info-card.p.4" className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.currentPassword}
                  </p>
                ) : null}
              </div>
              <div id="profile.profile-registration-info-card.div.10" className="space-y-2">
                <Label id="profile.profile-registration-info-card.label.4" htmlFor="profile.registration.new-password" className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.newPassword")}
                </Label>
                <Input
                  id="profile.registration.new-password"
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
                  <p id="profile.profile-registration-info-card.p.5" className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.newPassword}
                  </p>
                ) : null}
              </div>
              <div id="profile.profile-registration-info-card.div.11" className="space-y-2">
                <Label id="profile.profile-registration-info-card.label.5" htmlFor="profile.registration.confirm-password" className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.confirmPassword")}
                </Label>
                <Input
                  id="profile.registration.confirm-password"
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
                  <p id="profile.profile-registration-info-card.p.6" className="text-[10px] sm:text-xs text-error">
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
