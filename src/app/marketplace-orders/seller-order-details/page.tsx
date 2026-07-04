'use client';

import React, { useState } from 'react';
import { MessageSquare, HelpCircle, Check, Truck, ShieldCheck } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.sellerOrderDetails.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl pb-32">

<section className="mb-stack-xl flex flex-col md:flex-row md:justify-between md:items-end gap-stack-md">
<div>
<div className="flex items-center gap-stack-sm mb-stack-xs">
<span className="px-stack-sm py-0.5 bg-secondary-container/15 text-on-secondary-container text-label-sm rounded-full">{t('marketplaceOrders.sellerOrderDetails.activeOrder')}</span>
<span className="text-body-sm text-on-surface-variant font-medium">#ORD-88294-GV</span>
</div>
<h2 className="font-headline-lg text-headline-lg text-on-background">{t('marketplaceOrders.sellerOrderDetails.orderDetails')}</h2>
<p className="text-body-md text-on-surface-variant mt-1">{t('marketplaceOrders.sellerOrderDetails.customerInfo')}</p>
</div>
<div className="flex gap-stack-md">
<button className="px-stack-lg h-touch-target border border-outline text-on-surface font-label-md rounded-xl hover:bg-surface-container-high transition-all flex items-center gap-2">
<MessageSquare className="text-[20px]"  />
                    {t('marketplaceOrders.sellerOrderDetails.contactBuyer')}
                </button>
</div>
</section>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

<div className="lg:col-span-2 space-y-gutter">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<div className="flex items-start justify-between mb-stack-md">
<div className="flex items-center gap-stack-md">
<div className="w-12 h-12 bg-tertiary-fixed-dim/20 rounded-xl flex items-center justify-center">
<HelpCircle className="text-tertiary text-[28px]"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md">{t('marketplaceOrders.sellerOrderDetails.customFabricRequest')}</h3>
<p className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrderDetails.pendingPricing')}</p>
</div>
</div>
<span className="px-stack-md py-1 bg-tertiary-fixed-dim/30 text-tertiary font-label-sm rounded-full">{t('marketplaceOrders.sellerOrderDetails.newRequest')}</span>
</div>
<div className="bg-surface-container-low rounded-lg p-stack-md mb-stack-lg">
<p className="text-body-md text-on-surface italic">"Need a high-tensile waterproof variant of the standard 500D nylon for marine applications. Quantity: 200 yards."</p>
</div>
<div className="flex flex-col md:flex-row gap-stack-md">
<div className="flex-1">
<label className="block text-label-sm text-on-surface-variant mb-1">{t('marketplaceOrders.sellerOrderDetails.proposedPrice')}</label>
<div className="relative">
<span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
<input className="w-full pl-8 h-touch-target border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="0.00" type="number"/>
</div>
</div>
<div className="flex items-end gap-stack-sm">
<button className="h-touch-target px-stack-xl bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 transition-all flex-1 md:flex-none">
                                {t('marketplaceOrders.sellerOrderDetails.sendPriceOffer')}
                            </button>
<button className="h-touch-target px-stack-md border border-error text-error font-label-md rounded-xl hover:bg-error-container/10 transition-all">
                                {t('marketplaceOrders.sellerOrderDetails.reject')}
                            </button>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
<div className="px-stack-lg py-stack-md border-b border-outline-variant flex justify-between items-center">
<h3 className="font-headline-md text-headline-md">{t('marketplaceOrders.sellerOrderDetails.allocatedItems')}</h3>
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrderDetails.merchantId')}</span>
</div>
<div className="divide-y divide-outline-variant">

<div className="p-stack-lg flex items-center gap-stack-lg">
<div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-1">
<div className="flex justify-between">
<h4 className="font-label-md text-on-surface">Tactical Nylon 500D - Midnight Blue</h4>
<p className="font-bold text-on-surface">$1,240.00</p>
</div>
<p className="text-body-sm text-on-surface-variant">Qty: 50 rolls • $24.80/unit</p>
<div className="mt-stack-sm flex gap-stack-sm">
<span className="px-2 py-0.5 bg-secondary-container/15 text-on-secondary-container text-[11px] font-bold rounded uppercase">{t('marketplaceOrders.sellerOrderDetails.inStock')}</span>
</div>
</div>
</div>

<div className="p-stack-lg flex items-center gap-stack-lg">
<div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-1">
<div className="flex justify-between">
<h4 className="font-label-md text-on-surface">Zinc-Plated Steel Cargo Buckles</h4>
<p className="font-bold text-on-surface">$450.00</p>
</div>
<p className="text-body-sm text-on-surface-variant">Qty: 300 units • $1.50/unit</p>
<div className="mt-stack-sm">
<span className="px-2 py-0.5 bg-secondary-container/15 text-on-secondary-container text-[11px] font-bold rounded uppercase">{t('marketplaceOrders.sellerOrderDetails.readyToShip')}</span>
</div>
</div>
</div>
</div>
<div className="p-stack-lg bg-surface-container-low flex justify-between items-center">
<span className="font-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.sellerOrderDetails.earningsSubtotal')}</span>
<span className="font-headline-md text-primary">$1,690.00</span>
</div>
</div>
</div>

<div className="space-y-gutter">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h3 className="font-headline-md text-headline-md mb-stack-lg">{t('marketplaceOrders.sellerOrderDetails.shipmentLogistics')}</h3>
<div className="space-y-stack-lg">

<div className="flex gap-stack-md">
<div className="flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center z-10">
<Check className="text-on-secondary-container text-[18px]"  />
</div>
<div className="w-0.5 h-12 bg-secondary-container -mt-1"></div>
</div>
<div className="pt-1">
<p className="font-label-md text-on-surface">{t('marketplaceOrders.sellerOrderDetails.orderConfirmed')}</p>
<p className="text-body-sm text-on-surface-variant">Oct 24, 10:45 AM</p>
</div>
</div>

<div className="flex gap-stack-md">
<div className="flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
<div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
</div>
<div className="w-0.5 h-12 bg-outline-variant -mt-1"></div>
</div>
<div className="pt-1">
<p className="font-label-md text-primary">{t('marketplaceOrders.sellerOrderDetails.awaitingPickup')}</p>
<p className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrderDetails.warehouse')}</p>
</div>
</div>

<div className="flex gap-stack-md opacity-50">
<div className="flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline flex items-center justify-center z-10">
<span className="text-label-sm">3</span>
</div>
</div>
<div className="pt-1">
<p className="font-label-md text-on-surface">{t('marketplaceOrders.sellerOrderDetails.inTransit')}</p>
<p className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrderDetails.pendingCarrier')}</p>
</div>
</div>
</div>
<div className="mt-stack-xl pt-stack-xl border-t border-outline-variant">
<div className="flex items-center gap-stack-sm mb-stack-md">
<Truck className="text-on-surface-variant"  />
<span className="font-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrderDetails.carrier')}</span>
</div>
<button className="w-full h-touch-target border-2 border-primary text-primary font-bold rounded-xl hover:bg-primary-container/10 transition-all">
                            {t('marketplaceOrders.sellerOrderDetails.printLabels')}
                        </button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h4 className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-stack-md">{t('marketplaceOrders.sellerOrderDetails.buyerProfile')}</h4>
<div className="flex items-center gap-stack-md">
<div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<p className="font-headline-md text-headline-md">Alexander Vance</p>
<div className="flex items-center text-secondary text-label-sm">
<ShieldCheck className="text-[14px]"  />
<span className="ml-1">{t('marketplaceOrders.sellerOrderDetails.verifiedBuyer')}</span>
</div>
</div>
</div>
<div className="mt-stack-lg pt-stack-md border-t border-outline-variant space-y-stack-sm">
<div className="flex justify-between">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrderDetails.shipTo')}</span>
<span className="text-body-sm text-on-surface font-medium text-right">882 Industrial Pkwy,<br/>Chicago, IL 60611</span>
</div>
</div>
</div>
</div>
</div>
</main>

<div className="fixed bottom-24 right-6 md:right-12 z-50">
<button className="bg-inverse-surface text-inverse-on-surface flex items-center gap-2 px-6 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all">
<HelpCircle className=""  />
<span className="font-label-md">{t('marketplaceOrders.sellerOrderDetails.switchView')}</span>
</button>
</div>
      </div>
    </div>
  );
}
