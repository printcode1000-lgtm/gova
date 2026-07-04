'use client';

import React, { useState } from 'react';
import { Download, ChevronDown, MapPin, Map, ShieldCheck, HelpCircle, Truck, Check, Bell, CreditCard, ShoppingCart } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Buyer Order Details</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <main className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg md:py-stack-xl mt-14 md:mt-0">

<section className="flex flex-col md:flex-row md:items-end justify-between gap-gutter mb-stack-xl">
<div>
<div className="flex flex-wrap items-center gap-stack-sm mb-stack-xs">
<h2 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg">Order #GV-94021-X</h2>
<span className="bg-primary-container/15 text-primary px-3 py-0.5 rounded-full text-label-sm font-label-sm uppercase tracking-wider">Mixed Order</span>
</div>
<div className="flex items-center gap-stack-sm">
<div className="flex items-center gap-1.5 px-3 py-1 bg-tertiary-container/15 text-tertiary-fixed-dim rounded-full">
<span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
<span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant">Processing</span>
</div>
<span className="text-on-surface-variant text-body-sm font-body-sm">Placed on Oct 24, 2023</span>
</div>
</div>
<div className="flex items-center gap-stack-sm">
<button className="h-11 px-6 bg-surface-container-high text-on-surface font-label-md text-label-md rounded-lg border border-outline-variant hover:bg-surface-container-highest transition-colors flex items-center gap-2">
<Download className="text-[20px]"  />
                    Invoice
                </button>
<div className="relative group">
<button className="h-11 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2">
                        Actions
                        <ChevronDown className="text-[20px]"  />
</button>

<div className="absolute right-0 mt-2 w-48 bg-white border border-outline-variant rounded-xl shadow-xl hidden group-hover:block z-40">
<div className="py-2">
<a className="block px-4 py-2 text-body-sm hover:bg-surface-container text-on-surface" href="#">Contact Support</a>
<a className="block px-4 py-2 text-body-sm hover:bg-surface-container text-on-surface" href="#">Cancel Order</a>
<hr className="my-1 border-outline-variant"/>
<a className="block px-4 py-2 text-body-sm hover:bg-surface-container text-error" href="#">Report Issue</a>
</div>
</div>
</div>
</div>
</section>

<nav className="flex border-b border-outline-variant mb-stack-lg overflow-x-auto scrollbar-hide">
<button className="tab-btn px-6 py-3 font-label-md text-label-md text-primary tab-active whitespace-nowrap" id="tab-overview" onClick={() => undefined}>Overview</button>
<button className="tab-btn px-6 py-3 font-label-md text-label-md text-on-surface-variant hover:text-primary whitespace-nowrap" id="tab-sellers" onClick={() => undefined}>Sellers &amp; Items</button>
<button className="tab-btn px-6 py-3 font-label-md text-label-md text-on-surface-variant hover:text-primary whitespace-nowrap" id="tab-shipments" onClick={() => undefined}>Shipments</button>
<button className="tab-btn px-6 py-3 font-label-md text-label-md text-on-surface-variant hover:text-primary whitespace-nowrap" id="tab-payments" onClick={() => undefined}>Payments</button>
<button className="tab-btn px-6 py-3 font-label-md text-label-md text-on-surface-variant hover:text-primary whitespace-nowrap" id="tab-issues" onClick={() => undefined}>Issues</button>
<button className="tab-btn px-6 py-3 font-label-md text-label-md text-on-surface-variant hover:text-primary whitespace-nowrap" id="tab-timeline" onClick={() => undefined}>Timeline</button>
</nav>

<div className="tab-pane block" id="content-overview">
<div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">

<div className="lg:col-span-2 space-y-gutter">
<div className="bg-surface-container-lowest p-stack-lg rounded-xl border border-outline-variant shadow-sm">
<div className="flex items-center gap-2 mb-4">
<MapPin className="text-primary"  />
<h3 className="font-headline-md text-headline-md">Delivery Address</h3>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
<div>
<p className="font-label-md text-label-md text-on-surface-variant mb-1">Shipping To</p>
<p className="font-body-md text-body-md font-semibold">Jonathan Harker</p>
<p className="font-body-md text-body-md text-on-surface-variant">4521 Business Center Dr, Suite 500<br/>San Francisco, CA 94105<br/>United States</p>
</div>
<div>
<p className="font-label-md text-label-md text-on-surface-variant mb-1">Contact Info</p>
<p className="font-body-md text-body-md">+1 (555) 902-1243</p>
<p className="font-body-md text-body-md text-on-surface-variant">j.harker@corporation.com</p>
</div>
</div>
</div>

<div className="h-64 rounded-xl overflow-hidden border border-outline-variant relative">
<div className="absolute inset-0 bg-surface-container-high flex items-center justify-center" data-location="San Francisco" style={{  }}>

<div className="text-center opacity-40">
<Map className="text-6xl"  />
<p className="font-label-md">Dynamic Map View</p>
</div>
</div>
</div>
</div>

<div className="space-y-gutter">
<div className="bg-primary text-on-primary p-stack-lg rounded-xl shadow-lg">
<h3 className="font-headline-md text-headline-md mb-stack-lg">Order Summary</h3>
<div className="space-y-3 font-body-md text-body-md">
<div className="flex justify-between opacity-80">
<span>Subtotal (4 items)</span>
<span>$2,450.00</span>
</div>
<div className="flex justify-between opacity-80">
<span>Shipping &amp; Handling</span>
<span>$125.50</span>
</div>
<div className="flex justify-between opacity-80">
<span>Estimated Tax</span>
<span>$196.00</span>
</div>
<div className="flex justify-between opacity-80">
<span>Service Fee</span>
<span>$45.00</span>
</div>
<div className="border-t border-white/20 pt-3 mt-3 flex justify-between font-bold text-lg">
<span>Total</span>
<span>$2,816.50</span>
</div>
</div>
<button className="w-full mt-stack-xl py-3 bg-secondary text-on-secondary rounded-lg font-label-md text-label-md hover:bg-on-secondary-container transition-colors">
                            Manage Payment
                        </button>
</div>
<div className="bg-surface-container-low p-stack-md rounded-xl border border-outline-variant flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
<ShieldCheck className=""  />
</div>
<div>
<p className="font-label-md text-label-md">Gova Protection</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Your order is protected for up to $10,000.</p>
</div>
</div>
</div>
</div>
</div>

<div className="tab-pane hidden" id="content-sellers">
<div className="space-y-stack-lg">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
<div className="bg-surface-container px-stack-lg py-3 flex justify-between items-center">
<div className="flex items-center gap-2">
<HelpCircle className="text-primary"  />
<span className="font-label-md text-label-md font-bold">TechSupply Global</span>
<span className="text-body-sm text-on-surface-variant">• Order #TS-912</span>
</div>
<button className="text-primary font-label-sm text-label-sm hover:underline">Message Seller</button>
</div>
<div className="p-stack-lg divide-y divide-outline-variant">

<div className="py-4 first:pt-0 flex gap-4">
<div className="w-20 h-20 bg-surface-container-high rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="flex-grow">
<div className="flex justify-between">
<h4 className="font-body-md font-semibold">Enterprise Hub v4</h4>
<span className="font-label-md">$850.00</span>
</div>
<p className="text-body-sm text-on-surface-variant">Qty: 2 • Color: Jet Black</p>
<div className="mt-2 inline-block px-2 py-0.5 bg-secondary-container/20 text-on-secondary-container rounded text-[10px] font-bold uppercase">In Stock</div>
</div>
</div>

<div className="py-4 last:pb-0">
<div className="flex gap-4 mb-3">
<div className="w-20 h-20 bg-surface-container-high rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant flex items-center justify-center">
<HelpCircle className="text-4xl text-outline"  />
</div>
<div className="flex-grow">
<div className="flex justify-between">
<h4 className="font-body-md font-semibold">Custom Industrial Brackets</h4>
<span className="font-label-md">$750.00</span>
</div>
<p className="text-body-sm text-on-surface-variant">Custom fabrication based on provided CAD specs.</p>
<div className="mt-2 inline-block px-2 py-0.5 bg-primary-container/20 text-on-primary-fixed-variant rounded text-[10px] font-bold uppercase">Custom Request</div>
</div>
</div>
<div className="ml-24 flex gap-2">
<div className="w-16 h-16 rounded-md border border-outline-variant overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-16 h-16 rounded-md border border-outline-variant overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-16 h-16 rounded-md border border-outline-variant flex items-center justify-center bg-surface-container text-on-surface-variant">
<span className="text-label-sm">+1</span>
</div>
</div>
</div>
</div>
</div>
</div>
</div>

<div className="tab-pane hidden" id="content-shipments">
<div className="space-y-stack-lg">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm p-stack-lg">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg border-b border-outline-variant pb-4">
<div className="flex items-center gap-4">
<div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
<Truck className=""  />
</div>
<div>
<h4 className="font-label-md font-bold text-headline-md">Shipment #SH-8821</h4>
<p className="text-body-sm text-on-surface-variant">Via FedEx Ground</p>
</div>
</div>
<div className="text-right">
<p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Tracking Number</p>
<p className="font-body-md font-semibold text-primary underline">7728 1002 4432</p>
</div>
</div>
<div className="mb-stack-lg">
<div className="relative pt-8 pb-4">

<div className="absolute top-10 left-4 right-4 h-1 bg-surface-container-high"></div>
<div className="absolute top-10 left-4 w-1/2 h-1 bg-secondary"></div>
<div className="relative flex justify-between items-center text-center">
<div className="flex flex-col items-center gap-2">
<div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs">
<Check className="text-[14px]" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<span className="text-body-sm font-semibold">Ordered</span>
</div>
<div className="flex flex-col items-center gap-2">
<div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs">
<Check className="text-[14px]" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<span className="text-body-sm font-semibold">Shipped</span>
</div>
<div className="flex flex-col items-center gap-2">
<div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs">
<div className="w-2 h-2 rounded-full bg-outline"></div>
</div>
<span className="text-body-sm text-on-surface-variant">In Transit</span>
</div>
<div className="flex flex-col items-center gap-2">
<div className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-xs">
<div className="w-2 h-2 rounded-full bg-outline"></div>
</div>
<span className="text-body-sm text-on-surface-variant">Delivered</span>
</div>
</div>
</div>
</div>
<div>
<h5 className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-stack-sm">Items in this shipment</h5>
<div className="flex gap-4">
<div className="flex -space-x-4">
<div className="w-12 h-12 rounded-lg border-2 border-white overflow-hidden bg-surface-container">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-12 h-12 rounded-lg border-2 border-white overflow-hidden bg-surface-container">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
</div>
<div className="flex flex-col justify-center">
<span className="font-body-md">Enterprise Hub v4, Custom Industrial Brackets</span>
<span className="text-body-sm text-on-surface-variant">Total Weight: 4.2 lbs</span>
</div>
</div>
</div>
</div>
</div>
</div>

<div className="tab-pane hidden" id="content-timeline">
<div className="max-w-3xl">
<div className="relative pl-8 space-y-stack-xl before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant">

<div className="relative">
<div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-primary-container flex items-center justify-center border-4 border-surface">
<Bell className="text-[12px] text-white" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<div>
<p className="font-label-md text-label-md">Order Processing Started</p>
<p className="text-body-sm text-on-surface-variant mb-2">Oct 25, 2023 • 10:45 AM</p>
<div className="bg-surface-container-low p-stack-sm rounded-lg text-body-sm border border-outline-variant">
                                System confirmed all seller stock levels and allocated inventory.
                            </div>
</div>
</div>

<div className="relative">
<div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center border-4 border-surface">
<CreditCard className="text-[12px] text-on-secondary-container" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<div>
<p className="font-label-md text-label-md">Payment Authorized</p>
<p className="text-body-sm text-on-surface-variant mb-1">Oct 24, 2023 • 04:12 PM</p>
<p className="text-body-sm">Transaction #AUTH-9022-X1 successfully processed for $2,816.50</p>
</div>
</div>

<div className="relative">
<div className="absolute -left-8 top-1.5 w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center border-4 border-surface">
<ShoppingCart className="text-[12px] text-on-surface-variant" style={{ "fontVariationSettings": "'FILL' 1" }} />
</div>
<div>
<p className="font-label-md text-label-md">Order Placed</p>
<p className="text-body-sm text-on-surface-variant mb-1">Oct 24, 2023 • 04:10 PM</p>
<p className="text-body-sm">Buyer Jonathan Harker submitted the order.</p>
</div>
</div>
</div>
</div>
</div>

<div className="tab-pane hidden p-20 text-center opacity-50" id="content-payments">
<CreditCard className="text-6xl mb-4"  />
<p className="text-headline-md">Payment History &amp; Settings</p>
<p className="text-body-md">Financial records for this order are being updated.</p>
</div>
<div className="tab-pane hidden p-20 text-center opacity-50" id="content-issues">
<HelpCircle className="text-6xl mb-4"  />
<p className="text-headline-md">Issue Tracking</p>
<p className="text-body-md">No issues reported for this order yet.</p>
</div>
</main>
      </div>
    </div>
  );
}
