'use client';

import React, { useState } from 'react';
import { HelpCircle, Truck, CheckCircle2 } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Carrier Shipment Details</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter mb-stack-xl">
<div>
<div className="flex items-center gap-stack-sm mb-stack-xs">
<span className="px-3 py-1 bg-secondary-container/15 text-on-secondary-container font-label-sm rounded-full">In Transit</span>
<span className="text-on-surface-variant font-body-sm">ID: #SHP-28491-GV</span>
</div>
<h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background">Consolidated Cargo: Route #882</h2>
<p className="text-on-surface-variant font-body-md mt-1">Multi-seller shipment arriving at Brussels Terminal A</p>
</div>
<div className="flex gap-stack-sm">
<button className="flex-1 md:flex-none px-6 h-12 bg-primary text-on-primary font-label-md rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all">
                    Update Fleet Log
                </button>
</div>
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

<div className="lg:col-span-8 space-y-gutter">

<div className="relative h-80 rounded-xl overflow-hidden shadow-sm border border-outline-variant bg-surface-container">
<div className="absolute inset-0 z-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="absolute top-4 left-4 z-10 space-y-2">
<div className="glass-card p-3 rounded-lg shadow-sm">
<p className="font-label-sm text-on-surface-variant">Current Location</p>
<p className="font-headline-md text-primary">Luxembourg Hub</p>
</div>
</div>
</div>

<div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant">
<h3 className="font-headline-md text-on-background mb-stack-lg">Shipment Progress</h3>
<div className="relative flex items-center justify-between">
<div className="absolute top-1/2 left-0 w-full h-0.5 bg-outline-variant -translate-y-1/2 z-0"></div>
<div className="absolute top-1/2 left-0 h-0.5 bg-secondary -translate-y-1/2 z-0 transition-all duration-1000" style={{ "width": "50%" }}></div>

<div className="relative z-10 flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold">1</div>
<span className="mt-2 font-label-sm text-secondary">Pickup</span>
</div>
<div className="relative z-10 flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold">2</div>
<span className="mt-2 font-label-sm text-secondary">Verified</span>
</div>
<div className="relative z-10 flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold border-4 border-surface">3</div>
<span className="mt-2 font-label-sm text-primary font-bold">Transit</span>
</div>
<div className="relative z-10 flex flex-col items-center">
<div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold">4</div>
<span className="mt-2 font-label-sm text-on-surface-variant">Arrived</span>
</div>
</div>
</div>

<div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
<div className="px-stack-lg py-stack-md border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
<h3 className="font-headline-md text-on-background">Consolidated Manifest</h3>
<span className="font-label-sm text-on-surface-variant">14 Items Total</span>
</div>
<div className="divide-y divide-outline-variant">

<div className="p-stack-lg bg-surface-bright/30">
<div className="flex items-center gap-2 mb-stack-md">
<HelpCircle className="text-secondary"  />
<p className="font-label-md text-on-surface">Seller: <span className="font-bold">TechNode Logistics</span></p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
<div className="flex items-center gap-4 p-3 rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors">
<div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center">
<HelpCircle className="text-primary"  />
</div>
<div>
<p className="font-label-md text-on-surface">Precision Circuit Boards</p>
<p className="font-body-sm text-on-surface-variant">SKU-992-A • 4 Units</p>
</div>
</div>
<div className="flex items-center gap-4 p-3 rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors">
<div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center">
<HelpCircle className="text-primary"  />
</div>
<div>
<p className="font-label-md text-on-surface">Industrial Sensors</p>
<p className="font-body-sm text-on-surface-variant">SKU-104-B • 10 Units</p>
</div>
</div>
</div>
</div>

<div className="p-stack-lg">
<div className="flex items-center gap-2 mb-stack-md">
<HelpCircle className="text-secondary"  />
<p className="font-label-md text-on-surface">Seller: <span className="font-bold">Global Fibers Co.</span></p>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
<div className="flex items-center gap-4 p-3 rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors">
<div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center">
<HelpCircle className="text-primary"  />
</div>
<div>
<p className="font-label-md text-on-surface">Aramid Insulation Roll</p>
<p className="font-body-sm text-on-surface-variant">ROLL-XL • 1 Unit</p>
</div>
</div>
</div>
</div>
</div>
</div>
</div>

<div className="lg:col-span-4 space-y-gutter">

<div className="bg-primary-container text-on-primary-container p-stack-lg rounded-xl shadow-xl space-y-4">
<h3 className="font-headline-md text-on-primary-container">Dispatch Controls</h3>
<div className="grid grid-cols-1 gap-2">
<button className="w-full h-touch-target bg-surface-container-lowest text-primary font-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors" onClick={() => undefined}>
<HelpCircle className="text-xl"  />
                            Mark Received
                        </button>
<button className="w-full h-touch-target bg-surface-container-lowest text-primary font-label-md rounded-lg flex items-center justify-center gap-2 hover:bg-white transition-colors border-2 border-secondary" onClick={() => undefined}>
<Truck className="text-xl" style={{ "fontVariationSettings": "'FILL' 1" }} />
                            Mark In Transit
                        </button>
<button className="w-full h-touch-target bg-secondary text-on-secondary font-label-md rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-colors" onClick={() => undefined}>
<CheckCircle2 className="text-xl"  />
                            Mark Delivered
                        </button>
</div>
<div className="pt-2 border-t border-on-primary-container/20">
<p className="text-on-primary-container/80 font-body-sm text-center">Last updated 14 mins ago by Driver ID: GV-99</p>
</div>
</div>

<div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant space-y-stack-md">
<h3 className="font-headline-md text-on-background">Logistics Data</h3>
<div className="space-y-3">
<div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
<span className="text-on-surface-variant font-body-md">Total Weight</span>
<span className="text-on-surface font-bold">1,240 kg</span>
</div>
<div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
<span className="text-on-surface-variant font-body-md">Volume</span>
<span className="text-on-surface font-bold">4.2 m³</span>
</div>
<div className="flex justify-between items-center py-2 border-b border-outline-variant/30">
<span className="text-on-surface-variant font-body-md">Temp Control</span>
<span className="text-secondary font-bold">Not Required</span>
</div>
<div className="flex justify-between items-center py-2">
<span className="text-on-surface-variant font-body-md">Hazard Class</span>
<span className="text-error font-bold">None</span>
</div>
</div>
</div>

<div className="bg-surface-container-low p-stack-lg rounded-xl border border-dashed border-outline">
<h4 className="font-label-md text-on-surface mb-2">Internal Notes</h4>
<p className="text-body-sm text-on-surface-variant italic">"Gate access code for Brussels Terminal is 8829#. Call Supervisor ahead of arrival."</p>
<div className="mt-4 flex gap-2">
<button className="flex-1 h-10 border border-primary text-primary rounded-lg font-label-sm hover:bg-primary/5 transition-colors">Call Ops</button>
<button className="flex-1 h-10 border border-primary text-primary rounded-lg font-label-sm hover:bg-primary/5 transition-colors">Chat Support</button>
</div>
</div>
</div>
</div>
</main>



<div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-2xl transition-all opacity-0 translate-y-10 z-[100] pointer-events-none" id="statusToast">
        Shipment status updated successfully
    </div>
      </div>
    </div>
  );
}
