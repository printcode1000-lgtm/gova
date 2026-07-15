'use client';

import React, { useState } from 'react';
import { HelpCircle, Check, X, Info } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full asol-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.returnReplaceItems.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-5xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl">

<div className="mb-stack-xl">
<h1 className="font-headline-xl text-headline-xl text-primary mb-2">{t('marketplaceOrders.returnReplaceItems.title')}</h1>
<p className="font-body-md text-body-md text-on-surface-variant">{t('marketplaceOrders.returnReplaceItems.description')}</p>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

<div className="lg:col-span-8 space-y-gutter">

<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-sm">
<div className="flex items-center gap-stack-sm mb-stack-md">
<span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-md">1</span>
<h2 className="font-headline-md text-headline-md">{t('marketplaceOrders.returnReplaceItems.requestType')}</h2>
</div>
<div className="grid grid-cols-2 gap-stack-md">
<button className="flex flex-col items-center justify-center p-stack-lg border-2 border-primary bg-primary-container/10 rounded-xl transition-all hover:shadow-md group" id="btn-return" onClick={() => undefined}>
<HelpCircle className="text-primary text-3xl mb-2"  />
<span className="font-bold text-primary">{t('marketplaceOrders.returnReplaceItems.return')}</span>
<span className="text-body-sm text-center text-on-surface-variant mt-1">{t('marketplaceOrders.returnReplaceItems.returnDesc')}</span>
</button>
<button className="flex flex-col items-center justify-center p-stack-lg border-2 border-outline-variant rounded-xl transition-all hover:border-primary/50 group" id="btn-replace" onClick={() => undefined}>
<HelpCircle className="text-on-surface-variant group-hover:text-primary text-3xl mb-2"  />
<span className="font-bold text-on-surface-variant group-hover:text-primary">{t('marketplaceOrders.returnReplaceItems.replacement')}</span>
<span className="text-body-sm text-center text-on-surface-variant mt-1">{t('marketplaceOrders.returnReplaceItems.replacementDesc')}</span>
</button>
</div>
</section>

<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-sm">
<div className="flex items-center gap-stack-sm mb-stack-md">
<span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-md">2</span>
<h2 className="font-headline-md text-headline-md">{t('marketplaceOrders.returnReplaceItems.selectItems')}</h2>
</div>
<div className="space-y-stack-md">

<div className="flex items-start gap-stack-md p-stack-md border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group" onClick={() => undefined}>
<div className="mt-1">
<div className="w-6 h-6 border-2 border-outline-variant rounded-md flex items-center justify-center group-[.active]:bg-primary group-[.active]:border-primary">
<Check className="text-white text-sm hidden group-[.active]:block"  />
</div>
</div>
<div className="w-20 h-20 bg-surface-variant rounded-lg overflow-hidden flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<p className="font-bold text-body-md text-primary">Precision Sensor Module X-200</p>
<p className="text-body-sm text-on-surface-variant">Serial: GV-9920-X1 | Delivered: Oct 24, 2023</p>
<div className="mt-2 flex items-center gap-stack-sm">
<span className="text-label-sm px-2 py-0.5 bg-secondary-container/20 text-on-secondary-container rounded">{t('marketplaceOrders.returnReplaceItems.delivered')}</span>
<span className="font-bold text-primary">$499.00</span>
</div>
</div>
</div>

<div className="flex items-start gap-stack-md p-stack-md border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer group" onClick={() => undefined}>
<div className="mt-1">
<div className="w-6 h-6 border-2 border-outline-variant rounded-md flex items-center justify-center group-[.active]:bg-primary group-[.active]:border-primary">
<Check className="text-white text-sm hidden group-[.active]:block"  />
</div>
</div>
<div className="w-20 h-20 bg-surface-variant rounded-lg overflow-hidden flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<p className="font-bold text-body-md text-primary">High-Speed Fiber Connect Kit</p>
<p className="text-body-sm text-on-surface-variant">Serial: GV-1104-F2 | Delivered: Oct 24, 2023</p>
<div className="mt-2 flex items-center gap-stack-sm">
<span className="text-label-sm px-2 py-0.5 bg-secondary-container/20 text-on-secondary-container rounded">{t('marketplaceOrders.returnReplaceItems.delivered')}</span>
<span className="font-bold text-primary">$125.50</span>
</div>
</div>
</div>
</div>
</section>

<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-sm">
<div className="flex items-center gap-stack-sm mb-stack-md">
<span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-md">3</span>
<h2 className="font-headline-md text-headline-md">{t('marketplaceOrders.returnReplaceItems.detailsEvidence')}</h2>
</div>
<div className="space-y-stack-lg">
<div>
<label className="block font-label-md text-on-surface mb-2">{t('marketplaceOrders.returnReplaceItems.reason')}</label>
<select className="w-full h-touch-target px-4 border border-outline rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-all">
<option>{t('marketplaceOrders.returnReplaceItems.selectReason')}</option>
<option>{t('marketplaceOrders.returnReplaceItems.reasonDefective')}</option>
<option>{t('marketplaceOrders.returnReplaceItems.reasonDamaged')}</option>
<option>{t('marketplaceOrders.returnReplaceItems.reasonIncorrect')}</option>
<option>{t('marketplaceOrders.returnReplaceItems.reasonNotNeeded')}</option>
<option>{t('marketplaceOrders.returnReplaceItems.reasonPerformance')}</option>
</select>
</div>
<div>
<label className="block font-label-md text-on-surface mb-2">{t('marketplaceOrders.returnReplaceItems.detailedDescription')}</label>
<textarea className="w-full p-4 border border-outline rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none" placeholder={t('marketplaceOrders.returnReplaceItems.descriptionPlaceholder')} rows={4}></textarea>
</div>
<div>
<label className="block font-label-md text-on-surface mb-2">{t('marketplaceOrders.returnReplaceItems.uploadEvidence')}</label>
<div className="border-2 border-dashed border-outline-variant rounded-xl p-stack-xl bg-surface flex flex-col items-center justify-center text-center hover:bg-surface-container-high transition-colors cursor-pointer group">
<div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
<HelpCircle className="text-primary text-3xl"  />
</div>
<p className="font-bold text-primary">{t('marketplaceOrders.returnReplaceItems.clickUpload')}</p>
<p className="text-body-sm text-on-surface-variant mt-1">{t('marketplaceOrders.returnReplaceItems.fileTypes')}</p>
<input accept="image/*" className="hidden" multiple type="file"/>
</div>
<div className="mt-stack-md flex gap-stack-sm overflow-x-auto pb-2 custom-scrollbar">

<div className="relative w-20 h-20 rounded-lg overflow-hidden border border-outline-variant flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover grayscale"   />
<button className="absolute top-1 right-1 bg-on-error w-5 h-5 rounded-full flex items-center justify-center shadow-md">
<X className="text-[14px] text-error"  />
</button>
</div>
</div>
</div>
</div>
</section>
</div>

<div className="lg:col-span-4">
<div className="sticky top-stack-xl space-y-gutter">
<div className="bg-surface-container-low border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h3 className="font-headline-md text-headline-md mb-stack-md text-primary">{t('marketplaceOrders.returnReplaceItems.requestSummary')}</h3>
<div className="space-y-stack-md pb-stack-md border-b border-outline-variant">
<div className="flex justify-between">
<span className="text-on-surface-variant">{t('marketplaceOrders.returnReplaceItems.selectedItems')}</span>
<span className="font-bold" id="summary-count">0</span>
</div>
<div className="flex justify-between">
<span className="text-on-surface-variant">{t('marketplaceOrders.returnReplaceItems.requestType')}</span>
<span className="font-bold text-primary" id="summary-type">{t('marketplaceOrders.returnReplaceItems.return')}</span>
</div>
</div>
<div className="py-stack-md">
<div className="flex justify-between items-baseline mb-stack-xs">
<span className="font-bold text-body-lg">{t('marketplaceOrders.returnReplaceItems.estimatedRefund')}</span>
<span className="font-bold text-headline-md text-primary">$0.00</span>
</div>
<p className="text-body-sm text-on-surface-variant">{t('marketplaceOrders.returnReplaceItems.refundTimeline')}</p>
</div>
<button className="w-full h-12 bg-primary text-on-primary rounded-lg font-bold hover:bg-primary-container transition-all active:scale-[0.98] mt-stack-md">
                            {t('marketplaceOrders.returnReplaceItems.submitRequest')}
                        </button>
<p className="text-center text-[11px] text-on-surface-variant mt-4 px-4">
                            By submitting, you agree to Asol's <a className="underline" href="#">{t('marketplaceOrders.returnReplaceItems.returnsPolicy')}</a> and <a className="underline" href="#">{t('marketplaceOrders.returnReplaceItems.termsOfService')}</a>.
                        </p>
</div>

<div className="bg-secondary-container/10 border border-on-secondary-container/20 rounded-xl p-stack-lg">
<div className="flex items-start gap-stack-sm text-on-secondary-container">
<Info className="mt-0.5"  />
<div>
<h4 className="font-bold text-body-md">{t('marketplaceOrders.returnReplaceItems.didYouKnow')}</h4>
<p className="text-body-sm mt-1 opacity-90">{t('marketplaceOrders.returnReplaceItems.replacementTip')}</p>
</div>
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
