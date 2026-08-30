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
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.div.7-16SWOd", id: "onboarding.sections.brand-identity-section.div.7" })} id="onboarding.sections.brand-identity-section.div" className="space-y-6 animate-in fade-in duration-300">
      <Card ui={{ uid: "onboarding.sections.brand-identity-section.card.2-iW7I1x", id: "onboarding.sections.brand-identity-section.card.2" }} id="onboarding.sections.brand-identity-section.card">
        <CardHeader ui={{ uid: "onboarding.sections.brand-identity-section.card-header.2-iW1Pa3", id: "onboarding.sections.brand-identity-section.card-header.2" }} id="onboarding.sections.brand-identity-section.card-header">
          <CardTitle ui={{ uid: "onboarding.sections.brand-identity-section.card-title.2-8ZACY1", id: "onboarding.sections.brand-identity-section.card-title.2" }} id="onboarding.sections.brand-identity-section.card-title" className="flex items-center gap-2">
            <Heart id="onboarding.sections.brand-identity-section.heart" className="h-5 w-5" />
            {t('onboarding.brandIdentity.title')}
          </CardTitle>
          <CardDescription ui={{ uid: "onboarding.sections.brand-identity-section.card-description.2-qQ2ML7", id: "onboarding.sections.brand-identity-section.card-description.2" }} id="onboarding.sections.brand-identity-section.card-description">{t('onboarding.brandIdentity.description')}</CardDescription>
        </CardHeader>
        <CardContent ui={{ uid: "onboarding.sections.brand-identity-section.card-content.2-i98Z2G", id: "onboarding.sections.brand-identity-section.card-content.2" }} id="onboarding.sections.brand-identity-section.card-content" className="space-y-6">
          <FormField id="onboarding.sections.brand-identity-section.form-field"
            label={t('onboarding.brandIdentity.mission')}
            htmlFor="mission"
            required
            hint={`${brandIdentity.mission.length}/300`}
            error={errors.mission}
          >
            <FormTextarea ui={{ uid: 'onboarding.brand-identity.mission-T93XC3', id: 'onboarding.brand-identity.mission', kind: 'field', part: 'form' }}
              id="mission"
              value={brandIdentity.mission}
              onChange={(e) => updateBrandIdentity({ mission: e.target.value })}
              placeholder={t('onboarding.brandIdentity.missionPlaceholder')}
              rows={3}
              maxLength={300}
              error={errors.mission}
            />
          </FormField>

          <FormField id="onboarding.sections.brand-identity-section.form-field.2"
            label={t('onboarding.brandIdentity.vision')}
            htmlFor="vision"
            required
            hint={`${brandIdentity.vision.length}/300`}
            error={errors.vision}
          >
            <FormTextarea ui={{ uid: 'onboarding.brand-identity.vision-f4RNvM', id: 'onboarding.brand-identity.vision', kind: 'field', part: 'form' }}
              id="vision"
              value={brandIdentity.vision}
              onChange={(e) => updateBrandIdentity({ vision: e.target.value })}
              placeholder={t('onboarding.brandIdentity.visionPlaceholder')}
              rows={3}
              maxLength={300}
              error={errors.vision}
            />
          </FormField>

          <div {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.div.8-C4Q5Up", id: "onboarding.sections.brand-identity-section.div.8" })} id="onboarding.sections.brand-identity-section.div.2" className="space-y-3">
            <div {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.div.9-HJ1AYY", id: "onboarding.sections.brand-identity-section.div.9" })} id="onboarding.sections.brand-identity-section.div.3" className="flex items-center justify-between">
              <div {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.div.10-eE9miq", id: "onboarding.sections.brand-identity-section.div.10" })} id="onboarding.sections.brand-identity-section.div.4">
                <Label ui={{ uid: "onboarding.sections.brand-identity-section.label.2-INvZT8", id: "onboarding.sections.brand-identity-section.label.2" }} id="onboarding.sections.brand-identity-section.label" className="text-sm font-medium">{t('onboarding.brandIdentity.usps')}</Label>
                <p {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.p.2-72giHE", id: "onboarding.sections.brand-identity-section.p.2" })} id="onboarding.sections.brand-identity-section.p" className="text-xs text-muted-foreground">
                  {t('onboarding.brandIdentity.uspsHint')}
                </p>
              </div>
              {errors.uniqueSellingPoints && (
                <span {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.span.2-FJGX3l", id: "onboarding.sections.brand-identity-section.span.2" })} id="onboarding.sections.brand-identity-section.span" className="text-xs text-destructive">{errors.uniqueSellingPoints}</span>
              )}
            </div>

            <div {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.div.11-EemgB9", id: "onboarding.sections.brand-identity-section.div.11" })} id="onboarding.sections.brand-identity-section.div.5" className="flex flex-wrap gap-2">
              {brandIdentity.uniqueSellingPoints.map((usp) => (
                <Badge key={usp} ui={{ uid: "onboarding.sections.brand-identity-section.badge-og89wP", id: "onboarding.sections.brand-identity-section.badge" , instance: createOpaqueUiInstanceId("iter-a010717893", String(usp))}} variant="secondary" className="gap-1 pl-3">
                  <Sparkles className="h-3 w-3" />
                  {usp}
                  <button {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.button.2-UuU4Rj", id: "onboarding.sections.brand-identity-section.button.2" , instance: createOpaqueUiInstanceId("iter-8964f66d88", String(usp))})} type="button" onClick={() => removeUSP(usp)} className="ml-1 rounded-full">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div {...uiAttributes({ uid: "onboarding.sections.brand-identity-section.div.12-I2oXNa", id: "onboarding.sections.brand-identity-section.div.12" })} id="onboarding.sections.brand-identity-section.div.6" className="flex gap-2">
              <Input id="onboarding.sections.brand-identity-section.input" ui={{ uid: 'onboarding.brand-identity.new-usp-Uk0WbA', id: 'onboarding.brand-identity.new-usp', kind: 'field', part: 'usp' }}
                value={newUSP}
                onChange={(e) => setNewUSP(e.target.value)}
                placeholder={t('onboarding.brandIdentity.uspPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUSP())}
                disabled={brandIdentity.uniqueSellingPoints.length >= 5}
              />
              <Button id="onboarding.sections.brand-identity-section.button" ui={{ uid: 'onboarding.brand-identity.add-usp-J5aXQc', id: 'onboarding.brand-identity.add-usp', kind: 'action', action: 'add-usp', part: 'usp' }}
                type="button"
                onClick={addUSP}
                disabled={!newUSP.trim() || brandIdentity.uniqueSellingPoints.length >= 5}
              >
                {t('onboarding.common.add')}
              </Button>
            </div>
          </div>

          <FormField id="onboarding.sections.brand-identity-section.form-field.3" label={t('onboarding.brandIdentity.brandValues')} htmlFor="brandValues" hint={t('onboarding.brandIdentity.brandValuesHint')}>
            <CheckboxGroup id="onboarding.sections.brand-identity-section.checkbox-group"
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

      <StepNavigation id="onboarding.sections.brand-identity-section.step-navigation" onNext={handleNext} showSkip />
    </div>
  );
}

export default BrandIdentitySection;
