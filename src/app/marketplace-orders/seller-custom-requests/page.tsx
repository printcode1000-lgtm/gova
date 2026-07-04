'use client';

import React, { useState } from 'react';
import { Menu, HelpCircle, ChevronRight, MapPin, MessageSquare } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Seller Custom Requests</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <header className="bg-surface dark:bg-inverse-surface border-b border-outline-variant dark:border-outline docked full-width top-0 z-40">
<div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-touch-target">
<div className="flex items-center gap-4">
<button className="p-2 hover:bg-surface-container-high dark:hover:bg-surface-variant transition-colors duration-200 rounded-full">
<Menu className="text-primary dark:text-primary-fixed-dim"  />
</button>
<h1 className="text-headline-md font-headline-md font-extrabold text-primary dark:text-primary-fixed-dim">Gova</h1>
</div>
<div className="flex items-center gap-6">
<nav className="hidden md:flex items-center gap-8">
<a className="text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim font-label-md transition-colors" href="#">Dashboard</a>
<a className="text-primary dark:text-primary-fixed-dim font-bold font-label-md" href="#">Requests</a>
<a className="text-on-surface-variant dark:text-surface-variant hover:text-primary dark:hover:text-primary-fixed-dim font-label-md transition-colors" href="#">Messages</a>
</nav>
<div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
</div>
</div>
</header>
<main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pt-stack-lg pb-32">

<section className="mb-stack-xl">
<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-stack-lg">
<div>
<h2 className="font-headline-xl text-headline-xl text-primary mb-1">Custom Requests</h2>
<p className="font-body-md text-body-md text-on-surface-variant">Manage personalized orders and image-based quotes from your customers.</p>
</div>
<div className="flex items-center bg-surface-container-low p-1 rounded-xl">
<button className="px-6 py-2 rounded-lg bg-primary text-on-primary font-label-md shadow-sm">Seller View</button>
<button className="px-6 py-2 rounded-lg text-on-surface-variant font-label-md hover:bg-surface-container-high transition-all">Insights</button>
</div>
</div>

<div className="flex overflow-x-auto hide-scrollbar border-b border-outline-variant gap-8">
<button className="pb-4 px-1 border-b-2 border-primary text-primary font-bold font-label-md whitespace-nowrap">New Requests (4)</button>
<button className="pb-4 px-1 border-b-2 border-transparent text-on-surface-variant hover:text-primary font-label-md transition-all whitespace-nowrap">Pending Price (12)</button>
<button className="pb-4 px-1 border-b-2 border-transparent text-on-surface-variant hover:text-primary font-label-md transition-all whitespace-nowrap">Offer Sent (8)</button>
<button className="pb-4 px-1 border-b-2 border-transparent text-on-surface-variant hover:text-primary font-label-md transition-all whitespace-nowrap">Accepted (45)</button>
</div>
</section>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
<div className="flex justify-between items-start">
<div className="flex gap-3">
<div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
<HelpCircle className="text-on-primary-container"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-on-surface">Prescription Refill</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Pharma Connect • 2 mins ago</p>
</div>
</div>
<span className="bg-secondary-container/15 text-on-secondary-container text-label-sm font-label-sm px-2 py-1 rounded">Urgent</span>
</div>
<div className="aspect-square w-full rounded-lg overflow-hidden bg-surface-container">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex items-center justify-between mt-auto pt-2">
<div className="flex -space-x-2">
<div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-bold">+2</div>
</div>
<button className="h-touch-target px-6 bg-primary text-on-primary rounded-full font-label-md hover:opacity-90 transition-opacity flex items-center gap-2">
                        Review <ChevronRight className="text-sm"  />
</button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
<div className="flex justify-between items-start">
<div className="flex gap-3">
<div className="w-10 h-10 rounded-lg bg-tertiary-container flex items-center justify-center">
<HelpCircle className="text-tertiary-fixed-dim"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-on-surface">Weekly Grocery List</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Family Mart • 15 mins ago</p>
</div>
</div>
<span className="bg-outline-variant/20 text-on-surface-variant text-label-sm font-label-sm px-2 py-1 rounded">Standard</span>
</div>
<div className="grid grid-cols-2 gap-2 h-48 lg:h-64">
<div className="rounded-lg overflow-hidden bg-surface-container h-full">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex flex-col gap-2 h-full">
<div className="rounded-lg overflow-hidden bg-surface-container flex-1">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="rounded-lg overflow-hidden bg-surface-container flex-1 bg-primary/5 flex items-center justify-center text-primary font-bold">
                            +4 items
                        </div>
</div>
</div>
<div className="flex items-center justify-between mt-auto pt-2">
<p className="text-label-sm font-label-sm text-on-surface-variant">Estimated: --</p>
<button className="h-touch-target px-6 bg-primary text-on-primary rounded-full font-label-md hover:opacity-90 transition-opacity">Review</button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
<div className="flex justify-between items-start">
<div className="flex gap-3">
<div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
<HelpCircle className="text-on-secondary-container"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-on-surface">AC Repair Quote</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">HomeTech Services • 1h ago</p>
</div>
</div>
<span className="bg-primary-container/10 text-primary text-label-sm font-label-sm px-2 py-1 rounded">Bidding</span>
</div>
<div className="aspect-video w-full rounded-lg overflow-hidden bg-surface-container">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="p-3 bg-surface rounded-lg border border-outline-variant/30">
<p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">"Unit makes a loud grinding noise when starting up. Need a technician to check the compressor..."</p>
</div>
<div className="flex items-center justify-between mt-auto pt-2">
<div className="flex items-center gap-1 text-on-surface-variant">
<MapPin className="text-sm"  />
<span className="text-label-sm font-label-sm">Downtown</span>
</div>
<button className="h-touch-target px-6 bg-primary text-on-primary rounded-full font-label-md hover:opacity-90 transition-opacity">Review</button>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-md flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
<div className="flex justify-between items-start">
<div className="flex gap-3">
<div className="w-10 h-10 rounded-lg bg-on-tertiary-fixed-variant/10 flex items-center justify-center">
<HelpCircle className="text-on-tertiary-fixed-variant"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-on-surface">Bulk Catering Order</h3>
<p className="font-body-sm text-body-sm text-on-surface-variant">Taste Catering • 3h ago</p>
</div>
</div>
</div>
<div className="flex gap-2">
<div className="w-20 h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex flex-col justify-center">
<p className="font-label-md text-label-md text-on-surface">Event: Oct 24th</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">50+ Persons • Custom Menu</p>
</div>
</div>
<div className="mt-auto pt-2">
<button className="w-full h-touch-target bg-primary text-on-primary rounded-full font-label-md hover:opacity-90 transition-opacity">Review</button>
</div>
</div>

<div className="border-2 border-dashed border-outline-variant rounded-xl p-stack-md flex flex-col items-center justify-center text-center gap-4 bg-surface/50">
<div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
<HelpCircle className="text-outline text-3xl"  />
</div>
<div>
<h3 className="font-headline-md text-headline-md text-outline">Waiting for more...</h3>
<p className="font-body-sm text-body-sm text-outline max-w-[200px]">New requests from customers will appear here automatically.</p>
</div>
</div>
</div>
</main>



<button className="fixed right-6 bottom-20 md:bottom-10 bg-primary text-on-primary w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40">
<MessageSquare className="text-2xl"  />
</button>
      </div>
    </div>
  );
}
