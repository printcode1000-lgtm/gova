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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { OnboardingStep } from '@/lib/onboarding/types';
import { useOnboardingStore, stepOrder } from '@/lib/onboarding/store';
import { useTranslation } from '@/lib/i18n';

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

export function OnboardingProgress() {
  const { t } = useTranslation();
  const { completedSteps } = useOnboardingStore();

  const progress = Math.round((completedSteps.length / stepOrder.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('onboarding.progress.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.progress.sectionsCompleted', {
              completed: completedSteps.length,
              total: stepOrder.length,
            })}
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

export function OnboardingSidebar({
  onStepNavigate,
}: {
  onStepNavigate?: () => void;
}) {
  const { currentStep, completedSteps, goToStep } = useOnboardingStore();
  const stepConfig = useStepConfig();

  return (
    <nav className="space-y-1">
      {stepOrder.map((step) => {
        const config = stepConfig[step];
        const Icon = config.icon;
        const isComplete = completedSteps.includes(step);
        const isCurrent = step === currentStep;

        return (
          <button
            key={step}
            type="button"
            onClick={() => {
              onStepNavigate?.();
              goToStep(step);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
              isCurrent && 'bg-primary/10 text-primary font-medium',
              isComplete && !isCurrent && 'text-foreground hover:bg-muted/50',
              !isComplete && !isCurrent && 'text-muted-foreground hover:bg-muted/30',
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

export function MobileOnboardingNav({
  showCompletion,
  onShowCompletion,
  onStepNavigate,
}: {
  showCompletion?: boolean;
  onShowCompletion?: () => void;
  onStepNavigate?: () => void;
}) {
  const { t } = useTranslation();
  const { currentStep, nextStep, prevStep, completedSteps } = useOnboardingStore();
  const stepConfig = useStepConfig();

  if (showCompletion) {
    return (
      <div className="sticky top-0 z-50 gova-onboarding-sticky-bar border-b px-4 py-3">
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
    <div className="sticky top-0 z-50 gova-onboarding-sticky-bar border-b">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevStep}
            disabled={isFirst}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{config.title}</p>
              <p className="text-xs text-muted-foreground">
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

export function StepNavigation({
  onNext,
  onPrev,
  onComplete,
  nextLabel,
  prevLabel,
  isSubmitting,
  showSkip,
}: StepNavigationProps) {
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
    <div className="flex items-center justify-between pt-6 border-t">
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

      <div className="flex items-center gap-3">
        {showSkip && !isComplete && (
          <Button variant="ghost" onClick={nextStep} disabled={isSubmitting}>
            {t('onboarding.nav.skip')}
          </Button>
        )}
        <Button onClick={handleNext} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
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
