'use client';

import React, { useState } from 'react';
import { HelpCircle, ShoppingBag, Download, Filter, X, MoreVertical, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.auditTrail.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-[60] flex flex-col h-full w-80 bg-surface-container-low border-r border-outline-variant transition-all duration-300 ease-in-out shadow-xl">
<div className="p-margin-mobile flex flex-col h-full">
<div className="mb-stack-xl px-4 py-3 flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
<HelpCircle className=""  />
</div>
<div>
<h2 className="font-headline-md text-headline-md text-primary">Gova User</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">Role Switcher</p>
</div>
</div>
<nav className="flex flex-col gap-1">
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-colors flex items-center gap-4" href="#">
<ShoppingBag className=""  />
<span className="font-body-md text-body-md">Buyer View</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-colors flex items-center gap-4" href="#">
<HelpCircle className=""  />
<span className="font-body-md text-body-md">Seller Dashboard</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest rounded-full transition-colors flex items-center gap-4" href="#">
<HelpCircle className=""  />
<span className="font-body-md text-body-md">Carrier Portal</span>
</a>
<a className="bg-secondary-container text-on-secondary-container font-bold rounded-full mx-2 px-4 py-3 flex items-center gap-4" href="#">
<HelpCircle className=""  />
<span className="font-body-md text-body-md">Admin Panel</span>
</a>
</nav>
<div className="mt-auto px-6 py-4 border-t border-outline-variant">
<span className="text-on-surface-variant font-label-sm text-label-sm">v1.0.4</span>
</div>
</div>
</aside>



<main className="flex-1 md:ml-80 p-margin-mobile md:p-margin-desktop space-y-stack-lg">

<div className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
<div className="space-y-stack-xs">
<h2 className="font-headline-lg text-headline-lg text-primary">{t('marketplaceOrders.auditTrail.title')}</h2>
<p className="font-body-md text-body-md text-on-surface-variant">{t('marketplaceOrders.auditTrail.description')}</p>
</div>
<div className="flex items-center gap-gutter">
<button className="h-touch-target px-stack-lg bg-surface-container border border-outline-variant rounded-xl text-primary font-label-md flex items-center gap-2 hover:bg-surface-container-high transition-all">
<Download className=""  /> {t('marketplaceOrders.auditTrail.exportCSV')}
                </button>
<button className="h-touch-target px-stack-lg bg-primary text-on-primary rounded-xl font-label-md flex items-center gap-2 shadow-lg active:scale-95 transition-all">
<Filter className=""  /> {t('marketplaceOrders.auditTrail.filters')}
                </button>
</div>
</div>

<div className="flex gap-2 overflow-x-auto py-2 custom-scrollbar">
<span className="px-4 py-1.5 bg-primary-container text-on-primary-container rounded-full font-label-sm flex items-center gap-2 cursor-pointer">
                {t('marketplaceOrders.auditTrail.allEvents')} <X className="text-[16px]"  />
</span>
<span className="px-4 py-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-full font-label-sm hover:border-primary transition-colors cursor-pointer">
                {t('marketplaceOrders.auditTrail.security')}
            </span>
<span className="px-4 py-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-full font-label-sm hover:border-primary transition-colors cursor-pointer">
                {t('marketplaceOrders.auditTrail.financial')}
            </span>
<span className="px-4 py-1.5 bg-surface-container border border-outline-variant text-on-surface-variant rounded-full font-label-sm hover:border-primary transition-colors cursor-pointer">
                {t('marketplaceOrders.auditTrail.systemUpdates')}
            </span>
</div>

<div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
<div className="overflow-x-auto custom-scrollbar">
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low border-b border-outline-variant">
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.auditTrail.timestamp')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.auditTrail.action')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.auditTrail.performedBy')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.auditTrail.oldValue')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.auditTrail.newValue')}</th>
<th className="px-6 py-4"></th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant">

<tr className="audit-row transition-colors">
<td className="px-6 py-5 whitespace-nowrap">
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">Oct 24, 2023</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">14:22:15 UTC</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-secondary"></span>
<span className="font-label-md text-label-md text-secondary">{t('marketplaceOrders.auditTrail.priceAdjustment')}</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-[12px] font-bold">JD</div>
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">John Doe</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Pricing Manager</span>
</div>
</div>
</td>
<td className="px-6 py-5">
<span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded font-label-sm border border-outline-variant line-through opacity-70">$1,240.00</span>
</td>
<td className="px-6 py-5">
<span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded font-label-sm border border-secondary/20">$1,150.00</span>
</td>
<td className="px-6 py-5 text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors">
<MoreVertical className=""  />
</button>
</td>
</tr>

<tr className="audit-row transition-colors">
<td className="px-6 py-5 whitespace-nowrap">
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">Oct 24, 2023</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">13:05:44 UTC</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-error"></span>
<span className="font-label-md text-label-md text-error">{t('marketplaceOrders.auditTrail.accessRevoked')}</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center text-[12px] font-bold">SY</div>
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">System Agent</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Automated Task</span>
</div>
</div>
</td>
<td className="px-6 py-5">
<span className="font-body-sm text-body-sm italic text-on-surface-variant">Role: Editor</span>
</td>
<td className="px-6 py-5">
<span className="font-body-sm text-body-sm font-bold text-error">Status: Terminated</span>
</td>
<td className="px-6 py-5 text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors">
<MoreVertical className=""  />
</button>
</td>
</tr>

<tr className="audit-row transition-colors">
<td className="px-6 py-5 whitespace-nowrap">
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">Oct 24, 2023</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">11:59:02 UTC</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-primary"></span>
<span className="font-label-md text-label-md text-primary">{t('marketplaceOrders.auditTrail.statusChange')}</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-[12px] font-bold">SW</div>
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">Sarah Williams</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Dispatch</span>
</div>
</div>
</td>
<td className="px-6 py-5">
<span className="px-3 py-1 bg-surface-variant text-on-surface-variant rounded font-label-sm">In Warehouse</span>
</td>
<td className="px-6 py-5">
<span className="px-3 py-1 bg-primary-container text-on-primary-container rounded font-label-sm">Out for Delivery</span>
</td>
<td className="px-6 py-5 text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors">
<MoreVertical className=""  />
</button>
</td>
</tr>

<tr className="audit-row transition-colors">
<td className="px-6 py-5 whitespace-nowrap">
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">Oct 24, 2023</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">09:12:33 UTC</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-on-tertiary-container"></span>
<span className="font-label-md text-label-md text-on-tertiary-container">{t('marketplaceOrders.auditTrail.metadataEdit')}</span>
</div>
</td>
<td className="px-6 py-5">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center text-[12px] font-bold">MK</div>
<div className="flex flex-col">
<span className="font-body-md text-body-md text-on-surface">Mike Ross</span>
<span className="font-label-sm text-label-sm text-on-surface-variant">Admin</span>
</div>
</div>
</td>
<td className="px-6 py-5">
<span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-[120px] block">Fragile: False</span>
</td>
<td className="px-6 py-5">
<span className="font-body-sm text-body-sm font-bold text-on-surface truncate max-w-[120px] block">Fragile: True</span>
</td>
<td className="px-6 py-5 text-right">
<button className="text-on-surface-variant hover:text-primary transition-colors">
<MoreVertical className=""  />
</button>
</td>
</tr>
</tbody>
</table>
</div>

<div className="bg-surface-container-low px-6 py-4 flex items-center justify-between border-t border-outline-variant">
<span className="font-label-sm text-label-sm text-on-surface-variant">{t('marketplaceOrders.auditTrail.showingEvents', {start: 1, end: 10, total: 2492})}</span>
<div className="flex gap-1">
<button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface-variant transition-all">
<ChevronLeft className=""  />
</button>
<button className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary text-on-primary font-bold">1</button>
<button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface-variant transition-all">2</button>
<button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface-variant transition-all">3</button>
<button className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-surface-container-high text-on-surface-variant transition-all">
<ChevronRight className=""  />
</button>
</div>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mt-stack-xl">
<div className="bg-surface-container-low p-stack-lg rounded-xl border border-outline-variant flex flex-col gap-1">
<span className="font-label-md text-label-md text-on-surface-variant">{t('marketplaceOrders.auditTrail.dailyActivity')}</span>
<span className="font-headline-lg text-headline-lg text-primary">+12.4%</span>
<div className="w-full h-1 bg-surface-variant rounded-full mt-2">
<div className="h-full bg-primary rounded-full w-[65%]"></div>
</div>
</div>
<div className="bg-surface-container-low p-stack-lg rounded-xl border border-outline-variant flex flex-col gap-1">
<span className="font-label-md text-label-md text-on-surface-variant">{t('marketplaceOrders.auditTrail.securityAlerts')}</span>
<span className="font-headline-lg text-headline-lg text-error">02</span>
<p className="font-body-sm text-body-sm text-on-surface-variant mt-2">{t('marketplaceOrders.auditTrail.criticalEvents')}</p>
</div>
<div className="bg-surface-container-low p-stack-lg rounded-xl border border-outline-variant flex flex-col gap-1">
<span className="font-label-md text-label-md text-on-surface-variant">{t('marketplaceOrders.auditTrail.logIntegrity')}</span>
<span className="font-headline-lg text-headline-lg text-secondary">{t('marketplaceOrders.auditTrail.verified')}</span>
<div className="flex items-center gap-1 mt-2 text-secondary">
<ShieldCheck className="text-[16px]"  />
<span className="font-label-sm text-label-sm">{t('marketplaceOrders.auditTrail.hashChainValid')}</span>
</div>
</div>
</div>
</main>
      </div>
    </div>
  );
}
