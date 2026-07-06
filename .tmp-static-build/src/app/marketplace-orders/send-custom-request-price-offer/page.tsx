'use client';

import React, { useState } from 'react';
import { FileText, Info, Send } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.sendCustomRequestPriceOffer.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="flex-grow w-full max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl">
<div className="flex flex-col md:grid md:grid-cols-12 gap-stack-xl">

<section className="md:col-span-5 space-y-stack-lg">
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<div className="flex items-center justify-between mb-stack-md">
<span className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.requestId')}</span>
<div className="bg-secondary-container/15 text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-label-sm">{t('marketplaceOrders.sendCustomRequestPriceOffer.activeRequest')}</div>
</div>
<h2 className="font-headline-md text-headline-md text-primary mb-stack-sm">Bulk Frozen Seafood (Premium Grade)</h2>
<p className="text-on-surface-variant mb-stack-lg">Shipping from Busan Port to Berlin Distribution Center. Requires continuous temperature monitoring and high-capacity refrigeration.</p>
<div className="grid grid-cols-2 gap-stack-md mb-stack-lg">
<div className="bg-surface-container-low p-stack-sm rounded-lg border border-outline-variant/50">
<span className="text-label-sm text-on-surface-variant block">{t('marketplaceOrders.sendCustomRequestPriceOffer.requestedQty')}</span>
<span className="font-bold text-on-surface">2,500 Units</span>
</div>
<div className="bg-surface-container-low p-stack-sm rounded-lg border border-outline-variant/50">
<span className="text-label-sm text-on-surface-variant block">{t('marketplaceOrders.sendCustomRequestPriceOffer.deliveryBy')}</span>
<span className="font-bold text-on-surface">Oct 12, 2024</span>
</div>
</div>
<div className="space-y-stack-sm">
<span className="text-label-sm font-label-sm text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.referenceAttachments')}</span>
<div className="flex gap-stack-sm overflow-x-auto pb-2">
<div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant flex items-center justify-center bg-surface-container-high">
<FileText className="text-outline"  />
</div>
</div>
</div>
</div>
<div className="bg-primary/5 border border-primary/10 rounded-xl p-stack-md flex gap-stack-md items-start">
<Info className="text-primary" style={{ "fontVariationSettings": "'FILL' 1" }} />
<div>
<p className="font-bold text-primary text-body-sm">{t('marketplaceOrders.sendCustomRequestPriceOffer.sellerGuidance')}</p>
<p className="text-on-surface-variant text-body-sm">{t('marketplaceOrders.sendCustomRequestPriceOffer.guidanceText')}</p>
</div>
</div>
</section>

<section className="md:col-span-7">
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h3 className="font-headline-md text-headline-md text-on-surface mb-stack-xl">{t('marketplaceOrders.sendCustomRequestPriceOffer.configureOffer')}</h3>
<form className="space-y-stack-lg" onInput={() => undefined}>
<div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
<div className="flex flex-col gap-stack-xs">
<label className="text-label-md font-label-md text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.unitPrice')}</label>
<div className="relative">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
<input className="w-full h-12 pl-8 pr-4 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" id="unit_price" placeholder="0.00" step={0.01} type="number"/>
</div>
</div>
<div className="flex flex-col gap-stack-xs">
<label className="text-label-md font-label-md text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.totalQuantity')}</label>
<input className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" id="quantity" type="number" value="2500"/>
</div>
</div>
<div className="space-y-stack-md pt-stack-md border-t border-outline-variant/30">
<h4 className="text-label-md font-label-md text-primary uppercase">{t('marketplaceOrders.sendCustomRequestPriceOffer.serviceFees')}</h4>
<div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
<div className="flex flex-col gap-stack-xs">
<label className="text-label-md font-label-md text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.specialVehicleFee')}</label>
<div className="relative">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
<input className="w-full h-12 pl-8 pr-4 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" id="vehicle_fee" placeholder="0.00" type="number"/>
</div>
</div>
<div className="flex flex-col gap-stack-xs">
<label className="text-label-md font-label-md text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.refrigerationFee')}</label>
<div className="relative">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
<input className="w-full h-12 pl-8 pr-4 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" id="fridge_fee" placeholder="0.00" type="number"/>
</div>
</div>
</div>
<div className="flex flex-col gap-stack-xs">
<label className="text-label-md font-label-md text-on-surface-variant">{t('marketplaceOrders.sendCustomRequestPriceOffer.standardShipping')}</label>
<div className="relative">
<span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
<input className="w-full h-12 pl-8 pr-4 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" id="shipping_fee" placeholder="0.00" type="number"/>
</div>
</div>
</div>

<div className="bg-surface-container-high rounded-xl p-stack-lg mt-stack-xl space-y-stack-sm">
<div className="flex justify-between text-body-sm text-on-surface-variant">
<span>{t('marketplaceOrders.sendCustomRequestPriceOffer.subtotal')}</span>
<span id="display_subtotal">$0.00</span>
</div>
<div className="flex justify-between text-body-sm text-on-surface-variant">
<span>{t('marketplaceOrders.sendCustomRequestPriceOffer.totalFees')}</span>
<span id="display_fees">$0.00</span>
</div>
<div className="flex justify-between items-end pt-stack-sm border-t border-outline-variant">
<span className="font-bold text-on-surface">{t('marketplaceOrders.sendCustomRequestPriceOffer.totalOffer')}</span>
<span className="font-headline-md text-headline-md text-primary font-bold" id="display_total">$0.00</span>
</div>
</div>
<button className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-stack-sm mt-stack-xl" type="submit">
<span>{t('marketplaceOrders.sendCustomRequestPriceOffer.sendOffer')}</span>
<Send className=""  />
</button>
</form>
</div>
</section>
</div>
</main>
      </div>
    </div>
  );
}
