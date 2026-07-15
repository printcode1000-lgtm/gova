'use client';

import React, { useState } from 'react';
import { Check, HelpCircle, Truck, CreditCard, ChevronRight } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full asol-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.buyerCartCheckout.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg pb-32">

<div className="mb-stack-xl">
<div className="flex items-center justify-between relative">
<div className="absolute top-1/2 left-0 w-full h-[2px] bg-outline-variant -z-10 -translate-y-1/2"></div>
<div className="flex flex-col items-center gap-2">
<div className="w-8 h-8 rounded-full step-indicator-complete flex items-center justify-center font-bold text-label-sm">
<Check className="text-[18px]"  />
</div>
<span className="text-label-sm font-label-sm text-secondary">{t('marketplaceOrders.buyerCartCheckout.cart')}</span>
</div>
<div className="flex flex-col items-center gap-2">
<div className="w-8 h-8 rounded-full step-indicator-active flex items-center justify-center font-bold text-label-sm">2</div>
<span className="text-label-sm font-label-sm text-primary">{t('marketplaceOrders.buyerCartCheckout.checkout')}</span>
</div>
<div className="flex flex-col items-center gap-2">
<div className="w-8 h-8 rounded-full step-indicator-pending flex items-center justify-center font-bold text-label-sm">3</div>
<span className="text-label-sm font-label-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.payment')}</span>
</div>
</div>
</div>
<h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-stack-lg">{t('marketplaceOrders.buyerCartCheckout.reviewOrder')}</h1>

<section className="space-y-stack-lg mb-stack-xl">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
<div className="px-gutter py-stack-sm bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
<div className="flex items-center gap-2">
<HelpCircle className="text-primary" style={{ "fontVariationSettings": "'FILL' 1" }} />
<span className="font-label-md text-label-md text-primary">Global Logistics Hub</span>
</div>
<span className="text-label-sm font-label-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.sellerId')}: #GLH-092</span>
</div>
<div className="p-gutter space-y-stack-md">

<div className="flex gap-gutter">
<div className="w-20 h-20 bg-surface-container-high rounded-lg overflow-hidden flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h3 className="font-headline-md text-headline-md text-on-surface leading-tight">Bio-Agent Vaccine Crates</h3>
<span className="font-bold text-on-surface">$1,240.00</span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant mb-2">{t('marketplaceOrders.buyerCartCheckout.unitSize')}: 50L x 4</p>
<div className="flex items-center gap-2 px-2 py-1 bg-error-container text-on-error-container rounded-md w-fit">
<HelpCircle className="text-[14px]"  />
<span className="text-label-sm font-label-sm">{t('marketplaceOrders.buyerCartCheckout.refrigerationRequired')}</span>
</div>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
<div className="px-gutter py-stack-sm bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
<div className="flex items-center gap-2">
<HelpCircle className="text-primary" style={{ "fontVariationSettings": "'FILL' 1" }} />
<span className="font-label-md text-label-md text-primary">Nordic Tech Supplies</span>
</div>
<span className="text-label-sm font-label-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.sellerId')}: #NTS-441</span>
</div>
<div className="p-gutter space-y-stack-md">

<div className="flex gap-gutter">
<div className="w-20 h-20 bg-surface-container-high rounded-lg overflow-hidden flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h3 className="font-headline-md text-headline-md text-on-surface leading-tight">Quantum Rack Servers</h3>
<span className="font-bold text-on-surface">$4,800.00</span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant mb-2">{t('marketplaceOrders.buyerCartCheckout.quantity')}: 2 Units</p>
<div className="flex items-center gap-2 px-2 py-1 bg-secondary-container text-on-secondary-container rounded-md w-fit">
<HelpCircle className="text-[14px]"  />
<span className="text-label-sm font-label-sm">{t('marketplaceOrders.buyerCartCheckout.fragilePaddedHandling')}</span>
</div>
</div>
</div>
</div>
</div>
</section>

<section className="mb-stack-xl">
<h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">{t('marketplaceOrders.buyerCartCheckout.shippingMethod')}</h2>
<div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
<label className="relative flex flex-col p-gutter border-2 border-primary rounded-xl bg-primary-container/10 cursor-pointer">
<input defaultChecked className="absolute top-4 right-4 text-primary" name="shipping" type="radio" value="standard"/>
<Truck className="text-primary mb-2"  />
<span className="font-label-md text-label-md text-primary">{t('marketplaceOrders.buyerCartCheckout.standard')}</span>
<span className="text-body-sm font-body-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.standardDesc')}</span>
<span className="mt-2 font-bold text-on-surface">$45.00</span>
</label>
<label className="relative flex flex-col p-gutter border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer">
<input className="absolute top-4 right-4 text-primary" name="shipping" type="radio" value="express"/>
<HelpCircle className="text-on-surface-variant mb-2"  />
<span className="font-label-md text-label-md text-on-surface">{t('marketplaceOrders.buyerCartCheckout.express')}</span>
<span className="text-body-sm font-body-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.expressDesc')}</span>
<span className="mt-2 font-bold text-on-surface">$120.00</span>
</label>
<label className="relative flex flex-col p-gutter border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer">
<input className="absolute top-4 right-4 text-primary" name="shipping" type="radio" value="special"/>
<HelpCircle className="text-on-surface-variant mb-2"  />
<span className="font-label-md text-label-md text-on-surface">{t('marketplaceOrders.buyerCartCheckout.specialVehicle')}</span>
<span className="text-body-sm font-body-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.specialVehicleDesc')}</span>
<span className="mt-2 font-bold text-on-surface">$250.00</span>
</label>
</div>
</section>

<section className="mb-stack-xl">
<h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">{t('marketplaceOrders.buyerCartCheckout.paymentDetails')}</h2>
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter space-y-stack-md">
<div className="flex items-center gap-4 p-4 border border-outline-variant rounded-lg cursor-pointer hover:border-primary transition-all">
<div className="w-12 h-8 bg-surface-container-high rounded flex items-center justify-center">
<HelpCircle className="text-primary"  />
</div>
<div className="flex-grow">
<p className="font-label-md text-label-md">{t('marketplaceOrders.buyerCartCheckout.electronicTransfer')}</p>
<p className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.electronicTransferDesc')}</p>
</div>
<HelpCircle className="text-primary" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<div className="flex items-center gap-4 p-4 border border-outline-variant rounded-lg cursor-pointer hover:border-primary transition-all">
<div className="w-12 h-8 bg-surface-container-high rounded flex items-center justify-center">
<CreditCard className="text-on-surface-variant"  />
</div>
<div className="flex-grow">
<p className="font-label-md text-label-md">{t('marketplaceOrders.buyerCartCheckout.cashOnDelivery')}</p>
<p className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.cashOnDeliveryDesc')}</p>
</div>
<HelpCircle className="text-outline"  />
</div>
</div>
</section>

<section>
<h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">{t('marketplaceOrders.buyerCartCheckout.orderSummary')}</h2>
<div className="bg-surface-container-low rounded-xl p-gutter zebra-list">
<div className="flex justify-between py-2 px-2 rounded">
<span className="text-body-md font-body-md text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.subtotal')}</span>
<span className="text-body-md font-body-md font-bold">$6,040.00</span>
</div>
<div className="flex justify-between py-2 px-2 rounded text-secondary">
<span className="text-body-md font-body-md">{t('marketplaceOrders.buyerCartCheckout.bulkDiscount')}</span>
<span className="text-body-md font-body-md font-bold">-$150.00</span>
</div>
<div className="flex justify-between py-2 px-2 rounded">
<span className="text-body-md font-body-md text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.shipping')} ({t('marketplaceOrders.buyerCartCheckout.standard')})</span>
<span className="text-body-md font-body-md font-bold">$45.00</span>
</div>
<div className="flex justify-between py-2 px-2 rounded">
<span className="text-body-md font-body-md text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.taxes')}</span>
<span className="text-body-md font-body-md font-bold">$471.20</span>
</div>
<div className="flex justify-between py-2 px-2 rounded">
<span className="text-body-md font-body-md text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.marketplaceFees')}</span>
<span className="text-body-md font-body-md font-bold">$25.00</span>
</div>
<div className="h-px bg-outline-variant my-stack-sm"></div>
<div className="flex justify-between py-2 px-2 rounded text-primary">
<span className="font-headline-md text-headline-md">{t('marketplaceOrders.buyerCartCheckout.grandTotal')}</span>
<span className="font-headline-md text-headline-md font-extrabold">$6,431.20</span>
</div>
</div>
</section>
</main>

<footer className="fixed bottom-0 left-0 w-full bg-surface border-t border-outline-variant z-50 px-margin-mobile py-4 md:px-margin-desktop shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
<div className="max-w-4xl mx-auto flex items-center justify-between gap-gutter">
<div className="flex flex-col">
<span className="text-label-sm font-label-sm text-on-surface-variant">{t('marketplaceOrders.buyerCartCheckout.totalPayable')}</span>
<span className="text-headline-md font-headline-md font-extrabold text-primary">$6,431.20</span>
</div>
<button className="bg-primary text-on-primary font-label-md text-label-md px-8 h-12 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-95" onClick={() => undefined}>
                {t('marketplaceOrders.buyerCartCheckout.confirmOrder')}
                <ChevronRight className="text-[18px]"  />
</button>
</div>
</footer>
      </div>
    </div>
  );
}
