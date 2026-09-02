'use client';

import * as React from 'react';
import { Heart, Sparkles, Plus, X } from 'lucide-react';
import { useOnboardingStore, constants } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { FormField, FormTextarea, CheckboxGroup } from '../form-components';
import { StepNavigation } from '../progress-components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

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
    <div id='onboarding-presentation-sections-brand-identity-section-div-1-asg7vh' className="space-y-6 animate-in fade-in duration-300">
      <Card id='onboarding-presentation-sections-brand-identity-section-card-2-of7lzp'>
        <CardHeader id='onboarding-presentation-sections-brand-identity-section-cardheader-3-m7ss8u'>
          <CardTitle id='onboarding-presentation-sections-brand-identity-section-cardtitle-4-il0tve' className="flex items-center gap-2">
            <Heart id='onboarding-presentation-sections-brand-identity-section-heart-5-7hfjfh' className="h-5 w-5" />
            {t('onboarding.brandIdentity.title')}
          </CardTitle>
          <CardDescription id='onboarding-presentation-sections-brand-identity-section-carddescription-6-aiynqu'>{t('onboarding.brandIdentity.description')}</CardDescription>
        </CardHeader>
        <CardContent id='onboarding-presentation-sections-brand-identity-section-cardcontent-7-elcxge' className="space-y-6">
          <FormField id='onboarding-presentation-sections-brand-identity-section-formfield-8-mloiwl'
            label={t('onboarding.brandIdentity.mission')}
            htmlFor='onboarding-presentation-sections-brand-identity-section-formtextarea-9-rhaawf'
            required
            hint={`${brandIdentity.mission.length}/300`}
            error={errors.mission}
          >
            <FormTextarea
              id='onboarding-presentation-sections-brand-identity-section-formtextarea-9-rhaawf'
              value={brandIdentity.mission}
              onChange={(e) => updateBrandIdentity({ mission: e.target.value })}
              placeholder={t('onboarding.brandIdentity.missionPlaceholder')}
              rows={3}
              maxLength={300}
              error={errors.mission}
            />
          </FormField>

          <FormField id='onboarding-presentation-sections-brand-identity-section-formfield-10-oflbxu'
            label={t('onboarding.brandIdentity.vision')}
            htmlFor='onboarding-presentation-sections-brand-identity-section-formtextarea-11-dptcoj'
            required
            hint={`${brandIdentity.vision.length}/300`}
            error={errors.vision}
          >
            <FormTextarea
              id='onboarding-presentation-sections-brand-identity-section-formtextarea-11-dptcoj'
              value={brandIdentity.vision}
              onChange={(e) => updateBrandIdentity({ vision: e.target.value })}
              placeholder={t('onboarding.brandIdentity.visionPlaceholder')}
              rows={3}
              maxLength={300}
              error={errors.vision}
            />
          </FormField>

          <div id='onboarding-presentation-sections-brand-identity-section-div-12-17skgc' className="space-y-3">
            <div id='onboarding-presentation-sections-brand-identity-section-div-13-5mit3o' className="flex items-center justify-between">
              <div id='onboarding-presentation-sections-brand-identity-section-div-14-3dtujv'>
                <Label id='onboarding-presentation-sections-brand-identity-section-label-15-0okzik' className="text-sm font-medium">{t('onboarding.brandIdentity.usps')}</Label>
                <p id='onboarding-presentation-sections-brand-identity-section-text-16-sfl2hr' className="text-xs text-muted-foreground">
                  {t('onboarding.brandIdentity.uspsHint')}
                </p>
              </div>
              {errors.uniqueSellingPoints && (
                <span id='onboarding-presentation-sections-brand-identity-section-text-17-sfhyeq' className="text-xs text-destructive">{errors.uniqueSellingPoints}</span>
              )}
            </div>

            <div id='onboarding-presentation-sections-brand-identity-section-div-18-cwtzzk' className="flex flex-wrap gap-2">
              {brandIdentity.uniqueSellingPoints.map((usp) => (
                <Badge key={usp} variant="secondary" className="gap-1 pl-3">
                  <Sparkles className="h-3 w-3" />
                  {usp}
                  <button type="button" onClick={() => removeUSP(usp)} className="ml-1 rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div id='onboarding-presentation-sections-brand-identity-section-div-19-3hiaix' className="flex gap-2">
              <Input id='onboarding-presentation-sections-brand-identity-section-input-20-uz2xep'
                value={newUSP}
                onChange={(e) => setNewUSP(e.target.value)}
                placeholder={t('onboarding.brandIdentity.uspPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUSP())}
                disabled={brandIdentity.uniqueSellingPoints.length >= 5}
              />
              <Button id='onboarding-presentation-sections-brand-identity-section-button-21-h9gtdx'
                type="button"
                onClick={addUSP}
                disabled={!newUSP.trim() || brandIdentity.uniqueSellingPoints.length >= 5}
              >
                {t('onboarding.common.add')}
              </Button>
            </div>
          </div>

          <FormField id='onboarding-presentation-sections-brand-identity-section-formfield-22-4lxtcq' label={t('onboarding.brandIdentity.brandValues')} htmlFor="brandValues" hint={t('onboarding.brandIdentity.brandValuesHint')}>
            <CheckboxGroup id='onboarding-presentation-sections-brand-identity-section-checkboxgroup-23-stmiwg'
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

      <StepNavigation id='onboarding-presentation-sections-brand-identity-section-stepnavigation-24-ktchy5' onNext={handleNext} showSkip />
    </div>
  );
}

export default BrandIdentitySection;
