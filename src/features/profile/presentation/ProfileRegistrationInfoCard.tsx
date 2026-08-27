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
      <div className="py-10 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1.5">
        <h2 className="text-xl font-semibold text-on-surface sm:text-2xl">
          {t("onboarding.contactInfo.primaryContact")}
        </h2>
        <p className="text-sm text-on-surface-variant">
          {t("onboarding.contactInfo.primaryContactHint")}
        </p>
      </header>
      <div className="space-y-4 sm:space-y-5">
        {error ? (
          <div className="rounded-lg bg-error/15 px-3 py-2 text-xs sm:text-sm text-error">
            {error}
          </div>
        ) : null}
        <PhoneVerification
          phone={form.phone}
          verified={phoneVerified}
          error={fieldErrors.phone}
          onPhoneChange={(phone: string) => updateRegistrationField("phone", phone)}
          onVerifiedChange={setPhoneVerified}
        />

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            {t("onboarding.contactInfo.email")}
          </Label>
          <Input ui={{ uid: "profile.registration.email-w4ce6P", id: "profile.registration.email", kind: "field", part: "account" }}
            value={form.email}
            onChange={(e) => updateRegistrationField("email", e.target.value)}
            placeholder={t("onboarding.contactInfo.emailPlaceholder")}
            type="email"
            className={fieldErrors.email ? "border-error" : undefined}
          />
          {fieldErrors.email ? (
            <p className="text-[10px] sm:text-xs text-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label className="text-xs sm:text-sm font-medium">
            {t("auth.storeName.label")}
          </Label>
          <Input
            ui={{
              uid: "profile.registration.store-name-HgQAE0",
              id: "profile.registration.store-name",
              kind: "field",
              part: "account",
            }}
            value={storeDetails.storeName}
            onChange={(e) => updateField("storeName", e.target.value)}
            placeholder={t("auth.storeName.placeholder")}
            maxLength={120}
            autoComplete="organization"
          />
          <p className="text-[10px] sm:text-xs text-on-surface-variant">
            {t("auth.storeName.hint")}
          </p>
        </div>

        <div className="space-y-2">
          <Button ui={{ uid: "profile.registration.toggle-password-QyiV32", id: "profile.registration.toggle-password", kind: "action", action: "toggle-password-form", part: "password" }}
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs sm:text-sm"
            onClick={() => setIsPasswordOpen((open) => !open)}
          >
            <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t("onboarding.contactInfo.changePassword")}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform",
                isPasswordOpen && "rotate-180",
              )}
            />
          </Button>
          {isPasswordOpen ? (
            <div className="space-y-3 sm:space-y-4 rounded-lg border border-outline-variant/40 p-3 sm:p-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.currentPassword")}
                </Label>
                <Input ui={{ uid: "profile.registration.current-password-4AZhBQ", id: "profile.registration.current-password", kind: "field", part: "password" }}
                  id="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) =>
                    updateRegistrationField("currentPassword", e.target.value)
                  }
                  placeholder={t(
                    "onboarding.contactInfo.currentPasswordPlaceholder",
                  )}
                  className={
                    fieldErrors.currentPassword ? "border-error" : undefined
                  }
                />
                {fieldErrors.currentPassword ? (
                  <p className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.currentPassword}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.newPassword")}
                </Label>
                <Input ui={{ uid: "profile.registration.new-password-M0iC2C", id: "profile.registration.new-password", kind: "field", part: "password" }}
                  id="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => updateRegistrationField("newPassword", e.target.value)}
                  placeholder={t(
                    "onboarding.contactInfo.newPasswordPlaceholder",
                  )}
                  className={
                    fieldErrors.newPassword ? "border-error" : undefined
                  }
                />
                {fieldErrors.newPassword ? (
                  <p className="text-[10px] sm:text-xs text-error">
                    {fieldErrors.newPassword}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">
                  {t("onboarding.contactInfo.confirmPassword")}
                </Label>
                <Input ui={{ uid: "profile.registration.confirm-password-QW9mB3", id: "profile.registration.confirm-password", kind: "field", part: "password" }}
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateRegistrationField("confirmPassword", e.target.value)
                  }
                  placeholder={t(
                    "onboarding.contactInfo.confirmPasswordPlaceholder",
                  )}
                  className={
                    fieldErrors.confirmPassword ? "border-error" : undefined
                  }
                />
                {fieldErrors.confirmPassword ? (
                  <p className="text-[10px] sm:text-xs text-error">
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
