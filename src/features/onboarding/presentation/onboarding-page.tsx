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

function CompletionScreen({ id,
  onEdit,
}: {
  onEdit: () => void;
} & { id?: string }) {
  const { t } = useTranslation();
  const { data, reset } = useOnboardingStore();
  const storeName = data.storeIdentity.storeName || t('onboarding.completion.defaultStoreName');

  return (
    <div id={id} className="flex flex-col items-center justify-center py-16 text-center space-y-6 animate-in fade-in duration-500">
      <div id={id ? `${id}-div-2-fduvzq` : undefined} className="rounded-full asol-ring-secondary p-4">
        <PartyPopper className="h-12 w-12 text-secondary" />
      </div>

      <div id={id ? `${id}-div-3-ve2qbt` : undefined} className="space-y-2">
        <h1 id={id ? `${id}-heading-4-tuxqfe` : undefined} className="text-3xl font-bold">{t('onboarding.completion.title')}</h1>
        <p id={id ? `${id}-text-5-xy9zhb` : undefined} className="text-lg text-muted-foreground max-w-md">
          {t('onboarding.completion.message', { storeName })}
        </p>
      </div>

      <div id={id ? `${id}-div-6-u4dbdu` : undefined} className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" size="lg" onClick={onEdit}>
          {t('onboarding.completion.editSetup')}
        </Button>
        <Button variant="outline" size="lg" onClick={reset}>
          {t('onboarding.completion.startOver')}
        </Button>
      </div>

      <Card id={id ? `${id}-card-cb7c00` : undefined} className="w-full max-w-lg mt-8">
        <CardContent id={id ? `${id}-card-content-8ecc79` : undefined} className="p-6">
          <h3 id={id ? `${id}-heading-7-gbhvmg` : undefined} className="font-semibold mb-4">{t('onboarding.completion.summaryTitle')}</h3>
          <div id={id ? `${id}-div-8-yvjfsz` : undefined} className="space-y-3 text-sm">
            <div id={id ? `${id}-div-9-w13lxz` : undefined} className="flex justify-between">
              <span id={id ? `${id}-text-10-iekcty` : undefined} className="text-muted-foreground">{t('onboarding.completion.productsAdded')}</span>
              <span id={id ? `${id}-text-11-o86txg` : undefined} className="font-medium">{data.products.products.length}</span>
            </div>
            <div id={id ? `${id}-div-12-9zxbjx` : undefined} className="flex justify-between">
              <span id={id ? `${id}-text-13-inrupn` : undefined} className="text-muted-foreground">{t('onboarding.completion.collections')}</span>
              <span id={id ? `${id}-text-14-llkbdb` : undefined} className="font-medium">{data.collections.collections.length}</span>
            </div>
            <div id={id ? `${id}-div-15-qnvkfk` : undefined} className="flex justify-between">
              <span id={id ? `${id}-text-16-8awwoc` : undefined} className="text-muted-foreground">{t('onboarding.completion.shippingMethods')}</span>
              <span id={id ? `${id}-text-17-6rw3iy` : undefined} className="font-medium">{data.shipping.methods.length}</span>
            </div>
            <div id={id ? `${id}-div-18-5uwcin` : undefined} className="flex justify-between">
              <span id={id ? `${id}-text-19-eolczt` : undefined} className="text-muted-foreground">{t('onboarding.completion.categories')}</span>
              <span id={id ? `${id}-text-20-tnfvyp` : undefined} className="font-medium">
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
      <CompletionScreen id='features-onboarding-presentation-onboarding-page-completionscreen-21-wwlu6m' onEdit={handleStepNavigate} />
    ) : (
      <>
        <div id='features-onboarding-presentation-onboarding-page-div-22-wrgrtt' className="mb-6">
          <h2 id='features-onboarding-presentation-onboarding-page-heading-23-84joiq' className="text-2xl font-bold">{config.title}</h2>
          <p id='features-onboarding-presentation-onboarding-page-text-24-61fynw' className="text-muted-foreground">{config.description}</p>
        </div>
        <div id='features-onboarding-presentation-onboarding-page-div-25-oygjjo'
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
      <div id='features-onboarding-presentation-onboarding-page-div-26-synles' className="asol-onboarding-shell">
      <div id='features-onboarding-presentation-onboarding-page-div-27-z4hwff' className="hidden lg:block">
        <div id='features-onboarding-presentation-onboarding-page-div-28-i9r9eq' className="flex">
          <aside id='features-onboarding-presentation-onboarding-page-aside-29-i6upaa' className="w-80 min-h-screen border-r asol-onboarding-sidebar p-6 sticky top-0">
            <div id='features-onboarding-presentation-onboarding-page-div-30-we7pan' className="space-y-6">
              <div id='features-onboarding-presentation-onboarding-page-div-31-dymcxu'>
                <h1 id='features-onboarding-presentation-onboarding-page-heading-32-9cssmu' className="text-xl font-bold">{t('onboarding.page.title')}</h1>
                <p id='features-onboarding-presentation-onboarding-page-text-33-qhiajb' className="text-sm text-muted-foreground">
                  {t('onboarding.page.subtitle')}
                </p>
              </div>

              <OnboardingProgress id='features-onboarding-presentation-onboarding-page-onboardingprogress-34-drgk75' />

              <OnboardingSidebar id='features-onboarding-presentation-onboarding-page-onboardingsidebar-35-xodtkf' onStepNavigate={handleStepNavigate} />

              {isComplete && showCompletion && (
                <Button id='features-onboarding-presentation-onboarding-page-button-36-64ckom'
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowCompletion(true)}
                >
                  {t('onboarding.page.viewSuccessScreen')}
                </Button>
              )}

            </div>
          </aside>

          <main id='features-onboarding-presentation-onboarding-page-main-37-ophshy' className="flex-1 p-8 asol-onboarding-main">
            <div id='features-onboarding-presentation-onboarding-page-div-38-dcrqis' className="max-w-3xl mx-auto">{mainContent}</div>
          </main>
        </div>
      </div>

      <div id='features-onboarding-presentation-onboarding-page-div-39-hsumil' className="lg:hidden">
        <MobileOnboardingNav id='features-onboarding-presentation-onboarding-page-mobileonboardingnav-40-cascf4'
          showCompletion={isComplete && showCompletion}
          onShowCompletion={() => setShowCompletion(true)}
          onStepNavigate={handleStepNavigate}
        />

        <main id='features-onboarding-presentation-onboarding-page-main-41-mgy5ve' className="px-4 py-6">
          <div id='features-onboarding-presentation-onboarding-page-div-42-jx411y' className="max-w-2xl mx-auto">
            <div id='features-onboarding-presentation-onboarding-page-div-43-83jhkd'
              className={cn(
                'transition-opacity duration-200',
                isTransitioning ? 'opacity-0' : 'opacity-100',
              )}
            >
              {isComplete && showCompletion ? (
                <CompletionScreen id='features-onboarding-presentation-onboarding-page-completionscreen-44-z5qzoz' onEdit={handleStepNavigate} />
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
