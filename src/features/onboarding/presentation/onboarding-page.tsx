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
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.12-WqIJ70", id: "onboarding.onboarding-page.div.12" })} id={id} className="flex flex-col items-center justify-center py-16 text-center space-y-6 animate-in fade-in duration-500">
      <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.13-Ws1CJg", id: "onboarding.onboarding-page.div.13" })} className="rounded-full asol-ring-secondary p-4">
        <PartyPopper className="h-12 w-12 text-secondary" />
      </div>

      <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.14-UQAS6n", id: "onboarding.onboarding-page.div.14" })} className="space-y-2">
        <h1 {...uiAttributes({ uid: "onboarding.onboarding-page.h1.2-C9ttSb", id: "onboarding.onboarding-page.h1.2" })} className="text-3xl font-bold">{t('onboarding.completion.title')}</h1>
        <p {...uiAttributes({ uid: "onboarding.onboarding-page.p.3-Wst3NP", id: "onboarding.onboarding-page.p.3" })} className="text-lg text-muted-foreground max-w-md">
          {t('onboarding.completion.message', { storeName })}
        </p>
      </div>

      <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.15-ZR9VMT", id: "onboarding.onboarding-page.div.15" })} className="flex flex-col sm:flex-row gap-3">
        <Button ui={{ uid: 'onboarding.completion.edit-setup-N0TT38', id: 'onboarding.completion.edit-setup', kind: 'action', action: 'edit-setup', part: 'completion' }} variant="outline" size="lg" onClick={onEdit}>
          {t('onboarding.completion.editSetup')}
        </Button>
        <Button ui={{ uid: 'onboarding.completion.start-over-d3T20G', id: 'onboarding.completion.start-over', kind: 'action', action: 'reset-onboarding', part: 'completion' }} variant="outline" size="lg" onClick={reset}>
          {t('onboarding.completion.startOver')}
        </Button>
      </div>

      <Card ui={{ uid: "onboarding.onboarding-page.card-ruqUG8", id: "onboarding.onboarding-page.card" }} className="w-full max-w-lg mt-8">
        <CardContent ui={{ uid: "onboarding.onboarding-page.card-content-5ECeeR", id: "onboarding.onboarding-page.card-content" }} className="p-6">
          <h3 {...uiAttributes({ uid: "onboarding.onboarding-page.h3-K0pBa7", id: "onboarding.onboarding-page.h3" })} className="font-semibold mb-4">{t('onboarding.completion.summaryTitle')}</h3>
          <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.16-CNop40", id: "onboarding.onboarding-page.div.16" })} className="space-y-3 text-sm">
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.17-4J5YvP", id: "onboarding.onboarding-page.div.17" })} className="flex justify-between">
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span-QdMc4m", id: "onboarding.onboarding-page.span" })} className="text-muted-foreground">{t('onboarding.completion.productsAdded')}</span>
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.2-eVC1sQ", id: "onboarding.onboarding-page.span.2" })} className="font-medium">{data.products.products.length}</span>
            </div>
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.18-eSC7Mb", id: "onboarding.onboarding-page.div.18" })} className="flex justify-between">
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.3-8AbupE", id: "onboarding.onboarding-page.span.3" })} className="text-muted-foreground">{t('onboarding.completion.collections')}</span>
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.4-yjS3t6", id: "onboarding.onboarding-page.span.4" })} className="font-medium">{data.collections.collections.length}</span>
            </div>
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.19-LEXOF2", id: "onboarding.onboarding-page.div.19" })} className="flex justify-between">
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.5-XNG46Q", id: "onboarding.onboarding-page.span.5" })} className="text-muted-foreground">{t('onboarding.completion.shippingMethods')}</span>
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.6-Tl5D1I", id: "onboarding.onboarding-page.span.6" })} className="font-medium">{data.shipping.methods.length}</span>
            </div>
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.20-rS9qTr", id: "onboarding.onboarding-page.div.20" })} className="flex justify-between">
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.7-0b7UL7", id: "onboarding.onboarding-page.span.7" })} className="text-muted-foreground">{t('onboarding.completion.categories')}</span>
              <span {...uiAttributes({ uid: "onboarding.onboarding-page.span.8-R1MvDH", id: "onboarding.onboarding-page.span.8" })} className="font-medium">
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
      <CompletionScreen id="onboarding.onboarding-page.completion-screen" onEdit={handleStepNavigate} />
    ) : (
      <>
        <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.21-9CQsuv", id: "onboarding.onboarding-page.div.21" })} id="onboarding.onboarding-page.div" className="mb-6">
          <h2 {...uiAttributes({ uid: "onboarding.onboarding-page.h2.2-sKGL4p", id: "onboarding.onboarding-page.h2.2" })} id="onboarding.onboarding-page.h2" className="text-2xl font-bold">{config.title}</h2>
          <p {...uiAttributes({ uid: "onboarding.onboarding-page.p.4-A0yK5B", id: "onboarding.onboarding-page.p.4" })} id="onboarding.onboarding-page.p" className="text-muted-foreground">{config.description}</p>
        </div>
        <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.22-JRn1ns", id: "onboarding.onboarding-page.div.22" })} id="onboarding.onboarding-page.div.2"
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
      <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.23-JoAA45", id: "onboarding.onboarding-page.div.23" })} id="onboarding.onboarding-page.div.3" className="asol-onboarding-shell">
      <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.24-cUEq7p", id: "onboarding.onboarding-page.div.24" })} id="onboarding.onboarding-page.div.4" className="hidden lg:block">
        <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.25-uMa7fV", id: "onboarding.onboarding-page.div.25" })} id="onboarding.onboarding-page.div.5" className="flex">
          <aside {...uiAttributes({ uid: "onboarding.onboarding-page.aside.2-IlrsB9", id: "onboarding.onboarding-page.aside.2" })} id="onboarding.onboarding-page.aside" className="w-80 min-h-screen border-r asol-onboarding-sidebar p-6 sticky top-0">
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.26-EG8n8t", id: "onboarding.onboarding-page.div.26" })} id="onboarding.onboarding-page.div.6" className="space-y-6">
              <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.27-WSocD0", id: "onboarding.onboarding-page.div.27" })} id="onboarding.onboarding-page.div.7">
                <h1 {...uiAttributes({ uid: "onboarding.onboarding-page.h1.3-M4ZZDi", id: "onboarding.onboarding-page.h1.3" })} id="onboarding.onboarding-page.h1" className="text-xl font-bold">{t('onboarding.page.title')}</h1>
                <p {...uiAttributes({ uid: "onboarding.onboarding-page.p.5-eYigY6", id: "onboarding.onboarding-page.p.5" })} id="onboarding.onboarding-page.p.2" className="text-sm text-muted-foreground">
                  {t('onboarding.page.subtitle')}
                </p>
              </div>

              <OnboardingProgress id="onboarding.onboarding-page.onboarding-progress" />

              <OnboardingSidebar id="onboarding.onboarding-page.onboarding-sidebar" onStepNavigate={handleStepNavigate} />

              {isComplete && showCompletion && (
                <Button id="onboarding.onboarding-page.button" ui={{ uid: 'onboarding.page.show-completion-zSW5qt', id: 'onboarding.page.show-completion', kind: 'action', action: 'show-completion', part: 'footer' }}
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowCompletion(true)}
                >
                  {t('onboarding.page.viewSuccessScreen')}
                </Button>
              )}

            </div>
          </aside>

          <main {...uiAttributes({ uid: "onboarding.onboarding-page.main.3-6Al1gS", id: "onboarding.onboarding-page.main.3" })} id="onboarding.onboarding-page.main" className="flex-1 p-8 asol-onboarding-main">
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.28-8ZLa4S", id: "onboarding.onboarding-page.div.28" })} id="onboarding.onboarding-page.div.8" className="max-w-3xl mx-auto">{mainContent}</div>
          </main>
        </div>
      </div>

      <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.29-14GMy4", id: "onboarding.onboarding-page.div.29" })} id="onboarding.onboarding-page.div.9" className="lg:hidden">
        <MobileOnboardingNav id="onboarding.onboarding-page.mobile-onboarding-nav"
          showCompletion={isComplete && showCompletion}
          onShowCompletion={() => setShowCompletion(true)}
          onStepNavigate={handleStepNavigate}
        />

        <main {...uiAttributes({ uid: "onboarding.onboarding-page.main.4-hpVl8A", id: "onboarding.onboarding-page.main.4" })} id="onboarding.onboarding-page.main.2" className="px-4 py-6">
          <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.30-RRy8Pb", id: "onboarding.onboarding-page.div.30" })} id="onboarding.onboarding-page.div.10" className="max-w-2xl mx-auto">
            <div {...uiAttributes({ uid: "onboarding.onboarding-page.div.31-JH2kX3", id: "onboarding.onboarding-page.div.31" })} id="onboarding.onboarding-page.div.11"
              className={cn(
                'transition-opacity duration-200',
                isTransitioning ? 'opacity-0' : 'opacity-100',
              )}
            >
              {isComplete && showCompletion ? (
                <CompletionScreen id="onboarding.onboarding-page.completion-screen.2" onEdit={handleStepNavigate} />
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
