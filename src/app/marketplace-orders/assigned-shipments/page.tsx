'use client';

import React, { useState } from 'react';
import { Truck, ShoppingBag, HelpCircle, Filter, Download, Package, ShieldCheck, FileText } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Assigned Shipments</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex-col h-full w-80 bg-surface-container-low dark:bg-inverse-surface shadow-xl dark:shadow-none pt-20">
<div className="px-6 py-4 flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
<Truck className="text-on-secondary-container"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-on-surface">Gova User</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Carrier Portal</p>
</div>
</div>
<nav className="mt-4 flex flex-col gap-1">
<a className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-all duration-300 ease-in-out flex items-center gap-3" href="#">
<ShoppingBag className=""  /> Buyer View
            </a>
<a className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-all duration-300 ease-in-out flex items-center gap-3" href="#">
<HelpCircle className=""  /> Seller Dashboard
            </a>
<a className="bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary font-bold rounded-full mx-2 px-4 py-3 flex items-center gap-3" href="#">
<HelpCircle className=""  /> Carrier Portal
            </a>
<a className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-all duration-300 ease-in-out flex items-center gap-3" href="#">
<HelpCircle className=""  /> Admin Panel
            </a>
</nav>
<div className="mt-auto p-6 border-t border-outline-variant">
<p className="text-label-sm font-label-sm text-outline">v1.0.4</p>
</div>
</aside>

<main className="pt-20 px-margin-mobile md:px-margin-desktop md:ml-80">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md py-stack-xl">
<div>
<h1 className="font-headline-xl text-headline-xl text-on-surface">Assigned Shipments</h1>
<p className="font-body-md text-body-md text-on-surface-variant">Manage your active fleet and pending transport requirements.</p>
</div>
<div className="flex gap-2">
<button className="bg-surface-container-high text-on-surface-variant px-4 py-2 rounded-lg font-label-md flex items-center gap-2 hover:bg-surface-variant transition-colors border border-outline-variant">
<Filter className=""  /> Filter
                </button>
<button className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md flex items-center gap-2 hover:opacity-90 transition-opacity">
<Download className=""  /> Export Manifest
                </button>
</div>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-xl">
<div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl shadow-sm">
<p className="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Active Loads</p>
<div className="flex items-baseline gap-2">
<span className="text-headline-lg font-headline-lg text-primary">12</span>
<span className="text-body-sm font-body-sm text-secondary-fixed-dim font-bold">↑ 2</span>
</div>
</div>
<div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl shadow-sm">
<p className="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">In Transit</p>
<div className="flex items-baseline gap-2">
<span className="text-headline-lg font-headline-lg text-primary">08</span>
</div>
</div>
<div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl shadow-sm">
<p className="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Next 24h</p>
<div className="flex items-baseline gap-2">
<span className="text-headline-lg font-headline-lg text-tertiary">04</span>
</div>
</div>
<div className="bg-surface-container-lowest border border-outline-variant p-stack-md rounded-xl shadow-sm">
<p className="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Delivered (Today)</p>
<div className="flex items-baseline gap-2">
<span className="text-headline-lg font-headline-lg text-secondary">06</span>
</div>
</div>
</div>

<div className="space-y-gutter pb-stack-xl">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
<div className="flex flex-col lg:flex-row">

<div className="w-full lg:w-2 bg-secondary-fixed-dim h-2 lg:h-auto"></div>

<div className="flex-1 p-stack-md lg:p-stack-lg">
<div className="flex flex-wrap items-start justify-between gap-4 mb-4">
<div className="flex items-center gap-3">
<div className="bg-surface-container-high p-3 rounded-xl">
<Package className="text-primary"  />
</div>
<div>
<h4 className="font-headline-md text-headline-md text-on-surface">SHP-99201-B</h4>
<p className="text-body-sm font-body-sm text-on-surface-variant">Assigned: Nov 24, 2023</p>
</div>
</div>
<div className="flex items-center gap-2">
<span className="bg-secondary/15 text-secondary px-3 py-1 rounded-full text-label-sm font-label-sm">In Transit</span>
<span className="bg-tertiary/15 text-tertiary px-3 py-1 rounded-full text-label-sm font-label-sm flex items-center gap-1">
<HelpCircle className="text-[16px]"  /> Refrigerated
                                </span>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-stack-lg mb-6">
<div className="flex flex-col gap-1">
<p className="text-label-sm font-label-sm text-outline uppercase">Pickup</p>
<p className="font-body-md text-body-md font-semibold text-on-surface">Warehouse Alpha, Chicago</p>
<p className="text-body-sm text-on-surface-variant">ETA: 08:00 AM</p>
</div>
<div className="flex items-center justify-center hidden md:flex">
<div className="h-[2px] bg-outline-variant w-full relative">
<div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full"></div>
</div>
</div>
<div className="flex flex-col gap-1 text-right">
<p className="text-label-sm font-label-sm text-outline uppercase">Delivery</p>
<p className="font-body-md text-body-md font-semibold text-on-surface">Retail Hub, New York</p>
<p className="text-body-sm text-on-surface-variant">Deadline: Nov 26, 17:00</p>
</div>
</div>

<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant">
<div className="flex flex-wrap gap-2">
<div className="flex items-center gap-2 text-on-surface-variant text-body-sm bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
<HelpCircle className="text-[18px]"  />
<span>Semi-Trailer (Reefer)</span>
</div>
<div className="flex items-center gap-2 text-on-surface-variant text-body-sm bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
<ShieldCheck className="text-[18px]"  />
<span>High-Value Load</span>
</div>
</div>
<div className="flex gap-2 w-full sm:w-auto">
<button className="flex-1 sm:flex-none border border-primary text-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/5 transition-colors">View Map</button>
<button className="flex-1 sm:flex-none bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:opacity-90 transition-opacity">Update Status</button>
</div>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
<div className="flex flex-col lg:flex-row">
<div className="w-full lg:w-2 bg-tertiary-fixed-dim h-2 lg:h-auto"></div>
<div className="flex-1 p-stack-md lg:p-stack-lg">
<div className="flex flex-wrap items-start justify-between gap-4 mb-4">
<div className="flex items-center gap-3">
<div className="bg-surface-container-high p-3 rounded-xl">
<Truck className="text-primary"  />
</div>
<div>
<h4 className="font-headline-md text-headline-md text-on-surface">SHP-11482-Z</h4>
<p className="text-body-sm font-body-sm text-on-surface-variant">Assigned: Nov 25, 2023</p>
</div>
</div>
<div className="flex items-center gap-2">
<span className="bg-tertiary/15 text-tertiary px-3 py-1 rounded-full text-label-sm font-label-sm">Awaiting Dispatch</span>
<span className="bg-primary/15 text-primary px-3 py-1 rounded-full text-label-sm font-label-sm flex items-center gap-1">
<HelpCircle className="text-[16px]"  /> Oversized
                                </span>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-stack-lg mb-6">
<div className="flex flex-col gap-1">
<p className="text-label-sm font-label-sm text-outline uppercase">Pickup</p>
<p className="font-body-md text-body-md font-semibold text-on-surface">Manufacturing Plant C, Detroit</p>
<p className="text-body-sm text-on-surface-variant">Scheduled: Nov 27, 06:00 AM</p>
</div>
<div className="flex items-center justify-center hidden md:flex">
<div className="h-[2px] bg-outline-variant w-full relative border-dashed">
<div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-outline-variant rounded-full"></div>
</div>
</div>
<div className="flex flex-col gap-1 text-right">
<p className="text-label-sm font-label-sm text-outline uppercase">Delivery</p>
<p className="font-body-md text-body-md font-semibold text-on-surface">Port Terminal B, Houston</p>
<p className="text-body-sm text-on-surface-variant">Deadline: Nov 30, 09:00 AM</p>
</div>
</div>
<div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-outline-variant">
<div className="flex flex-wrap gap-2">
<div className="flex items-center gap-2 text-on-surface-variant text-body-sm bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
<HelpCircle className="text-[18px]"  />
<span>Escort Required</span>
</div>
<div className="flex items-center gap-2 text-on-surface-variant text-body-sm bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/30">
<HelpCircle className="text-[18px]"  />
<span>Step Deck Trailer</span>
</div>
</div>
<div className="flex gap-2 w-full sm:w-auto">
<button className="flex-1 sm:flex-none border border-outline text-on-surface-variant px-4 py-2 rounded-lg font-label-md hover:bg-surface-container-high transition-colors">Manifest</button>
<button className="flex-1 sm:flex-none bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:opacity-90 transition-opacity">Assign Driver</button>
</div>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity group">
<div className="flex flex-col lg:flex-row">
<div className="w-full lg:w-2 bg-on-secondary-container h-2 lg:h-auto"></div>
<div className="flex-1 p-stack-md lg:p-stack-lg">
<div className="flex flex-wrap items-start justify-between gap-4 mb-4">
<div className="flex items-center gap-3">
<div className="bg-surface-container-high p-3 rounded-xl opacity-50">
<HelpCircle className="text-outline"  />
</div>
<div>
<h4 className="font-headline-md text-headline-md text-on-surface">SHP-88431-L</h4>
<p className="text-body-sm font-body-sm text-on-surface-variant">Completed Today, 11:42 AM</p>
</div>
</div>
<div className="flex items-center gap-2">
<span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-sm font-label-sm">Delivered</span>
</div>
</div>
<div className="flex items-center justify-between">
<div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
<FileText className="text-[18px]"  />
<span>POD Signed by J. Smith</span>
</div>
<button className="text-primary font-label-md hover:underline">View Proof</button>
</div>
</div>
</div>
</div>
</div>
</main>



<button className="fixed bottom-20 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-primary text-on-primary rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-[70]">
<HelpCircle className="text-[28px]"  />
</button>
      </div>
    </div>
  );
}
