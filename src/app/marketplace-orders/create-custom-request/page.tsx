'use client';

import React, { useState } from 'react';
import { User, ShoppingBag, HelpCircle, Search, X, Truck, Info } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Create Custom Request</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex flex-col h-full w-80 bg-surface-container-low dark:bg-inverse-surface shadow-xl dark:shadow-none transition-all duration-300 ease-in-out mt-touch-target">
<div className="p-stack-lg flex items-center gap-stack-md">
<div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center">
<User className="text-on-secondary-fixed" data-icon="account_circle" />
</div>
<div>
<p className="font-headline-md text-headline-md text-on-surface">Gova User</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Role Switcher</p>
</div>
</div>
<nav className="flex-1 px-2 space-y-1">
<div className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 flex items-center gap-stack-md hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full cursor-pointer transition-all">
<ShoppingBag className="" data-icon="shopping_bag" />
<span className="font-body-md text-body-md">Buyer View</span>
</div>
<div className="bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary font-bold rounded-full mx-2 px-4 py-3 flex items-center gap-stack-md cursor-pointer">
<HelpCircle className="" data-icon="storefront" />
<span className="font-body-md text-body-md">Seller Dashboard</span>
</div>
<div className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 flex items-center gap-stack-md hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full cursor-pointer transition-all">
<HelpCircle className="" data-icon="speed" />
<span className="font-body-md text-body-md">Carrier Portal</span>
</div>
<div className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 flex items-center gap-stack-md hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full cursor-pointer transition-all">
<HelpCircle className="" data-icon="admin_panel_settings" />
<span className="font-body-md text-body-md">Admin Panel</span>
</div>
</nav>
<div className="p-stack-lg border-t border-outline-variant">
<p className="text-label-sm font-label-sm text-outline">v1.0.4</p>
</div>
</aside>

<main className="flex-1 pt-20 pb-10 md:ml-80 px-margin-mobile md:px-margin-desktop bg-background min-h-screen">

<div className="max-w-4xl mx-auto mb-stack-xl">
<h1 className="font-headline-xl text-headline-xl md:font-headline-xl md:text-headline-xl font-bold text-primary mb-2">Create Custom Request</h1>
<p className="font-body-lg text-body-lg text-on-surface-variant">Describe what you need and upload images only</p>
</div>

<div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

<section className="lg:col-span-2 space-y-stack-lg">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md border-b border-outline-variant pb-2">Request Details</h2>
<div className="space-y-stack-md">
<div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-1">Request type</label>
<select className="w-full h-[48px] px-4 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary-container bg-surface outline-none transition-all">
<option>Pharmacy</option>
<option>Supermarket</option>
<option>Electronics</option>
<option>Specialty Goods</option>
<option>Hardware</option>
</select>
</div>
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-1">Seller selector</label>
<div className="relative">
<input className="w-full h-[48px] px-4 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary-container bg-surface outline-none transition-all" placeholder="Search sellers..." type="text"/>
<Search className="absolute right-3 top-3 text-outline" data-icon="search" />
</div>
</div>
</div>
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-1">Title</label>
<input className="w-full h-[48px] px-4 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary-container bg-surface outline-none transition-all" placeholder="e.g., Bulk order of organic supplement X" type="text"/>
</div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-stack-md">
<div className="md:col-span-3">
<label className="block font-label-md text-label-md text-on-surface-variant mb-1">Description</label>
<textarea className="w-full p-4 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary-container bg-surface outline-none transition-all" placeholder="Describe the item in detail..." rows={4}></textarea>
</div>
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-1">Quantity</label>
<input className="w-full h-[48px] px-4 rounded-lg border border-outline focus:border-primary focus:ring-2 focus:ring-primary-container bg-surface outline-none transition-all" min={1} type="number" value="1"/>
</div>
</div>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<div className="flex items-center justify-between mb-stack-sm">
<h2 className="font-headline-md text-headline-md text-on-surface">Upload Images</h2>
<span className="text-label-sm font-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded">Images Only</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">Upload clear images only. Videos, PDFs, and documents are not supported.</p>

<div className="border-2 border-dashed border-outline-variant rounded-xl p-stack-xl flex flex-col items-center justify-center bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer group mb-stack-md">
<HelpCircle className="text-primary text-4xl mb-2 group-hover:scale-110 transition-transform" data-icon="cloud_upload" />
<p className="font-label-md text-label-md text-on-surface font-bold">High-visibility Upload Images</p>
<p className="font-body-sm text-body-sm text-outline">Drag &amp; Drop or Click to browse</p>
</div>

<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">

<div className="relative aspect-square rounded-lg overflow-hidden group">
<div className="w-full h-full bg-cover bg-center" style={{ "backgroundImage": "none" }}></div>
<button className="absolute top-1 right-1 bg-error text-on-error w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
<X className="text-[16px]" data-icon="close" />
</button>
</div>

<div className="relative aspect-square rounded-lg overflow-hidden group">
<div className="w-full h-full bg-cover bg-center" style={{ "backgroundImage": "none" }}></div>
<button className="absolute top-1 right-1 bg-error text-on-error w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
<X className="text-[16px]" data-icon="close" />
</button>
</div>

<div className="aspect-square rounded-lg border border-outline-variant flex items-center justify-center bg-surface-container-low border-dashed">
<HelpCircle className="text-outline" data-icon="add_photo_alternate" />
</div>
</div>
</div>
</section>

<aside className="space-y-stack-lg">

<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-sm">
<h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Transport Requirements</h2>
<div className="space-y-stack-md">
<label className="flex items-center justify-between cursor-pointer group">
<div className="flex items-center gap-3">
<Truck className="text-primary" data-icon="local_shipping" />
<span className="font-body-md text-body-md text-on-surface">Special Vehicle</span>
</div>
<input className="w-6 h-6 rounded-md border-outline text-primary focus:ring-primary" type="checkbox"/>
</label>
<label className="flex items-center justify-between cursor-pointer group">
<div className="flex items-center gap-3">
<HelpCircle className="text-primary" data-icon="ac_unit" />
<span className="font-body-md text-body-md text-on-surface">Refrigeration</span>
</div>
<input className="w-6 h-6 rounded-md border-outline text-primary focus:ring-primary" type="checkbox"/>
</label>
<label className="flex items-center justify-between cursor-pointer group">
<div className="flex items-center gap-3">
<HelpCircle className="text-primary" data-icon="minor_crash" />
<span className="font-body-md text-body-md text-on-surface">Fragile</span>
</div>
<input className="w-6 h-6 rounded-md border-outline text-primary focus:ring-primary" type="checkbox"/>
</label>
</div>
</div>

<div className="bg-primary-container text-on-primary-container p-stack-lg rounded-xl">
<div className="flex items-center gap-2 mb-2">
<Info className="" data-icon="info" />
<p className="font-label-md text-label-md">Guideline</p>
</div>
<p className="font-body-sm text-body-sm opacity-90">Custom requests are reviewed by our logistics specialists. Ensure your images show the full item and any relevant SKU or barcodes for faster processing.</p>
</div>

<button className="hidden lg:flex w-full bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary h-[56px] items-center justify-center rounded-xl font-bold transition-all shadow-md active:scale-95">
                    Send Request
                </button>
</aside>
</div>
</main>

<div className="lg:hidden fixed bottom-16 left-0 w-full bg-surface-container-lowest p-stack-md border-t border-outline-variant z-40">
<button className="w-full bg-primary text-on-primary h-[48px] rounded-xl font-bold shadow-lg transition-transform active:scale-95">
            Send Request
        </button>
</div>
      </div>
    </div>
  );
}
