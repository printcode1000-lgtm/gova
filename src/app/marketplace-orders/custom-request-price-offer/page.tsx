'use client';

import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Custom Request Price Offer</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl pb-32">

<div className="mb-stack-xl flex items-center justify-between p-stack-md bg-tertiary-fixed rounded-xl border border-tertiary-container/20">
<div className="flex items-center gap-stack-sm">
<HelpCircle className="text-on-tertiary-fixed-variant" style={{ "fontVariationSettings": "'FILL' 1" }} />
<span className="font-label-md text-on-tertiary-fixed-variant">Waiting for Acceptance</span>
</div>
<div className="hidden md:block">
<span className="font-body-sm text-on-tertiary-fixed-variant">Expires in 23h 45m</span>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

<div className="lg:col-span-8 flex flex-col gap-gutter">

<section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden offer-card-glow">
<div className="p-stack-lg border-b border-outline-variant bg-surface-container-low">
<div className="flex items-center gap-stack-md">
<div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center text-white">
<HelpCircle className=""  />
</div>
<div>
<h2 className="font-headline-md text-primary">Logistics Specialist #842</h2>
<p className="text-body-sm text-on-surface-variant">Top Rated Seller • 4.9/5.0</p>
</div>
</div>
</div>
<div className="p-stack-lg space-y-stack-lg">
<div>
<h3 className="font-label-md text-on-surface-variant mb-stack-xs">Seller's Note</h3>
<p className="text-body-md text-on-surface leading-relaxed italic border-l-4 border-primary/20 pl-stack-md">
                                "I have reviewed your custom request for the specialized equipment transport. Given the fragile nature and dimensions, I've secured a climate-controlled vehicle with hydraulic lift capabilities. This offer includes insurance coverage and priority handling. I can guarantee departure within 48 hours of your acceptance."
                            </p>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md pt-stack-md border-t border-outline-variant">
<div className="flex flex-col">
<span className="text-label-sm text-on-surface-variant">Offer Date</span>
<span className="font-label-md">Oct 24, 2023</span>
</div>
<div className="flex flex-col">
<span className="text-label-sm text-on-surface-variant">Estimated Delivery</span>
<span className="font-label-md">Oct 28 - 30, 2023</span>
</div>
<div className="flex flex-col">
<span className="text-label-sm text-on-surface-variant">Transit Insurance</span>
<span className="font-label-md text-on-secondary-container">Included</span>
</div>
</div>
</div>
</section>

<section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg">
<h3 className="font-headline-md text-on-surface mb-stack-md">Your Original Request</h3>
<div className="space-y-stack-md">
<div>
<span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Description</span>
<p className="text-body-md text-on-surface mt-stack-xs">
                                Seeking specialized transport for a high-precision CNC motherboard assembly. Dimensions are roughly 120x80x40cm. Must be kept at constant temperature (18-24°C) and requires anti-static packaging.
                            </p>
</div>
<div>
<span className="text-label-sm text-on-surface-variant uppercase tracking-wider">Reference Images</span>
<div className="grid grid-cols-2 md:grid-cols-4 gap-stack-sm mt-stack-md">
<div className="aspect-square rounded-lg overflow-hidden border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="aspect-square rounded-lg overflow-hidden border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="aspect-square rounded-lg overflow-hidden border border-outline-variant bg-surface-container flex items-center justify-center text-on-surface-variant">
<HelpCircle className=""  />
</div>
</div>
</div>
</div>
</section>
</div>

<div className="lg:col-span-4">
<aside className="sticky top-24 flex flex-col gap-gutter">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h3 className="font-headline-md text-on-surface mb-stack-lg">Price Breakdown</h3>
<div className="space-y-stack-md">
<div className="flex justify-between items-center text-body-md">
<span className="text-on-surface-variant">Unit Price (Transport)</span>
<span className="font-label-md">$1,240.00</span>
</div>
<div className="flex justify-between items-center text-body-md">
<span className="text-on-surface-variant">Expedited Shipping</span>
<span className="font-label-md">$150.00</span>
</div>
<div className="flex justify-between items-center text-body-md">
<span className="text-on-surface-variant">Service Fees</span>
<span className="font-label-md">$45.50</span>
</div>
<div className="flex justify-between items-center text-body-md">
<span className="text-on-surface-variant">Tax (VAT 5%)</span>
<span className="font-label-md">$71.78</span>
</div>
<div className="pt-stack-md border-t-2 border-dashed border-outline-variant mt-stack-md">
<div className="flex justify-between items-center">
<span className="font-headline-md text-primary">Total Offer</span>
<span className="font-headline-md text-primary">$1,507.28</span>
</div>
</div>
</div>

<div className="mt-stack-xl flex flex-col gap-stack-md">
<button className="w-full h-12 bg-primary text-white rounded-xl font-label-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2">
<CheckCircle2 className="text-[20px]"  />
                                Accept Price Offer
                            </button>
<button className="w-full h-12 bg-white border border-error text-error rounded-xl font-label-md hover:bg-error/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
<HelpCircle className="text-[20px]"  />
                                Reject Price Offer
                            </button>
<button className="w-full py-stack-xs text-on-surface-variant text-body-sm hover:text-error transition-colors text-center mt-stack-sm">
                                Cancel My Request
                            </button>
</div>
</div>

<div className="bg-surface-container-high/30 rounded-xl p-stack-md border border-outline-variant/30">
<div className="flex items-start gap-stack-sm">
<ShieldCheck className="text-on-secondary-fixed-variant" style={{ "fontVariationSettings": "'FILL' 1" }} />
<div className="flex-1">
<p className="text-label-sm text-on-secondary-fixed-variant">Buyer Protection Active</p>
<p className="text-body-sm text-on-surface-variant mt-1 leading-tight">Funds are held in escrow until delivery is confirmed and inspected.</p>
</div>
</div>
</div>
</aside>
</div>
</div>
</main>
      </div>
    </div>
  );
}
