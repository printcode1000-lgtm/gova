'use client';

import React, { useState } from 'react';
import { ShoppingBag, HelpCircle, Filter, Download, User, Gavel } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full asol-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.adminDisputes.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex flex-col bg-surface-container-low dark:bg-inverse-surface h-full w-80 rounded-r-xl shadow-xl transition-all duration-300 ease-in-out -translate-x-full lg:translate-x-0">
<div className="p-6 flex flex-col gap-6">
<div className="flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-secondary-container overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<h2 className="text-on-surface font-headline-md text-headline-md">{t('marketplaceOrders.adminDisputes.adminPanel')}</h2>
<p className="text-on-surface-variant font-body-sm text-body-sm">{t('marketplaceOrders.adminDisputes.globalOversight')}</p>
</div>
</div>
<nav className="flex flex-col gap-1">
<div className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full cursor-pointer flex items-center gap-3 transition-all">
<ShoppingBag className="" data-icon="shopping_bag" />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.buyerView')}</span>
</div>
<div className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full cursor-pointer flex items-center gap-3 transition-all">
<HelpCircle className="" data-icon="storefront" />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.sellerDashboard')}</span>
</div>
<div className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full cursor-pointer flex items-center gap-3 transition-all">
<HelpCircle className="" data-icon="speed" />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.carrierPortal')}</span>
</div>
<div className="bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary font-bold rounded-full mx-2 px-4 py-3 flex items-center gap-3">
<HelpCircle className="" data-icon="admin_panel_settings" />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.adminPanel')}</span>
</div>
</nav>
</div>
<div className="mt-auto p-6 border-t border-outline-variant">
<span className="text-on-surface-variant font-label-sm text-label-sm">System v1.0.4</span>
</div>
</aside>

<main className="lg:ml-80 p-margin-mobile md:p-margin-desktop space-y-stack-lg">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
<div>
<h2 className="font-headline-xl text-headline-xl text-primary">{t('marketplaceOrders.adminDisputes.disputeResolution')}</h2>
<p className="font-body-md text-body-md text-on-surface-variant mt-2">{t('marketplaceOrders.adminDisputes.disputeResolutionDesc')}</p>
</div>
<div className="flex gap-stack-sm">
<button className="h-touch-target px-6 bg-surface-container-high rounded-lg text-primary font-label-md flex items-center gap-2 hover:bg-surface-container-highest transition-colors">
<Filter className="" data-icon="filter_list" />
                    {t('marketplaceOrders.adminDisputes.filter')}
                </button>
<button className="h-touch-target px-6 bg-primary text-on-primary rounded-lg font-label-md flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity">
<Download className="" data-icon="download" />
                    {t('marketplaceOrders.adminDisputes.exportReport')}
                </button>
</div>
</div>

<div className="bento-grid">

<div className="col-span-12 lg:col-span-4 space-y-stack-md">
<h3 className="font-headline-md text-headline-md text-on-surface-variant px-2">{t('marketplaceOrders.adminDisputes.activeQueue')}</h3>

<div className="space-y-stack-sm h-[700px] overflow-y-auto pr-2 custom-scrollbar">

<div className="p-4 bg-surface-container-highest border-l-4 border-primary rounded-xl shadow-sm cursor-pointer transition-all">
<div className="flex justify-between items-start mb-2">
<span className="px-2 py-1 bg-error/15 text-error text-[10px] font-bold rounded uppercase tracking-wider">{t('marketplaceOrders.adminDisputes.critical')}</span>
<span className="text-label-sm text-on-surface-variant">#DSP-9042</span>
</div>
<h4 className="font-headline-md text-[16px] text-on-surface leading-tight">Damaged Industrial Generator Delivery</h4>
<div className="flex items-center gap-2 mt-3 text-body-sm text-on-surface-variant">
<User className="text-[18px]" data-icon="person" />
<span>Nexus Corp vs. SwiftLogistics</span>
</div>
<div className="flex justify-between items-center mt-4">
<span className="text-primary font-bold text-label-md">$4,250.00</span>
<span className="text-on-surface-variant text-[11px]">Updated 2m ago</span>
</div>
</div>

<div className="p-4 bg-white border border-outline-variant rounded-xl hover:shadow-md transition-all cursor-pointer">
<div className="flex justify-between items-start mb-2">
<span className="px-2 py-1 bg-tertiary-container/15 text-tertiary-fixed-dim text-[10px] font-bold rounded uppercase tracking-wider">{t('marketplaceOrders.adminDisputes.pending')}</span>
<span className="text-label-sm text-on-surface-variant">#DSP-8821</span>
</div>
<h4 className="font-headline-md text-[16px] text-on-surface leading-tight">Partial Shipment Shortage - Electronics</h4>
<div className="flex items-center gap-2 mt-3 text-body-sm text-on-surface-variant">
<User className="text-[18px]" data-icon="person" />
<span>TechNode vs. Global Freight</span>
</div>
<div className="flex justify-between items-center mt-4">
<span className="text-primary font-bold text-label-md">$890.00</span>
<span className="text-on-surface-variant text-[11px]">Updated 1h ago</span>
</div>
</div>

<div className="p-4 bg-white border border-outline-variant rounded-xl hover:shadow-md transition-all cursor-pointer">
<div className="flex justify-between items-start mb-2">
<span className="px-2 py-1 bg-secondary-container/15 text-secondary text-[10px] font-bold rounded uppercase tracking-wider">{t('marketplaceOrders.adminDisputes.investigating')}</span>
<span className="text-label-sm text-on-surface-variant">#DSP-8715</span>
</div>
<h4 className="font-headline-md text-[16px] text-on-surface leading-tight">Incorrect Billing - Route Surcharge</h4>
<div className="flex items-center gap-2 mt-3 text-body-sm text-on-surface-variant">
<User className="text-[18px]" data-icon="person" />
<span>Oceanic Traders vs. Apex Carriers</span>
</div>
<div className="flex justify-between items-center mt-4">
<span className="text-primary font-bold text-label-md">$125.00</span>
<span className="text-on-surface-variant text-[11px]">Updated 4h ago</span>
</div>
</div>
</div>
</div>

<div className="col-span-12 lg:col-span-8 space-y-stack-md">

<div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[700px]">

<div className="p-6 border-b border-outline-variant bg-white flex justify-between items-center">
<div>
<h3 className="font-headline-md text-headline-md text-primary">Case #DSP-9042: Damaged Industrial Generator</h3>
<p className="text-body-sm text-on-surface-variant">Created: Oct 24, 2023 | Dispute Type: Property Damage</p>
</div>
<div className="flex -space-x-2">
<div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-10 h-10 rounded-full border-2 border-white bg-primary flex items-center justify-center text-on-primary text-[10px] font-bold">+1</div>
</div>
</div>

<div className="flex-grow overflow-y-auto p-6 space-y-6 bg-surface-container-lowest/50">

<div className="flex flex-col items-start max-w-[85%]">
<div className="flex items-center gap-2 mb-1">
<span className="font-label-md text-label-md text-on-surface">Nexus Corp (Buyer)</span>
<span className="text-on-surface-variant text-[10px]">10:45 AM</span>
</div>
<div className="p-4 bg-white rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-outline-variant shadow-sm text-body-md">
<p>The generator arrived with significant external housing damage. The forklift operator from SwiftLogistics noted it on the BOL, but refused to accept liability. We cannot use this in our production line until it is inspected and repaired.</p>
<div className="mt-4 flex gap-2">
<div className="w-20 h-20 rounded-lg bg-surface-container border border-outline-variant overflow-hidden cursor-zoom-in">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div className="w-20 h-20 rounded-lg bg-surface-container border border-outline-variant overflow-hidden cursor-zoom-in">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
</div>
</div>
</div>

<div className="flex flex-col items-end ml-auto max-w-[85%]">
<div className="flex items-center gap-2 mb-1">
<span className="text-on-surface-variant text-[10px]">11:20 AM</span>
<span className="font-label-md text-label-md text-on-surface">SwiftLogistics (Carrier)</span>
</div>
<div className="p-4 bg-primary text-on-primary rounded-tl-2xl rounded-br-2xl rounded-bl-2xl shadow-sm text-body-md">
<p>Our driver maintains the damage was present during pickup at the seller's facility. We only noted it on delivery because the buyer insisted. We have telematics showing no impact events during the transit route.</p>
</div>
</div>

<div className="flex justify-center">
<span className="px-4 py-1 bg-surface-container-high rounded-full text-[11px] text-on-surface-variant font-medium uppercase tracking-widest italic">{t('marketplaceOrders.adminDisputes.adminEntered')}</span>
</div>

<div className="flex flex-col items-start max-w-[85%]">
<div className="flex items-center gap-2 mb-1">
<span className="font-label-md text-label-md text-secondary font-bold">{t('marketplaceOrders.adminDisputes.adminResolution')}</span>
<span className="text-on-surface-variant text-[10px]">12:05 PM</span>
</div>
<div className="p-4 bg-secondary-container text-on-secondary-container rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-sm text-body-md italic border border-secondary/20">
<p>Reviewing pickup logs and seller-provided pre-shipment photos. Please wait for a formal decision.</p>
</div>
</div>
</div>

<div className="p-6 bg-white border-t-2 border-primary/10">
<div className="flex items-center gap-3 mb-4">
<Gavel className="text-primary" data-icon="gavel" />
<h4 className="font-headline-md text-headline-md text-on-surface">{t('marketplaceOrders.adminDisputes.issueDecision')}</h4>
</div>
<form className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-1">
<label className="font-label-md text-on-surface-variant">{t('marketplaceOrders.adminDisputes.liableParty')}</label>
<select className="w-full h-11 border-outline-variant rounded-lg focus:ring-primary focus:border-primary">
<option>{t('marketplaceOrders.adminDisputes.selectParty')}</option>
<option>{t('marketplaceOrders.adminDisputes.buyer')}</option>
<option>{t('marketplaceOrders.adminDisputes.seller')}</option>
<option>{t('marketplaceOrders.adminDisputes.carrier')}</option>
<option>{t('marketplaceOrders.adminDisputes.splitLiability')}</option>
</select>
</div>
<div className="space-y-1">
<label className="font-label-md text-on-surface-variant">{t('marketplaceOrders.adminDisputes.refundAmount')}</label>
<div className="relative">
<span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
<input className="w-full h-11 pl-8 border-outline-variant rounded-lg focus:ring-primary focus:border-primary" placeholder="0.00" type="number"/>
</div>
</div>
</div>
<div className="space-y-1">
<label className="font-label-md text-on-surface-variant">{t('marketplaceOrders.adminDisputes.justification')}</label>
<textarea className="w-full min-h-[80px] border-outline-variant rounded-lg p-3 focus:ring-primary focus:border-primary" placeholder={t('marketplaceOrders.adminDisputes.justificationPlaceholder')}></textarea>
</div>
<div className="flex justify-end gap-3 pt-2">
<button className="h-11 px-6 text-on-surface-variant font-label-md hover:bg-surface-container rounded-lg transition-all" type="button">{t('marketplaceOrders.adminDisputes.saveDraft')}</button>
<button className="h-11 px-8 bg-primary text-on-primary font-label-md rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all" type="submit">{t('marketplaceOrders.adminDisputes.resolveCase')}</button>
</div>
</form>
</div>
</div>
</div>
</div>
</main>
      </div>
    </div>
  );
}
