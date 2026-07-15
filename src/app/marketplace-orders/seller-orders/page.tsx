'use client';

import React, { useState } from 'react';
import { MoreVertical, Package, Star, RefreshCw, Plus } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full asol-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.sellerOrders.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl">

<div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-xl gap-stack-lg">
<div>
<h1 className="font-headline-lg-mobile md:font-headline-xl text-headline-lg-mobile md:text-headline-xl text-primary">{t('marketplaceOrders.sellerOrders.title')}</h1>
<p className="text-on-surface-variant mt-2">{t('marketplaceOrders.sellerOrders.description')}</p>
</div>
<div className="flex gap-stack-md overflow-x-auto pb-2 md:pb-0">
<div className="bg-surface-container-low px-stack-lg py-stack-md rounded-xl border border-outline-variant min-w-[140px]">
<div className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.pendingPayout')}</div>
<div className="text-headline-md text-primary font-bold">$12,450.00</div>
</div>
<div className="bg-surface-container-low px-stack-lg py-stack-md rounded-xl border border-outline-variant min-w-[140px]">
<div className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.activeOrders')}</div>
<div className="text-headline-md text-primary font-bold">24</div>
</div>
</div>
</div>

<div className="flex border-b border-outline-variant mb-stack-lg overflow-x-auto no-scrollbar sticky top-[44px] bg-background z-40">
<button className="px-stack-lg py-stack-md text-primary border-b-2 border-primary font-bold whitespace-nowrap">{t('marketplaceOrders.sellerOrders.tabNew')} <span className="ml-1 px-2 py-0.5 bg-primary-container text-white text-[10px] rounded-full">4</span></button>
<button className="px-stack-lg py-stack-md text-on-surface-variant hover:text-primary transition-colors whitespace-nowrap">{t('marketplaceOrders.sellerOrders.tabProcessing')}</button>
<button className="px-stack-lg py-stack-md text-on-surface-variant hover:text-primary transition-colors whitespace-nowrap">{t('marketplaceOrders.sellerOrders.tabReadyShipping')}</button>
<button className="px-stack-lg py-stack-md text-on-surface-variant hover:text-primary transition-colors whitespace-nowrap">{t('marketplaceOrders.sellerOrders.tabReturns')}</button>
</div>

<div className="bento-grid">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col order-card-hover relative overflow-hidden">
<div className="absolute top-0 right-0 px-3 py-1 bg-tertiary-container text-on-tertiary-container text-[10px] font-bold rounded-bl-xl">{t('marketplaceOrders.sellerOrders.customRequest')}</div>
<div className="flex items-start justify-between mb-stack-md">
<div className="flex gap-stack-md">
<div className="w-12 h-12 rounded-lg bg-surface-container-high overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<div className="text-label-sm text-on-surface-variant">Order #GV-9012</div>
<h3 className="font-bold text-primary">Julianne Sterling</h3>
</div>
</div>
</div>
<div className="space-y-2 mb-stack-lg">
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.product')}</span>
<span className="text-body-sm font-semibold">Bespoke Industrial Components</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.quantity')}</span>
<span className="text-body-sm font-semibold">2,500 Units</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.status')}</span>
<span className="bg-primary-container/15 text-primary px-2 py-0.5 rounded text-[12px] font-bold">{t('marketplaceOrders.sellerOrders.newOrder')}</span>
</div>
</div>
<div className="mt-auto border-t border-outline-variant pt-stack-md flex justify-between items-center">
<div>
<div className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.payout')}</div>
<div className="text-body-lg font-bold text-primary">$4,200.00</div>
</div>
<button className="bg-primary text-white px-stack-lg py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">{t('marketplaceOrders.sellerOrders.viewDetails')}</button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col order-card-hover">
<div className="flex items-start justify-between mb-stack-md">
<div className="flex gap-stack-md">
<div className="w-12 h-12 rounded-lg bg-surface-container-high overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<div className="text-label-sm text-on-surface-variant">Order #GV-8944</div>
<h3 className="font-bold text-primary">Marcus Vancity</h3>
</div>
</div>
<MoreVertical className="text-on-surface-variant" data-icon="more_vert" />
</div>
<div className="space-y-2 mb-stack-lg">
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.product')}</span>
<span className="text-body-sm font-semibold">Standard Logistics Pallet (XL)</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.quantity')}</span>
<span className="text-body-sm font-semibold">120 Units</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.status')}</span>
<span className="bg-primary-container/15 text-primary px-2 py-0.5 rounded text-[12px] font-bold">{t('marketplaceOrders.sellerOrders.awaitingPrep')}</span>
</div>
</div>
<div className="mt-auto border-t border-outline-variant pt-stack-md flex justify-between items-center">
<div>
<div className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.payout')}</div>
<div className="text-body-lg font-bold text-primary">$840.50</div>
</div>
<button className="bg-primary text-white px-stack-lg py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">{t('marketplaceOrders.sellerOrders.viewDetails')}</button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col order-card-hover">
<div className="flex items-start justify-between mb-stack-md">
<div className="flex gap-stack-md">
<div className="w-12 h-12 rounded-lg bg-surface-container-high overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<div className="text-label-sm text-on-surface-variant">Order #GV-8930</div>
<h3 className="font-bold text-primary">TechLink Solutions</h3>
</div>
</div>
</div>
<div className="space-y-2 mb-stack-lg">
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.product')}</span>
<span className="text-body-sm font-semibold">Bulk Micro-Processors</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.quantity')}</span>
<span className="text-body-sm font-semibold">10 Boxes</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.status')}</span>
<span className="bg-primary-container/15 text-primary px-2 py-0.5 rounded text-[12px] font-bold">{t('marketplaceOrders.sellerOrders.verificationPending')}</span>
</div>
</div>
<div className="mt-auto border-t border-outline-variant pt-stack-md flex justify-between items-center">
<div>
<div className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.payout')}</div>
<div className="text-body-lg font-bold text-primary">$15,200.00</div>
</div>
<button className="bg-primary text-white px-stack-lg py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">{t('marketplaceOrders.sellerOrders.viewDetails')}</button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col order-card-hover">
<div className="flex items-start justify-between mb-stack-md">
<div className="flex gap-stack-md">
<div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center">
<Package className="text-primary text-3xl" data-icon="inventory_2" />
</div>
<div>
<div className="text-label-sm text-on-surface-variant">Order #GV-8891</div>
<h3 className="font-bold text-primary">Global Mart Inc.</h3>
</div>
</div>
<Star className="text-secondary" data-icon="star" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<div className="space-y-2 mb-stack-lg">
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.product')}</span>
<span className="text-body-sm font-semibold">Eco-Packaging Bundle</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.quantity')}</span>
<span className="text-body-sm font-semibold">500 Kits</span>
</div>
<div className="flex justify-between items-center">
<span className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.status')}</span>
<span className="bg-primary-container/15 text-primary px-2 py-0.5 rounded text-[12px] font-bold">{t('marketplaceOrders.sellerOrders.processing')}</span>
</div>
</div>
<div className="mt-auto border-t border-outline-variant pt-stack-md flex justify-between items-center">
<div>
<div className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.sellerOrders.payout')}</div>
<div className="text-body-lg font-bold text-primary">$3,150.25</div>
</div>
<button className="bg-primary text-white px-stack-lg py-2 rounded-lg font-bold hover:opacity-90 transition-opacity">{t('marketplaceOrders.sellerOrders.viewDetails')}</button>
</div>
</div>
</div>

<div className="mt-stack-xl flex justify-center">
<button className="flex items-center gap-2 text-primary font-bold hover:bg-surface-container-high px-6 py-3 rounded-full transition-colors">
<RefreshCw className="" data-icon="refresh" />
                {t('marketplaceOrders.sellerOrders.loadMore')}
            </button>
</div>
</main>



<button className="fixed bottom-20 right-6 md:bottom-8 md:right-8 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform z-40">
<Plus className="" data-icon="add" />
</button>
      </div>
    </div>
  );
}
