'use client';

import * as React from 'react';
import {
  Store,
  User,
  Phone,
  MapPin,
  Tag,
  Truck,
  RotateCcw,
  Heart,
  Package,
  FolderOpen,
  ShieldCheck,
  Megaphone,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import type { OnboardingStep } from '@/features/onboarding/domain/types';
import { useOnboardingStore, stepOrder } from '@/features/onboarding/domain/store';
import { useTranslation } from '@/shared/i18n';

const stepIcons: Record<OnboardingStep, React.ComponentType<{ className?: string }>> = {
  'store-identity': Store,
  'merchant-info': User,
  'contact-info': Phone,
  location: MapPin,
  categories: Tag,
  shipping: Truck,
  returns: RotateCcw,
  'brand-identity': Heart,
  products: Package,
  collections: FolderOpen,
  verification: ShieldCheck,
  marketing: Megaphone,
};

export function useStepConfig() {
  const { t } = useTranslation();

  return React.useMemo(
    () =>
      Object.fromEntries(
        stepOrder.map((step) => [
          step,
          {
            title: t(`onboarding.steps.${step}.title`),
            description: t(`onboarding.steps.${step}.description`),
            icon: stepIcons[step],
          },
        ]),
      ) as Record<
        OnboardingStep,
        { title: string; description: string; icon: React.ComponentType<{ className?: string }> }
      >,
    [t],
  );
}

export function OnboardingProgress({ id }: { id?: string }) {
  const { t } = useTranslation();
  const { completedSteps } = useOnboardingStore();

  const progress = Math.round((completedSteps.length / stepOrder.length) * 100);

  return (
    <div id={id} className="space-y-4">
      <div id="features-onboarding-presentation-progress-components-div-2-hiyauh" className="flex items-center justify-between">
        <div id="features-onboarding-presentation-progress-components-div-3-xij5be">
          <h2 id="features-onboarding-presentation-progress-components-heading-4-njikwj" className="text-lg font-semibold">{t('onboarding.progress.title')}</h2>
          <p id="features-onboarding-presentation-progress-components-text-5-ozakcb" className="text-sm text-muted-foreground">
            {t('onboarding.progress.sectionsCompleted', {
              completed: completedSteps.length,
              total: stepOrder.length,
            })}
          </p>
        </div>
        <div id="features-onboarding-presentation-progress-components-div-6-xgxd8c" className="text-right">
          <span id="features-onboarding-presentation-progress-components-text-7-rti6dp" className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

export function OnboardingSidebar({ id,
  onStepNavigate,
}: {
  onStepNavigate?: () => void;
} & { id?: string }) {
  const { currentStep, completedSteps, goToStep } = useOnboardingStore();
  const stepConfig = useStepConfig();

  return (
    <nav id={id} className="space-y-1">
      {stepOrder.map((step) => {
        const config = stepConfig[step];
        const Icon = config.icon;
        const isComplete = completedSteps.includes(step);
        const isCurrent = step === currentStep;

        return (
          <button id={id}
            key={step}
            type="button"
            onClick={() => {
              onStepNavigate?.();
              goToStep(step);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
              isCurrent && 'bg-primary/10 text-primary font-medium',
              isComplete && !isCurrent && 'text-foreground',
              !isComplete && !isCurrent && 'text-muted-foreground',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full shrink-0 transition-colors',
                isComplete && 'bg-merchant-success text-merchant-success-foreground',
                isCurrent && !isComplete && 'bg-primary text-primary-foreground',
                !isComplete && !isCurrent && 'bg-muted text-muted-foreground',
              )}
            >
              {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm truncate', isCurrent && 'font-semibold')}>
                {config.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">{config.description}</p>
            </div>
          </button>
        );
      })}
    </nav>
  );
}

export function MobileOnboardingNav({ id,
  showCompletion,
  onShowCompletion,
  onStepNavigate,
}: {
  showCompletion?: boolean;
  onShowCompletion?: () => void;
  onStepNavigate?: () => void;
} & { id?: string }) {
  const { t } = useTranslation();
  const { currentStep, nextStep, prevStep, completedSteps } = useOnboardingStore();
  const stepConfig = useStepConfig();

  if (showCompletion) {
    return (
      <div id={id} className="sticky top-0 z-50 asol-onboarding-sticky-bar border-b px-4 py-3">
        <Button variant="outline" className="w-full" onClick={onStepNavigate}>
          {t('onboarding.progress.backToSteps')}
        </Button>
      </div>
    );
  }

  const config = stepConfig[currentStep];
  const Icon = config.icon;
  const currentIndex = stepOrder.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === stepOrder.length - 1;
  const progress = Math.round(((currentIndex + 1) / stepOrder.length) * 100);
  const allComplete = completedSteps.length === stepOrder.length;

  return (
    <div id={id} className="sticky top-0 z-50 asol-onboarding-sticky-bar border-b">
      <div id="features-onboarding-presentation-progress-components-div-11-ivlp6f" className="px-4 py-3 space-y-3">
        <div id="features-onboarding-presentation-progress-components-div-12-7srim7" className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevStep}
            disabled={isFirst}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div id="features-onboarding-presentation-progress-components-div-13-preigb" className="flex items-center gap-2 flex-1 min-w-0">
            <div id="features-onboarding-presentation-progress-components-div-14-qhreop" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div id="features-onboarding-presentation-progress-components-div-15-rmdosz" className="min-w-0">
              <p id="features-onboarding-presentation-progress-components-text-16-iljtym" className="text-sm font-medium truncate">{config.title}</p>
              <p id="features-onboarding-presentation-progress-components-text-17-mgz1hs" className="text-xs text-muted-foreground">
                {t('onboarding.progress.stepOf', {
                  current: currentIndex + 1,
                  total: stepOrder.length,
                })}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextStep}
            disabled={isLast && !allComplete}
            className="shrink-0"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {allComplete && onShowCompletion && (
          <Button variant="secondary" className="w-full" onClick={onShowCompletion}>
            {t('onboarding.page.viewSuccessScreen')}
          </Button>
        )}

        <Progress value={progress} className="h-1.5" />
      </div>
    </div>
  );
}

export interface StepNavigationProps {
  onNext?: () => boolean;
  onPrev?: () => void;
  onComplete?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  isSubmitting?: boolean;
  showSkip?: boolean;
}

export function StepNavigation({ id,
  onNext,
  onPrev,
  onComplete,
  nextLabel,
  prevLabel,
  isSubmitting,
  showSkip,
}: StepNavigationProps & { id?: string }) {
  const { t } = useTranslation();
  const { nextStep, prevStep, currentStep, completedSteps } = useOnboardingStore();
  const currentIndex = stepOrder.indexOf(currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === stepOrder.length - 1;
  const isComplete = completedSteps.includes(currentStep);

  const handleNext = () => {
    if (onNext && !onNext()) return;
    if (isLast && onComplete) {
      onComplete();
    } else if (!isLast) {
      nextStep();
    }
  };

  return (
    <div id={id} className="flex items-center justify-between pt-6 border-t">
      <Button
        variant="ghost"
        onClick={() => {
          if (onPrev) onPrev();
          prevStep();
        }}
        disabled={isFirst || isSubmitting}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        {prevLabel ?? t('onboarding.nav.back')}
      </Button>

      <div id="features-onboarding-presentation-progress-components-div-19-lli3of" className="flex items-center gap-3">
        {showSkip && !isComplete && (
          <Button variant="ghost" onClick={nextStep} disabled={isSubmitting}>
            {t('onboarding.nav.skip')}
          </Button>
        )}
        <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <span id="features-onboarding-presentation-progress-components-text-20-0t6zqj" className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {t('onboarding.nav.saving')}
            </>
          ) : isLast ? (
            t('onboarding.nav.completeSetup')
          ) : (
            <>
              {nextLabel ?? t('onboarding.nav.continue')}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
