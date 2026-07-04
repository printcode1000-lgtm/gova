'use client';

import React, { useState } from 'react';
import { MapPin, Truck, Info, Check, Star, ShieldCheck, Headphones, HelpCircle, Share2, Copy, Plus, Minus } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Shipment Tracking</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">

<div className="flex flex-col md:flex-row md:items-end justify-between mb-stack-xl gap-stack-md">
<div>
<p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-stack-xs">Tracking Number</p>
<div className="flex items-center gap-3">
<h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">#GV-8829-4401-LX</h2>
<button className="text-on-surface-variant hover:text-primary text-lg transition-colors" ><Copy className="w-5 h-5 inline-block" /></button>
</div>
</div>
<div className="flex items-center gap-3 bg-secondary-container/15 px-4 py-2 rounded-full border border-secondary-container">
<span className="relative flex h-3 w-3">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
<span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
</span>
<span className="font-label-md text-label-md text-on-secondary-container">Status: In Transit</span>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">

<div className="lg:col-span-8 space-y-stack-lg">

<section className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
<div className="p-stack-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
<div className="flex items-center gap-2">
<MapPin className="text-primary"  />
<span className="font-label-md text-label-md">Current Location: Rotterdam Hub</span>
</div>
<span className="text-body-sm font-body-sm text-on-surface-variant italic">Updated 12 mins ago</span>
</div>
<div className="relative h-[350px] w-full bg-surface-variant flex items-center justify-center">
<div className="absolute inset-0 grayscale opacity-40 mix-blend-multiply" data-location="Rotterdam, Netherlands" style={{ "backgroundImage": "none" }}></div>

<div className="absolute top-4 right-4 flex flex-col gap-2">
<button className="bg-white p-2 rounded shadow-md  text-on-surface-variant hover:text-primary" ><Plus className="w-5 h-5 inline-block" /></button>
<button className="bg-white p-2 rounded shadow-md  text-on-surface-variant hover:text-primary" ><Minus className="w-5 h-5 inline-block" /></button>
</div>

<div className="relative z-10">
<div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center shadow-xl border-4 border-white">
<Truck className="text-white text-xl" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<div className="absolute -inset-4 bg-primary/20 rounded-full animate-ping"></div>
</div>
</div>
</section>

<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-sm">
<h3 className="font-headline-md text-headline-md mb-stack-lg text-primary">Shipment Journey</h3>
<div className="relative pl-8 space-y-stack-xl">

<div className="absolute left-3 top-2 bottom-2 w-0.5 bg-outline-variant"></div>

<div className="relative flex items-start gap-stack-lg group">
<div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-surface-container-high border-2 border-outline-variant z-10 flex items-center justify-center">
<div className="h-2 w-2 rounded-full bg-outline"></div>
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-outline">Out for Delivery</h4>
<span className="text-body-sm font-body-sm text-outline">Expected: Oct 24</span>
</div>
<p className="text-body-sm font-body-sm text-outline-variant">Final leg to destination address.</p>
</div>
</div>

<div className="relative flex items-start gap-stack-lg group">
<div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-primary-container border-2 border-primary z-10 flex items-center justify-center">
<Truck className="text-primary text-sm font-bold"  />
</div>
<div className="flex-1">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-primary font-bold">In Transit</h4>
<span className="text-body-sm font-body-sm text-primary">Active</span>
</div>
<p className="text-body-md font-body-md text-on-surface mb-2">Departed Rotterdam sorting facility.</p>
<div className="bg-surface-container rounded-lg p-3 text-body-sm text-on-surface-variant flex items-center gap-3">
<Info className="text-primary"  />
<span>Delayed by 2 hours due to heavy port traffic.</span>
</div>
</div>
</div>

<div className="relative flex items-start gap-stack-lg group">
<div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-secondary-container border-2 border-secondary z-10 flex items-center justify-center">
<Check className="text-on-secondary-container text-sm font-bold"  />
</div>
<div className="flex-1 opacity-80">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-on-surface">Carrier Picked Up</h4>
<span className="text-body-sm font-body-sm text-on-surface-variant">Oct 21, 14:30</span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant">Consolidated at primary terminal.</p>
</div>
</div>

<div className="relative flex items-start gap-stack-lg group">
<div className="absolute -left-8 mt-1 h-6 w-6 rounded-full bg-secondary-container border-2 border-secondary z-10 flex items-center justify-center">
<Check className="text-on-secondary-container text-sm font-bold"  />
</div>
<div className="flex-1 opacity-80">
<div className="flex justify-between items-start">
<h4 className="font-label-md text-label-md text-on-surface">Label Created</h4>
<span className="text-body-sm font-body-sm text-on-surface-variant">Oct 20, 09:12</span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant">Shipping documentation processed by seller.</p>
</div>
</div>
</div>
</section>
</div>

<div className="lg:col-span-4 space-y-stack-lg">

<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-stack-lg shadow-sm">
<h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-stack-md">Shipment Items (4)</h3>
<div className="space-y-4">

<div className="flex gap-4 items-center p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer group">
<div className="w-16 h-16 rounded-lg bg-surface-container-high flex-shrink-0 overflow-hidden border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-1 min-w-0">
<h4 className="font-label-md text-label-md truncate text-on-surface">Precision Turbine Core</h4>
<p className="text-body-sm font-body-sm text-on-surface-variant">SKU: IND-901-X</p>
</div>
<span className="font-label-md text-label-md text-primary">x2</span>
</div>

<div className="flex gap-4 items-center p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer group">
<div className="w-16 h-16 rounded-lg bg-surface-container-high flex-shrink-0 overflow-hidden border border-outline-variant relative">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
<div className="absolute top-1 right-1 bg-tertiary-container text-on-tertiary-container p-0.5 rounded shadow">
<Star className="text-[10px]" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-1">
<h4 className="font-label-md text-label-md truncate text-on-surface">Custom Brass Assembly</h4>
<span className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Custom</span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant">Ref: CRQ-7721</p>
</div>
<span className="font-label-md text-label-md text-primary">x1</span>
</div>

<div className="flex gap-4 items-center p-2 hover:bg-surface-container rounded-lg transition-colors cursor-pointer group">
<div className="w-16 h-16 rounded-lg bg-surface-container-high flex-shrink-0 overflow-hidden border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-1 min-w-0">
<h4 className="font-label-md text-label-md truncate text-on-surface">Carbon Fiber Plate S-4</h4>
<p className="text-body-sm font-body-sm text-on-surface-variant">SKU: MAT-442-CF</p>
</div>
<span className="font-label-md text-label-md text-primary">x1</span>
</div>
</div>
<button className="w-full mt-stack-lg py-3 border border-primary text-primary font-label-md text-label-md rounded-xl hover:bg-primary/5 transition-colors">
                        View Order Details
                    </button>
</section>

<section className="bg-primary-container text-on-primary-container rounded-xl p-stack-lg shadow-sm">
<div className="flex items-center justify-between mb-4">
<h3 className="font-label-md text-label-md uppercase tracking-wider opacity-80">Carrier Information</h3>
<ShieldCheck className=""  />
</div>
<div className="flex items-center gap-4 mb-stack-md">
<div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">GL</div>
<div>
<p className="font-label-md text-label-md">Global Logistics S.A.</p>
<p className="text-body-sm font-body-sm opacity-80 text-on-primary-container/80">Express Air Freight</p>
</div>
</div>
<div className="space-y-3 pt-4 border-t border-white/10">
<button className="w-full flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-body-sm">
<Headphones className="text-sm"  />
                            Contact Carrier
                        </button>
</div>
</section>

<div className="grid grid-cols-2 gap-3">
<button className="flex flex-col items-center justify-center p-4 bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-high transition-all">
<HelpCircle className="text-primary mb-2"  />
<span className="font-label-sm text-label-sm">Get Help</span>
</button>
<button className="flex flex-col items-center justify-center p-4 bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-high transition-all">
<Share2 className="text-primary mb-2"  />
<span className="font-label-sm text-label-sm">Share Tracking</span>
</button>
</div>
</div>
</div>
</main>
      </div>
    </div>
  );
}
