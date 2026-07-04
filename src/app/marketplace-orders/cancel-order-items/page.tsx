'use client';

import React, { useState } from 'react';
import { Package, CheckCircle2, HelpCircle, AlertTriangle, Send, Headphones } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.cancelOrderItems.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">

<div className="mb-stack-xl">
<h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-2">{t('marketplaceOrders.cancelOrderItems.cancelOrder')}</h2>
<p className="font-body-md text-body-md text-on-surface-variant">{t('marketplaceOrders.cancelOrderItems.cancelOrderDesc')}</p>
</div>
<div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">

<div className="md:col-span-8 space-y-gutter">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-sm">
<h3 className="font-label-md text-label-md text-on-surface mb-stack-md">{t('marketplaceOrders.cancelOrderItems.whatToCancel')}</h3>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
<label className="relative flex items-center p-4 border-2 border-primary bg-surface-container-low rounded-xl cursor-pointer transition-all hover:bg-surface-container">
<input defaultChecked className="hidden" name="cancel_type" type="radio" value="full"/>
<Package className="text-primary mr-3" data-icon="inventory_2" />
<div className="flex flex-col">
<span className="font-label-md text-label-md text-primary">{t('marketplaceOrders.cancelOrderItems.cancelFullOrder')}</span>
<span className="text-[12px] text-on-surface-variant">{t('marketplaceOrders.cancelOrderItems.cancelFullOrderDesc')}</span>
</div>
<CheckCircle2 className="absolute top-2 right-2  text-primary text-sm" style={{ "fontVariationSettings": "'FILL' 1" }} />
</label>
<label className="relative flex items-center p-4 border border-outline-variant bg-surface-container-lowest rounded-xl cursor-pointer transition-all hover:bg-surface-container-low">
<input className="hidden" name="cancel_type" type="radio" value="partial"/>
<HelpCircle className="text-on-surface-variant mr-3" data-icon="checklist" />
<div className="flex flex-col">
<span className="font-label-md text-label-md text-on-surface">{t('marketplaceOrders.cancelOrderItems.selectSpecificItems')}</span>
<span className="text-[12px] text-on-surface-variant">{t('marketplaceOrders.cancelOrderItems.selectSpecificItemsDesc')}</span>
</div>
</label>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
<div className="p-stack-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
<h3 className="font-label-md text-label-md text-on-surface">{t('marketplaceOrders.cancelOrderItems.reviewItems')}</h3>
<span className="bg-primary text-on-primary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" id="items-count-badge">3 {t('marketplaceOrders.cancelOrderItems.items')}</span>
</div>
<div className="divide-y divide-outline-variant">

<div className="p-stack-md flex gap-4 items-start opacity-50 transition-opacity" id="item-row-1">
<div className="pt-1">
<input defaultChecked className="w-5 h-5 rounded border-outline text-primary focus:ring-primary transition-all cursor-not-allowed selection-checkbox" disabled id="check-1" type="checkbox"/>
</div>
<div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-on-surface">Precision Workstation Pro v4</h4>
<span className="font-label-md text-label-md text-on-surface">$1,299.00</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-1">SKU: PW4-992-BLK • Qty: 1</p>
</div>
</div>

<div className="p-stack-md flex gap-4 items-start opacity-50 transition-opacity" id="item-row-2">
<div className="pt-1">
<input defaultChecked className="w-5 h-5 rounded border-outline text-primary focus:ring-primary transition-all cursor-not-allowed selection-checkbox" disabled id="check-2" type="checkbox"/>
</div>
<div className="w-16 h-16 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0 border border-outline-variant">
<HelpCircle className="text-outline" data-icon="custom_typography" />
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-on-surface">Custom Engraving Service</h4>
<span className="font-label-md text-label-md text-on-surface">$45.00</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-1">Type: Custom Service • Laser Etch "Gova Corp"</p>
</div>
</div>

<div className="p-stack-md flex gap-4 items-start opacity-50 transition-opacity" id="item-row-3">
<div className="pt-1">
<input defaultChecked className="w-5 h-5 rounded border-outline text-primary focus:ring-primary transition-all cursor-not-allowed selection-checkbox" disabled id="check-3" type="checkbox"/>
</div>
<div className="w-16 h-16 rounded-lg bg-surface-container overflow-hidden flex-shrink-0 border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-on-surface">Elite Series Headphones</h4>
<span className="font-label-md text-label-md text-on-surface">$349.00</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-1">SKU: EH-BLK-01 • Qty: 1</p>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-sm">
<h3 className="font-label-md text-label-md text-on-surface mb-stack-md">{t('marketplaceOrders.cancelOrderItems.cancellationDetails')}</h3>
<div className="space-y-stack-md">
<div>
<label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">{t('marketplaceOrders.cancelOrderItems.reason')}</label>
<select className="w-full h-touch-target rounded-lg border border-outline-variant bg-surface px-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all">
<option disabled selected value="">{t('marketplaceOrders.cancelOrderItems.selectReason')}</option>
<option value="changed_mind">{t('marketplaceOrders.cancelOrderItems.reasonChangedMind')}</option>
<option value="shipping_time">{t('marketplaceOrders.cancelOrderItems.reasonShippingTime')}</option>
<option value="price">{t('marketplaceOrders.cancelOrderItems.reasonPrice')}</option>
<option value="error">{t('marketplaceOrders.cancelOrderItems.reasonError')}</option>
<option value="other">{t('marketplaceOrders.cancelOrderItems.reasonOther')}</option>
</select>
</div>
<div>
<label className="block text-label-sm font-label-sm text-on-surface-variant mb-2">{t('marketplaceOrders.cancelOrderItems.additionalComments')}</label>
<textarea className="w-full rounded-lg border border-outline-variant bg-surface p-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none" placeholder={t('marketplaceOrders.cancelOrderItems.tellUsMore')} rows={3}></textarea>
</div>
</div>
</div>
</div>

<div className="md:col-span-4">
<div className="sticky top-24 space-y-gutter">
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md shadow-sm">
<h3 className="font-label-md text-label-md text-primary mb-stack-md flex items-center gap-2">
<HelpCircle className="text-[20px]" data-icon="account_balance_wallet" />
                            {t('marketplaceOrders.cancelOrderItems.impactSummary')}
                        </h3>
<div className="space-y-stack-sm mb-stack-md border-b border-outline-variant pb-stack-md">
<div className="flex justify-between text-body-sm text-on-surface-variant">
<span>{t('marketplaceOrders.cancelOrderItems.selectedItemsValue')}</span>
<span>$1,693.00</span>
</div>
<div className="flex justify-between text-body-sm text-on-surface-variant">
<span>{t('marketplaceOrders.cancelOrderItems.taxRefund')}</span>
<span>$135.44</span>
</div>
<div className="flex justify-between text-body-sm text-on-surface-variant" id="shipping-refund-row">
<span>{t('marketplaceOrders.cancelOrderItems.shippingRefund')}</span>
<span>$25.00</span>
</div>
</div>
<div className="flex justify-between items-center mb-stack-lg">
<span className="font-headline-md text-headline-md text-on-surface">{t('marketplaceOrders.cancelOrderItems.totalRefund')}</span>
<div className="text-right">
<span className="font-headline-md text-headline-md text-secondary" id="total-refund-amount">$1,853.44</span>
<p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">{t('marketplaceOrders.cancelOrderItems.creditedTo')}</p>
</div>
</div>
<div className="p-3 bg-error-container/15 rounded-lg border border-error/20 mb-stack-lg">
<div className="flex gap-2">
<AlertTriangle className="text-error text-[20px]" data-icon="warning" />
<p className="text-body-sm text-on-error-container leading-tight">
<strong>{t('marketplaceOrders.cancelOrderItems.cancellationPermanent')}</strong> You cannot undo this action or reclaim these items once submitted.
                                </p>
</div>
</div>
<button className="w-full h-[52px] bg-primary text-on-primary rounded-xl font-label-md text-label-md shadow-lg shadow-primary/20 hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            {t('marketplaceOrders.cancelOrderItems.submitCancellation')}
                            <Send className="text-[20px]" data-icon="send" />
</button>
<button className="w-full h-touch-target mt-2 text-on-surface-variant font-label-md text-label-md hover:text-primary transition-colors">
                            {t('marketplaceOrders.cancelOrderItems.keepMyOrder')}
                        </button>
</div>

<div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
<Headphones className="text-primary" data-icon="support_agent" />
</div>
<div>
<h4 className="text-label-sm font-label-sm text-on-surface">{t('marketplaceOrders.cancelOrderItems.needHelp')}</h4>
<p className="text-[12px] text-on-surface-variant">{t('marketplaceOrders.cancelOrderItems.chatSupport')}</p>
</div>
</div>
</div>
</div>
</div>
</main>
      </div>
    </div>
  );
}
