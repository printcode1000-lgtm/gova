'use client';

import React, { useState } from 'react';
import { ShoppingBag, HelpCircle, Search, Filter, Calendar, Package, ArrowRight, Truck, AlertTriangle, ScrollText } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full asol-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.myOrders.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex flex-col h-full w-80 bg-surface-container-low border-r border-outline-variant transition-all duration-300 ease-in-out">
<div className="p-stack-lg flex flex-col gap-1">
<div className="flex items-center gap-3 mb-stack-xl px-4">
<div className="w-12 h-12 rounded-full overflow-hidden bg-primary-fixed">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<p className="font-body-md text-on-surface font-bold">Asol User</p>
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.myOrders.roleSwitcher')}</p>
</div>
</div>
<nav className="flex flex-col gap-2">
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-all flex items-center gap-3" href="#">
<ShoppingBag className=""  />
<span className="font-body-md">{t('marketplaceOrders.myOrders.roleSwitcher')}</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-all flex items-center gap-3" href="#">
<HelpCircle className=""  />
<span className="font-body-md">{t('marketplaceOrders.sellerCustomRequests.dashboard')}</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-all flex items-center gap-3" href="#">
<HelpCircle className=""  />
<span className="font-body-md">{t('marketplaceOrders.assignedShipments.carrierPortal')}</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-all flex items-center gap-3" href="#">
<HelpCircle className=""  />
<span className="font-body-md">{t('marketplaceOrders.adminDisputes.adminPanel')}</span>
</a>
</nav>
</div>
<div className="mt-auto p-4 text-center">
<span className="text-label-sm text-outline">v1.0.4</span>
</div>
</aside>
<main className="md:ml-80 transition-all duration-300">

<div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-lg mb-stack-xl">
<div>
<h2 className="font-headline-lg-mobile md:font-headline-xl text-headline-lg-mobile md:text-headline-xl text-on-surface">{t('marketplaceOrders.myOrders.title')}</h2>
<p className="text-body-md text-on-surface-variant mt-1">{t('marketplaceOrders.myOrders.description')}</p>
</div>
<div className="flex items-center gap-2 w-full md:w-auto">
<div className="relative flex-grow md:w-64">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"  />
<input className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md" placeholder={t('marketplaceOrders.myOrders.searchOrders')} type="text"/>
</div>
<button className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-colors text-body-md">
<Filter className=""  />
<span>{t('marketplaceOrders.myOrders.filters')}</span>
</button>
</div>
</div>

<div className="flex border-b border-outline-variant overflow-x-auto no-scrollbar gap-stack-lg mb-stack-xl scroll-smooth">
<button className="relative pb-3 px-1 text-primary font-bold whitespace-nowrap tab-active">{t('marketplaceOrders.myOrders.all')}</button>
<button className="relative pb-3 px-1 text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors">{t('marketplaceOrders.myOrders.processing')}</button>
<button className="relative pb-3 px-1 text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors">{t('marketplaceOrders.myOrders.shipped')}</button>
<button className="relative pb-3 px-1 text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors">{t('marketplaceOrders.myOrders.returns')}</button>
<button className="relative pb-3 px-1 text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors">{t('marketplaceOrders.myOrders.disputes')}</button>
<button className="relative pb-3 px-1 text-on-surface-variant hover:text-primary whitespace-nowrap transition-colors">{t('marketplaceOrders.myOrders.closed')}</button>
</div>

<div className="grid grid-cols-1 gap-gutter">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-stack-lg hover:shadow-lg transition-all group">
<div className="flex flex-col md:flex-row gap-stack-lg">
<div className="flex-grow">
<div className="flex flex-wrap items-center justify-between gap-2 mb-stack-sm">
<div className="flex items-center gap-stack-sm">
<span className="font-headline-md text-headline-md text-on-surface">Order #GVA-88219</span>
<span className="bg-primary-container/15 text-primary-container px-3 py-1 rounded-full text-label-sm font-bold">{t('marketplaceOrders.myOrders.custom')}</span>
</div>
<span className="bg-tertiary-container text-tertiary-fixed-dim px-3 py-1 rounded-full text-label-sm font-bold flex items-center gap-1">
<HelpCircle className="text-[16px]"  /> {t('marketplaceOrders.myOrders.processing')}
                                </span>
</div>
<div className="flex items-center gap-stack-xl text-body-md text-on-surface-variant mb-stack-md">
<div className="flex items-center gap-1"><Calendar className="text-[18px]"  /> Oct 12, 2023</div>
<div className="flex items-center gap-1"><Package className="text-[18px]"  /> 1 {t('marketplaceOrders.myOrders.item')}</div>
</div>
<div className="flex items-center gap-3 mb-stack-lg">
<div className="w-20 h-20 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-high">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<p className="font-bold text-on-surface">Custom Precision Keyboard</p>
<p className="text-body-sm text-on-surface-variant">Request ID: REQ-449</p>
</div>
</div>
</div>
<div className="flex flex-col justify-between items-end gap-stack-md md:min-w-[180px]">
<div className="text-right">
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.myOrders.grandTotal')}</p>
<p className="text-headline-md font-bold text-primary">$1,240.00</p>
</div>
<button className="w-full md:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {t('marketplaceOrders.myOrders.viewDetails')}
                                <ArrowRight className=""  />
</button>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-stack-lg hover:shadow-lg transition-all">
<div className="flex flex-col md:flex-row gap-stack-lg">
<div className="flex-grow">
<div className="flex flex-wrap items-center justify-between gap-2 mb-stack-sm">
<div className="flex items-center gap-stack-sm">
<span className="font-headline-md text-headline-md text-on-surface">Order #GVA-88102</span>
<span className="bg-secondary-container/15 text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-bold">{t('marketplaceOrders.myOrders.mixed')}</span>
</div>
<span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-bold flex items-center gap-1">
<Truck className="text-[16px]"  /> {t('marketplaceOrders.myOrders.shipped')}
                                </span>
</div>
<div className="flex items-center gap-stack-xl text-body-md text-on-surface-variant mb-stack-md">
<div className="flex items-center gap-1"><Calendar className="text-[18px]"  /> Oct 10, 2023</div>
<div className="flex items-center gap-1"><Package className="text-[18px]"  /> 3 {t('marketplaceOrders.myOrders.items')}</div>
</div>
<div className="flex -space-x-3 mb-stack-lg">
<div className="w-14 h-14 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-container-high z-30">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-14 h-14 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-container-high z-20">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-14 h-14 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-container-high z-10 flex items-center justify-center text-label-sm font-bold text-on-surface-variant">
                                    +1
                                </div>
</div>
</div>
<div className="flex flex-col justify-between items-end gap-stack-md md:min-w-[180px]">
<div className="text-right">
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.myOrders.grandTotal')}</p>
<p className="text-headline-md font-bold text-primary">$842.50</p>
</div>
<button className="w-full md:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {t('marketplaceOrders.myOrders.viewDetails')}
                                <ArrowRight className=""  />
</button>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 md:p-stack-lg hover:shadow-lg transition-all border-l-4 border-l-error" id="dispute-order">
<div className="flex flex-col md:flex-row gap-stack-lg">
<div className="flex-grow">
<div className="flex flex-wrap items-center justify-between gap-2 mb-stack-sm">
<div className="flex items-center gap-stack-sm">
<span className="font-headline-md text-headline-md text-on-surface">Order #GVA-87994</span>
<span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-label-sm font-bold">{t('marketplaceOrders.myOrders.product')}</span>
</div>
<span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-label-sm font-bold flex items-center gap-1">
<AlertTriangle className="text-[16px]"  /> {t('marketplaceOrders.myOrders.disputes')}
                                </span>
</div>
<div className="flex items-center gap-stack-xl text-body-md text-on-surface-variant mb-stack-md">
<div className="flex items-center gap-1"><Calendar className="text-[18px]"  /> Sep 28, 2023</div>
<div className="flex items-center gap-1"><Package className="text-[18px]"  /> 1 {t('marketplaceOrders.myOrders.item')}</div>
</div>
<div className="flex items-center gap-3 mb-stack-lg">
<div className="w-20 h-20 rounded-lg overflow-hidden border border-outline-variant bg-surface-container-high">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<p className="font-bold text-on-surface">Warehouse Smart Hub v2</p>
<p className="text-body-sm text-error font-semibold">{t('marketplaceOrders.myOrders.actionRequired')}</p>
</div>
</div>
</div>
<div className="flex flex-col justify-between items-end gap-stack-md md:min-w-[180px]">
<div className="text-right">
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.myOrders.grandTotal')}</p>
<p className="text-headline-md font-bold text-primary">$315.00</p>
</div>
<button className="w-full md:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {t('marketplaceOrders.myOrders.resolveDispute')}
                            </button>
</div>
</div>
</div>
</div>

<div className="hidden flex-col items-center justify-center py-24 text-center" id="empty-state">
<div className="w-32 h-32 bg-surface-container border-2 border-dashed border-outline-variant rounded-full flex items-center justify-center mb-6">
<ScrollText className="text-outline text-5xl"  />
</div>
<h3 className="font-headline-lg text-headline-lg text-on-surface">{t('marketplaceOrders.myOrders.noOrdersFound')}</h3>
<p className="text-body-md text-on-surface-variant mt-2 max-w-sm">{t('marketplaceOrders.myOrders.noOrdersDesc')}</p>
<button className="mt-8 px-8 py-3 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all">
                    {t('marketplaceOrders.myOrders.exploreMarketplace')}
                </button>
</div>
</div>
</main>
      </div>
    </div>
  );
}
