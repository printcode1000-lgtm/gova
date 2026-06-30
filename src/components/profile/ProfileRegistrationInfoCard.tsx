'use client';

import { ChevronDown, Lock, Loader2, Mail, Save } from 'lucide-react';
import * as React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useProfileRegistration } from '@/features/auth/hooks/use-profile-registration';
import type {
  ProfileRegistrationController,
  ProfileSectionStatus,
} from './profile-save-controller';
import { ProfilePhoneVerification } from './ProfilePhoneVerification';

interface ProfileRegistrationInfoCardProps {
  showSaveButton?: boolean;
  onStatusChange?: (status: ProfileSectionStatus) => void;
}

export const ProfileRegistrationInfoCard = React.forwardRef<
  ProfileRegistrationController,
  ProfileRegistrationInfoCardProps
>(function ProfileRegistrationInfoCard(
  { showSaveButton = true, onStatusChange },
  ref,
) {
  const { t } = useTranslation();
  const {
    form,
    updateField,
    fieldErrors,
    phoneVerified,
    setPhoneVerified,
    isDirty,
    isLoading,
    isSaving,
    error,
    save,
    saveAsync,
    prepareSnapshot,
    applySaved,
    saved,
  } = useProfileRegistration();
  const [isPasswordOpen, setIsPasswordOpen] = React.useState(false);
  const label = t('onboarding.contactInfo.primaryContact');

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
      <Card>
        <CardContent className="py-10 text-center text-sm text-on-surface-variant">
          {t('profile.loading')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('onboarding.contactInfo.primaryContact')}</CardTitle>
        <CardDescription>
          {t('onboarding.contactInfo.primaryContactHint')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-lg bg-error/15 px-3 py-2 text-sm text-error">
            {error}
          </div>
        ) : null}
        {saved && !isDirty ? (
          <div className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">
            {t('profile.saved')}
          </div>
        ) : null}

        <ProfilePhoneVerification
          phone={form.phone}
          verified={phoneVerified}
          error={fieldErrors.phone}
          onPhoneChange={(phone) => updateField('phone', phone)}
          onVerifiedChange={setPhoneVerified}
        />

        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            {t('onboarding.contactInfo.email')}
          </Label>
          <Input
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder={t('onboarding.contactInfo.emailPlaceholder')}
            type="email"
            className={fieldErrors.email ? 'border-error' : undefined}
          />
          {fieldErrors.email ? (
            <p className="text-xs text-error">{fieldErrors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setIsPasswordOpen((open) => !open)}
          >
            <Lock className="h-4 w-4" />
            {t('onboarding.contactInfo.changePassword')}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isPasswordOpen && 'rotate-180',
              )}
            />
          </Button>
          {isPasswordOpen ? (
            <div className="space-y-4 rounded-lg border border-outline-variant/40 p-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">
                  {t('onboarding.contactInfo.currentPassword')}
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) =>
                    updateField('currentPassword', e.target.value)
                  }
                  placeholder={t(
                    'onboarding.contactInfo.currentPasswordPlaceholder',
                  )}
                  className={
                    fieldErrors.currentPassword ? 'border-error' : undefined
                  }
                />
                {fieldErrors.currentPassword ? (
                  <p className="text-xs text-error">
                    {fieldErrors.currentPassword}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {t('onboarding.contactInfo.newPassword')}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => updateField('newPassword', e.target.value)}
                  placeholder={t(
                    'onboarding.contactInfo.newPasswordPlaceholder',
                  )}
                  className={
                    fieldErrors.newPassword ? 'border-error' : undefined
                  }
                />
                {fieldErrors.newPassword ? (
                  <p className="text-xs text-error">
                    {fieldErrors.newPassword}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t('onboarding.contactInfo.confirmPassword')}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField('confirmPassword', e.target.value)
                  }
                  placeholder={t(
                    'onboarding.contactInfo.confirmPasswordPlaceholder',
                  )}
                  className={
                    fieldErrors.confirmPassword ? 'border-error' : undefined
                  }
                />
                {fieldErrors.confirmPassword ? (
                  <p className="text-xs text-error">
                    {fieldErrors.confirmPassword}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {showSaveButton && isDirty ? (
          <Button
            type="button"
            className="w-full auth-cta h-11"
            onClick={save}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t('profile.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 me-2" />
                {t('profile.save')}
              </>
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
});
