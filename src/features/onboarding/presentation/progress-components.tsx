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
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.progress-components.div-0QcSWe", id: "onboarding.progress-components.div" })} id={id} className="space-y-4">
      <div {...uiAttributes({ uid: "onboarding.progress-components.div.2-kVX6jJ", id: "onboarding.progress-components.div.2" })} className="flex items-center justify-between">
        <div {...uiAttributes({ uid: "onboarding.progress-components.div.3-W5USpW", id: "onboarding.progress-components.div.3" })}>
          <h2 {...uiAttributes({ uid: "onboarding.progress-components.h2-W3lvij", id: "onboarding.progress-components.h2" })} className="text-lg font-semibold">{t('onboarding.progress.title')}</h2>
          <p {...uiAttributes({ uid: "onboarding.progress-components.p-7YMHWP", id: "onboarding.progress-components.p" })} className="text-sm text-muted-foreground">
            {t('onboarding.progress.sectionsCompleted', {
              completed: completedSteps.length,
              total: stepOrder.length,
            })}
          </p>
        </div>
        <div {...uiAttributes({ uid: "onboarding.progress-components.div.4-W5md9r", id: "onboarding.progress-components.div.4" })} className="text-right">
          <span {...uiAttributes({ uid: "onboarding.progress-components.span-melC96", id: "onboarding.progress-components.span" })} className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
      </div>
      <Progress ui={{ uid: "onboarding.progress-components.progress-j5abFh", id: "onboarding.progress-components.progress" }} value={progress} className="h-2" />
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
    <nav {...uiAttributes({ uid: "onboarding.progress-components.nav-0kmoDU", id: "onboarding.progress-components.nav" })} id={id} className="space-y-1">
      {stepOrder.map((step) => {
        const config = stepConfig[step];
        const Icon = config.icon;
        const isComplete = completedSteps.includes(step);
        const isCurrent = step === currentStep;

        return (
          <button id={id}
            key={step} {...uiAttributes({ uid: "onboarding.progress-components.button-q90Vej", id: "onboarding.progress-components.button" })}
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
            <div {...uiAttributes({ uid: "onboarding.progress-components.div.5-F3GIxK", id: "onboarding.progress-components.div.5" })}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full shrink-0 transition-colors',
                isComplete && 'bg-merchant-success text-merchant-success-foreground',
                isCurrent && !isComplete && 'bg-primary text-primary-foreground',
                !isComplete && !isCurrent && 'bg-muted text-muted-foreground',
              )}
            >
              {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div {...uiAttributes({ uid: "onboarding.progress-components.div.6-dVIR1w", id: "onboarding.progress-components.div.6" })} className="flex-1 min-w-0">
              <p {...uiAttributes({ uid: "onboarding.progress-components.p.2-I8DPuM", id: "onboarding.progress-components.p.2" })} className={cn('text-sm truncate', isCurrent && 'font-semibold')}>
                {config.title}
              </p>
              <p {...uiAttributes({ uid: "onboarding.progress-components.p.3-k0QD2C", id: "onboarding.progress-components.p.3" })} className="text-xs text-muted-foreground truncate">{config.description}</p>
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
      <div {...uiAttributes({ uid: "onboarding.progress-components.div.7-Mcw9OS", id: "onboarding.progress-components.div.7" })} id={id} className="sticky top-0 z-50 asol-onboarding-sticky-bar border-b px-4 py-3">
        <Button ui={{ uid: 'onboarding.progress.back-to-steps-dQG5I6', id: 'onboarding.progress.back-to-steps', kind: 'action', action: 'back-to-steps', part: 'progress' }} variant="outline" className="w-full" onClick={onStepNavigate}>
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
    <div {...uiAttributes({ uid: "onboarding.progress-components.div.8-1QWm2V", id: "onboarding.progress-components.div.8" })} id={id} className="sticky top-0 z-50 asol-onboarding-sticky-bar border-b">
      <div {...uiAttributes({ uid: "onboarding.progress-components.div.9-zSuLC9", id: "onboarding.progress-components.div.9" })} className="px-4 py-3 space-y-3">
        <div {...uiAttributes({ uid: "onboarding.progress-components.div.10-KVD73J", id: "onboarding.progress-components.div.10" })} className="flex items-center gap-3">
          <Button ui={{ uid: 'onboarding.progress.previous-step-pkl3Gx', id: 'onboarding.progress.previous-step', kind: 'action', action: 'previous-step', part: 'progress' }}
            variant="ghost"
            size="icon"
            onClick={prevStep}
            disabled={isFirst}
            className="shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div {...uiAttributes({ uid: "onboarding.progress-components.div.11-5XkPzX", id: "onboarding.progress-components.div.11" })} className="flex items-center gap-2 flex-1 min-w-0">
            <div {...uiAttributes({ uid: "onboarding.progress-components.div.12-XL57vJ", id: "onboarding.progress-components.div.12" })} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div {...uiAttributes({ uid: "onboarding.progress-components.div.13-Gjs38i", id: "onboarding.progress-components.div.13" })} className="min-w-0">
              <p {...uiAttributes({ uid: "onboarding.progress-components.p.4-agO8x7", id: "onboarding.progress-components.p.4" })} className="text-sm font-medium truncate">{config.title}</p>
              <p {...uiAttributes({ uid: "onboarding.progress-components.p.5-f95QyR", id: "onboarding.progress-components.p.5" })} className="text-xs text-muted-foreground">
                {t('onboarding.progress.stepOf', {
                  current: currentIndex + 1,
                  total: stepOrder.length,
                })}
              </p>
            </div>
          </div>

          <Button ui={{ uid: 'onboarding.progress.next-step-z3QvMw', id: 'onboarding.progress.next-step', kind: 'action', action: 'next-step', part: 'progress' }}
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
          <Button ui={{ uid: 'onboarding.progress.view-completion-814Jf1', id: 'onboarding.progress.view-completion', kind: 'action', action: 'show-completion', part: 'progress' }} variant="secondary" className="w-full" onClick={onShowCompletion}>
            {t('onboarding.page.viewSuccessScreen')}
          </Button>
        )}

        <Progress ui={{ uid: "onboarding.progress-components.progress.2-09AE5L", id: "onboarding.progress-components.progress.2" }} value={progress} className="h-1.5" />
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
    <div {...uiAttributes({ uid: "onboarding.progress-components.div.14-SI4Cak", id: "onboarding.progress-components.div.14" })} id={id} className="flex items-center justify-between pt-6 border-t">
      <Button ui={{ uid: 'onboarding.nav.previous-gDH0aK', id: 'onboarding.nav.previous', kind: 'action', action: 'previous-step', part: 'nav' }}
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

      <div {...uiAttributes({ uid: "onboarding.progress-components.div.15-i90JDW", id: "onboarding.progress-components.div.15" })} className="flex items-center gap-3">
        {showSkip && !isComplete && (
          <Button ui={{ uid: 'onboarding.nav.skip-jR9Khn', id: 'onboarding.nav.skip', kind: 'action', action: 'skip-step', part: 'nav' }} variant="ghost" onClick={nextStep} disabled={isSubmitting}>
            {t('onboarding.nav.skip')}
          </Button>
        )}
        <Button ui={{ uid: 'onboarding.nav.next-SfQgs1', id: 'onboarding.nav.next', kind: 'action', action: 'next-step', part: 'nav' }} onClick={handleNext} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <>
              <span {...uiAttributes({ uid: "onboarding.progress-components.span.2-KGSH8b", id: "onboarding.progress-components.span.2" })} className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
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
