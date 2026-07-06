'use client';

import * as React from 'react';
import { Heart, Sparkles, Plus, X } from 'lucide-react';
import { useOnboardingStore, constants } from '@/lib/onboarding';
import { useTranslation } from '@/lib/i18n';
import { FormField, FormTextarea, CheckboxGroup } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BRAND_VALUE_KEYS: Record<string, string> = {
  Sustainability: 'sustainability',
  Quality: 'quality',
  Innovation: 'innovation',
  Tradition: 'tradition',
  Accessibility: 'accessibility',
  Luxury: 'luxury',
  Minimalism: 'minimalism',
  Creativity: 'creativity',
  Inclusivity: 'inclusivity',
  Transparency: 'transparency',
};

export function BrandIdentitySection() {
  const { t } = useTranslation();
  const { data, updateBrandIdentity, markStepComplete } = useOnboardingStore();
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [newUSP, setNewUSP] = React.useState('');

  const { brandIdentity } = data;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!brandIdentity.mission.trim()) {
      newErrors.mission = t('onboarding.brandIdentity.errors.missionRequired');
    } else if (brandIdentity.mission.length < 20) {
      newErrors.mission = t('onboarding.brandIdentity.errors.missionMin');
    }
    if (!brandIdentity.vision.trim()) {
      newErrors.vision = t('onboarding.brandIdentity.errors.visionRequired');
    } else if (brandIdentity.vision.length < 20) {
      newErrors.vision = t('onboarding.brandIdentity.errors.visionMin');
    }
    if (brandIdentity.uniqueSellingPoints.length === 0) {
      newErrors.uniqueSellingPoints = t('onboarding.brandIdentity.errors.uspsRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete('brand-identity');
      return true;
    }
    return false;
  };

  const addUSP = () => {
    if (newUSP.trim() && brandIdentity.uniqueSellingPoints.length < 5) {
      updateBrandIdentity({
        uniqueSellingPoints: [...brandIdentity.uniqueSellingPoints, newUSP.trim()],
      });
      setNewUSP('');
    }
  };

  const removeUSP = (usp: string) => {
    updateBrandIdentity({
      uniqueSellingPoints: brandIdentity.uniqueSellingPoints.filter((u) => u !== usp),
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            {t('onboarding.brandIdentity.title')}
          </CardTitle>
          <CardDescription>{t('onboarding.brandIdentity.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            label={t('onboarding.brandIdentity.mission')}
            htmlFor="mission"
            required
            hint={`${brandIdentity.mission.length}/300`}
            error={errors.mission}
          >
            <FormTextarea
              id="mission"
              value={brandIdentity.mission}
              onChange={(e) => updateBrandIdentity({ mission: e.target.value })}
              placeholder={t('onboarding.brandIdentity.missionPlaceholder')}
              rows={3}
              maxLength={300}
              error={errors.mission}
            />
          </FormField>

          <FormField
            label={t('onboarding.brandIdentity.vision')}
            htmlFor="vision"
            required
            hint={`${brandIdentity.vision.length}/300`}
            error={errors.vision}
          >
            <FormTextarea
              id="vision"
              value={brandIdentity.vision}
              onChange={(e) => updateBrandIdentity({ vision: e.target.value })}
              placeholder={t('onboarding.brandIdentity.visionPlaceholder')}
              rows={3}
              maxLength={300}
              error={errors.vision}
            />
          </FormField>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{t('onboarding.brandIdentity.usps')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('onboarding.brandIdentity.uspsHint')}
                </p>
              </div>
              {errors.uniqueSellingPoints && (
                <span className="text-xs text-destructive">{errors.uniqueSellingPoints}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {brandIdentity.uniqueSellingPoints.map((usp) => (
                <Badge key={usp} variant="secondary" className="gap-1 pl-3">
                  <Sparkles className="h-3 w-3" />
                  {usp}
                  <button type="button" onClick={() => removeUSP(usp)} className="ml-1 hover:bg-muted-foreground/20 rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newUSP}
                onChange={(e) => setNewUSP(e.target.value)}
                placeholder={t('onboarding.brandIdentity.uspPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUSP())}
                disabled={brandIdentity.uniqueSellingPoints.length >= 5}
              />
              <Button
                type="button"
                onClick={addUSP}
                disabled={!newUSP.trim() || brandIdentity.uniqueSellingPoints.length >= 5}
              >
                {t('onboarding.common.add')}
              </Button>
            </div>
          </div>

          <FormField label={t('onboarding.brandIdentity.brandValues')} htmlFor="brandValues" hint={t('onboarding.brandIdentity.brandValuesHint')}>
            <CheckboxGroup
              options={constants.brandValues.map((v) => ({
                value: v,
                label: t(`onboarding.constants.brandValues.${BRAND_VALUE_KEYS[v]}`),
              }))}
              value={brandIdentity.brandValues}
              onChange={(v) => updateBrandIdentity({ brandValues: v })}
              columns={2}
            />
          </FormField>
        </CardContent>
      </Card>

      <StepNavigation onNext={handleNext} showSkip />
    </div>
  );
}

export default BrandIdentitySection;
