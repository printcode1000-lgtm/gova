'use client';

import * as React from 'react';
import { useOnboardingStore, stepOrder } from '@/features/onboarding/domain';
import { useTranslation } from '@/shared/i18n';
import { useOnboardingPageSave } from '@/features/page-save/ui';
import { OnboardingSaveBridgeProvider } from '@/features/page-save/ui';
import { OnboardingSidebar, OnboardingProgress, MobileOnboardingNav, useStepConfig } from './index';
import {
  StoreIdentitySection,
  MerchantInfoSection,
  ContactInfoSection,
  LocationSection,
  CategoriesSection,
  ShippingSection,
  ReturnsSection,
  BrandIdentitySection,
  ProductsSection,
  CollectionsSection,
  VerificationSection,
  MarketingSection,
} from './sections';
import { cn } from '@/shared/utils';
import { PartyPopper } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';

const sectionComponents: Record<string, React.ComponentType> = {
  'store-identity': StoreIdentitySection,
  'merchant-info': MerchantInfoSection,
  'contact-info': ContactInfoSection,
  location: LocationSection,
  categories: CategoriesSection,
  shipping: ShippingSection,
  returns: ReturnsSection,
  'brand-identity': BrandIdentitySection,
  products: ProductsSection,
  collections: CollectionsSection,
  verification: VerificationSection,
  marketing: MarketingSection,
};

function CompletionScreen({
  onEdit,
}: {
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { data, reset } = useOnboardingStore();
  const storeName = data.storeIdentity.storeName || t('onboarding.completion.defaultStoreName');

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 animate-in fade-in duration-500">
      <div className="rounded-full asol-ring-secondary p-4">
        <PartyPopper className="h-12 w-12 text-secondary" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('onboarding.completion.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          {t('onboarding.completion.message', { storeName })}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button ui={{ uid: 'onboarding.completion.edit-setup-N0TT38', id: 'onboarding.completion.edit-setup', kind: 'action', action: 'edit-setup', part: 'completion' }} variant="outline" size="lg" onClick={onEdit}>
          {t('onboarding.completion.editSetup')}
        </Button>
        <Button ui={{ uid: 'onboarding.completion.start-over-d3T20G', id: 'onboarding.completion.start-over', kind: 'action', action: 'reset-onboarding', part: 'completion' }} variant="outline" size="lg" onClick={reset}>
          {t('onboarding.completion.startOver')}
        </Button>
      </div>

      <Card className="w-full max-w-lg mt-8">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">{t('onboarding.completion.summaryTitle')}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('onboarding.completion.productsAdded')}</span>
              <span className="font-medium">{data.products.products.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('onboarding.completion.collections')}</span>
              <span className="font-medium">{data.collections.collections.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('onboarding.completion.shippingMethods')}</span>
              <span className="font-medium">{data.shipping.methods.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('onboarding.completion.categories')}</span>
              <span className="font-medium">
                {data.categories.selectedCategories.filter((c) => c.isSelected).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OnboardingPage() {
  const { t } = useTranslation();
  const { currentStep, completedSteps } = useOnboardingStore();
  const stepConfig = useStepConfig();
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [showCompletion, setShowCompletion] = React.useState(false);
  const [imagesPending, setImagesPending] = React.useState(false);

  useOnboardingPageSave(!showCompletion, imagesPending);

  const isComplete = completedSteps.length === stepOrder.length;

  React.useEffect(() => {
    if (isComplete) {
      setShowCompletion(true);
    }
  }, [isComplete]);

  React.useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [currentStep, showCompletion]);

  const handleStepNavigate = () => {
    setShowCompletion(false);
  };

  const CurrentSection = sectionComponents[currentStep];
  const config = stepConfig[currentStep];
  const mainContent =
    isComplete && showCompletion ? (
      <CompletionScreen onEdit={handleStepNavigate} />
    ) : (
      <>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{config.title}</h2>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <div
          className={cn(
            'transition-opacity duration-200',
            isTransitioning ? 'opacity-0' : 'opacity-100',
          )}
        >
          <CurrentSection />
        </div>
      </>
    );

  return (
    <OnboardingSaveBridgeProvider setImagesPending={setImagesPending}>
      <div className="asol-onboarding-shell">
      <div className="hidden lg:block">
        <div className="flex">
          <aside className="w-80 min-h-screen border-r asol-onboarding-sidebar p-6 sticky top-0">
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold">{t('onboarding.page.title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('onboarding.page.subtitle')}
                </p>
              </div>

              <OnboardingProgress />

              <OnboardingSidebar onStepNavigate={handleStepNavigate} />

              {isComplete && showCompletion && (
                <Button ui={{ uid: 'onboarding.page.show-completion-zSW5qt', id: 'onboarding.page.show-completion', kind: 'action', action: 'show-completion', part: 'footer' }}
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowCompletion(true)}
                >
                  {t('onboarding.page.viewSuccessScreen')}
                </Button>
              )}

            </div>
          </aside>

          <main className="flex-1 p-8 asol-onboarding-main">
            <div className="max-w-3xl mx-auto">{mainContent}</div>
          </main>
        </div>
      </div>

      <div className="lg:hidden">
        <MobileOnboardingNav
          showCompletion={isComplete && showCompletion}
          onShowCompletion={() => setShowCompletion(true)}
          onStepNavigate={handleStepNavigate}
        />

        <main className="px-4 py-6">
          <div className="max-w-2xl mx-auto">
            <div
              className={cn(
                'transition-opacity duration-200',
                isTransitioning ? 'opacity-0' : 'opacity-100',
              )}
            >
              {isComplete && showCompletion ? (
                <CompletionScreen onEdit={handleStepNavigate} />
              ) : (
                <CurrentSection />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </OnboardingSaveBridgeProvider>
  );
}

export default OnboardingPage;
