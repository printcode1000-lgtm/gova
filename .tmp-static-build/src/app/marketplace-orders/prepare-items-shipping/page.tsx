'use client';

import React, { useState } from 'react';
import { HelpCircle, Truck, AlertTriangle, Package } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.prepareItemsShipping.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl">

<div className="mb-stack-xl flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
<div>
<h1 className="font-headline-xl text-headline-xl text-primary mb-2 hidden md:block">{t('marketplaceOrders.prepareItemsShipping.title')}</h1>
<h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2 md:hidden">{t('marketplaceOrders.prepareItemsShipping.prepareShipping')}</h1>
<p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                    {t('marketplaceOrders.prepareItemsShipping.description')}
                </p>
</div>
<div className="flex gap-stack-sm overflow-x-auto pb-2 scrollbar-hide">
<div className="bg-surface-container flex flex-col p-4 rounded-xl min-w-[120px]">
<span className="font-label-sm text-label-sm text-on-surface-variant">{t('marketplaceOrders.prepareItemsShipping.pending')}</span>
<span className="font-headline-md text-headline-md text-primary">12</span>
</div>
<div className="bg-secondary-container flex flex-col p-4 rounded-xl min-w-[120px]">
<span className="font-label-sm text-label-sm text-on-secondary-container">{t('marketplaceOrders.prepareItemsShipping.ready')}</span>
<span className="font-headline-md text-headline-md text-on-secondary-container">05</span>
</div>
</div>
</div>

<div className="flex gap-2 mb-stack-lg overflow-x-auto pb-2">
<button className="bg-primary text-on-primary px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2">
<HelpCircle className="text-[18px]"  /> {t('marketplaceOrders.prepareItemsShipping.allItems')}
            </button>
<button className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-highest transition-colors">
<HelpCircle className="text-[18px]"  /> {t('marketplaceOrders.prepareItemsShipping.refrigerated')}
            </button>
<button className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2 hover:bg-surface-container-highest transition-colors">
<Truck className="text-[18px]"  /> {t('marketplaceOrders.prepareItemsShipping.specialVehicle')}
            </button>
</div>

<div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">

<div className="md:col-span-8 glass-card rounded-xl p-stack-md flex flex-col md:flex-row gap-stack-md relative overflow-hidden group">
<div className="w-full md:w-1/3 aspect-square md:aspect-auto md:h-full rounded-lg overflow-hidden bg-surface-container">
<ImagePlaceholder alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"   />
</div>
<div className="flex-1 flex flex-col">
<div className="flex justify-between items-start mb-2">
<span className="bg-tertiary-container/15 text-tertiary-container px-3 py-1 rounded-full text-label-sm font-label-sm uppercase tracking-wider">{t('marketplaceOrders.prepareItemsShipping.customRequest')}</span>
<span className="text-on-surface-variant font-label-sm text-label-sm">#GOV-8821</span>
</div>
<h3 className="font-headline-md text-headline-md text-on-surface mb-1">Heavy Industrial Generator</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-4">Pickup from: Sector 7 Industrial Hub. Drop-off: Port Logistics Terminal Center.</p>
<div className="flex flex-wrap gap-2 mb-stack-lg">
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary-container/20 text-on-secondary-container border border-secondary-container/30">
<Truck className="text-[18px]"  />
<span className="font-label-md text-label-md">{t('marketplaceOrders.prepareItemsShipping.specialVehicle')}</span>
</div>
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error-container/20 text-on-error-container border border-error-container/30">
<AlertTriangle className="text-[18px]"  />
<span className="font-label-md text-label-md">{t('marketplaceOrders.prepareItemsShipping.oversized')}</span>
</div>
</div>
<div className="mt-auto flex flex-col sm:flex-row gap-3">
<button className="flex-1 h-touch-target border-2 border-primary text-primary font-label-md text-label-md rounded-xl hover:bg-primary/5 transition-all flex items-center justify-center gap-2" onClick={() => undefined}>
                            {t('marketplaceOrders.prepareItemsShipping.markPreparing')}
                        </button>
<button className="flex-1 h-touch-target bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                            {t('marketplaceOrders.prepareItemsShipping.markReady')}
                        </button>
</div>
</div>
</div>

<div className="md:col-span-4 glass-card rounded-xl p-stack-md flex flex-col group">
<div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface-container mb-stack-md">
<ImagePlaceholder alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"   />
</div>
<div className="flex justify-between items-start mb-2">
<span className="bg-primary-container/15 text-primary-container px-3 py-1 rounded-full text-label-sm font-label-sm">{t('marketplaceOrders.prepareItemsShipping.standardProduct')}</span>
<span className="text-on-surface-variant font-label-sm text-label-sm">#ORD-4491</span>
</div>
<h3 className="font-headline-md text-headline-md text-on-surface mb-1">Organic Produce Batch A</h3>
<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-on-primary-container/10 text-primary-container mb-stack-lg w-fit">
<HelpCircle className="text-[18px]"  />
<span className="font-label-md text-label-md">{t('marketplaceOrders.prepareItemsShipping.refrigerationRequired')}</span>
</div>
<div className="mt-auto grid grid-cols-2 gap-2">
<button className="h-touch-target border border-outline text-on-surface font-label-sm text-label-sm rounded-lg hover:bg-surface-container-high transition-colors">
                        {t('marketplaceOrders.prepareItemsShipping.markPreparing')}
                    </button>
<button className="h-touch-target bg-secondary text-on-secondary font-label-sm text-label-sm rounded-lg hover:opacity-90 transition-opacity">
                        {t('marketplaceOrders.prepareItemsShipping.markReady2')}
                    </button>
</div>
</div>

<div className="md:col-span-4 glass-card rounded-xl p-stack-md flex flex-col group">
<div className="flex justify-between items-center mb-4">
<div className="flex items-center gap-2">
<div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
<Package className=""  />
</div>
<div>
<h4 className="font-label-md text-label-md text-on-surface">{t('marketplaceOrders.prepareItemsShipping.precisionTools')}</h4>
<span className="text-label-sm text-on-surface-variant">2.5kg • 40x20x15cm</span>
</div>
</div>
<span className="text-on-surface-variant font-label-sm text-label-sm">#ORD-5002</span>
</div>
<div className="space-y-3 mb-stack-lg">
<div className="flex justify-between text-body-sm">
<span className="text-on-surface-variant">{t('marketplaceOrders.prepareItemsShipping.status')}</span>
<span className="text-primary font-bold">{t('marketplaceOrders.prepareItemsShipping.awaitingPrep')}</span>
</div>
<div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
<div className="bg-primary w-1/4 h-full"></div>
</div>
</div>
<button className="w-full h-touch-target bg-primary text-on-primary font-label-md text-label-md rounded-xl transition-transform active:scale-95">
                    {t('marketplaceOrders.prepareItemsShipping.startPreparing')}
                </button>
</div>

<div className="md:col-span-8 glass-card rounded-xl p-stack-md flex flex-col md:flex-row gap-stack-md items-center">
<div className="flex-1 w-full">
<div className="flex items-center gap-4 mb-2">
<Package className="text-on-surface-variant"  />
<h3 className="font-headline-md text-headline-md text-on-surface">{t('marketplaceOrders.prepareItemsShipping.bulkTextiles')}</h3>
</div>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-2">
<div>
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.prepareItemsShipping.quantity')}</p>
<p className="font-body-md text-body-md">50 Rolls</p>
</div>
<div>
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.prepareItemsShipping.weight')}</p>
<p className="font-body-md text-body-md">1,200kg</p>
</div>
<div>
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.prepareItemsShipping.packaging')}</p>
<p className="font-body-md text-body-md">Palletized</p>
</div>
<div>
<p className="text-label-sm text-on-surface-variant">{t('marketplaceOrders.prepareItemsShipping.timeline')}</p>
<p className="font-body-md text-body-md text-secondary font-semibold italic">{t('marketplaceOrders.prepareItemsShipping.priority')}</p>
</div>
</div>
</div>
<div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
<button className="flex-1 md:w-48 h-touch-target border border-primary text-primary rounded-xl font-label-md hover:bg-primary/5 transition-colors">{t('marketplaceOrders.prepareItemsShipping.preparing')}</button>
<button className="flex-1 md:w-48 h-touch-target bg-primary text-on-primary rounded-xl font-label-md shadow-md">{t('marketplaceOrders.prepareItemsShipping.markReady2')}</button>
</div>
</div>
</div>
</main>



<button className="md:hidden fixed right-6 bottom-24 w-14 h-14 bg-primary text-on-primary rounded-full shadow-xl flex items-center justify-center active:scale-90 transition-transform">
<HelpCircle className=""  />
</button>
      </div>
    </div>
  );
}
