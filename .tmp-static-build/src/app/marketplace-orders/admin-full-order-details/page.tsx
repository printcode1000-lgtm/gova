'use client';

import React, { useState } from 'react';
import { HelpCircle, ShoppingBag, Truck, ChevronRight, Gavel, ShieldCheck, Info, ChevronDown, Package, Image, User } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.adminFullOrderDetails.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <div className="flex pt-16">

<aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-surface-container-low flex-col py-6 border-r border-outline-variant">
<div className="px-6 mb-8">
<p className="text-label-sm font-label-sm text-outline uppercase tracking-wider">{t('marketplaceOrders.adminDisputes.adminPanel')}</p>
<p className="text-body-md font-body-md font-bold text-primary">{t('marketplaceOrders.adminFullOrderDetails.systemOverlook')}</p>
</div>
<nav className="flex-1 space-y-1">
<a className="bg-secondary-container text-on-secondary-container font-bold rounded-full mx-2 px-4 py-3 flex items-center gap-3 transition-all" href="#">
<HelpCircle className=""  />
<span className="text-body-md font-body-md">{t('marketplaceOrders.adminDisputes.adminPanel')}</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 flex items-center gap-3 hover:bg-surface-container-highest rounded-full transition-all" href="#">
<ShoppingBag className=""  />
<span className="text-body-md font-body-md">{t('marketplaceOrders.adminDisputes.buyerView')}</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 flex items-center gap-3 hover:bg-surface-container-highest rounded-full transition-all" href="#">
<HelpCircle className=""  />
<span className="text-body-md font-body-md">{t('marketplaceOrders.adminDisputes.sellerDashboard')}</span>
</a>
<a className="text-on-surface-variant mx-2 px-4 py-3 flex items-center gap-3 hover:bg-surface-container-highest rounded-full transition-all" href="#">
<Truck className=""  />
<span className="text-body-md font-body-md">{t('marketplaceOrders.adminDisputes.carrierPortal')}</span>
</a>
</nav>
<div className="p-6 border-t border-outline-variant">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
<HelpCircle className=""  />
</div>
<div>
<p className="text-label-md font-label-md text-on-surface">Admin User</p>
<p className="text-label-sm font-label-sm text-outline">v1.0.4</p>
</div>
</div>
</div>
</aside>

<main className="flex-1 ml-0 md:ml-64 p-margin-mobile md:p-margin-desktop">

<div className="flex flex-col md:flex-row md:items-center justify-between mb-stack-lg gap-4">
<div>
<div className="flex items-center gap-2 text-label-sm font-label-sm text-outline mb-1">
<span>{t('marketplaceOrders.adminFullOrderDetails.orders')}</span>
<ChevronRight className="text-[14px]"  />
<span>#ORD-99210-GX</span>
</div>
<h1 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg text-primary">{t('marketplaceOrders.adminFullOrderDetails.orderGodView')}</h1>
</div>
<div className="flex items-center gap-3">
<button className="px-4 h-11 border border-outline rounded-lg text-label-md font-label-md text-on-surface-variant hover:bg-surface-container transition-colors flex items-center gap-2">
<HelpCircle className=""  />
                        {t('marketplaceOrders.adminFullOrderDetails.adjustFees')}
                    </button>
<button className="px-4 h-11 bg-primary text-on-primary rounded-lg text-label-md font-label-md hover:bg-primary-container transition-colors flex items-center gap-2 shadow-sm">
<Gavel className=""  />
                        {t('marketplaceOrders.adminFullOrderDetails.openDisputeIntervention')}
                    </button>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-xl">

<div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between">
<div className="flex justify-between items-start mb-4">
<div>
<p className="text-label-sm font-label-sm text-outline uppercase">{t('marketplaceOrders.adminFullOrderDetails.globalOrderStatus')}</p>
<h2 className="text-headline-md font-headline-md text-primary mt-1">{t('marketplaceOrders.adminFullOrderDetails.processing')}</h2>
</div>
<span className="bg-secondary/15 text-secondary px-3 py-1 rounded-full text-label-sm font-label-sm">{t('marketplaceOrders.adminFullOrderDetails.highValue')}</span>
</div>
<div className="flex items-center gap-6">
<div className="flex-1">
<p className="text-label-sm font-label-sm text-outline">{t('marketplaceOrders.adminFullOrderDetails.totalValue')}</p>
<p className="text-headline-md font-headline-md text-on-surface">$14,240.50</p>
</div>
<div className="flex-1">
<p className="text-label-sm font-label-sm text-outline">{t('marketplaceOrders.adminFullOrderDetails.buyer')}</p>
<p className="text-body-md font-body-md font-semibold text-on-surface">Acme Corp Logistics</p>
</div>
</div>
</div>

<div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center">
<p className="text-label-sm font-label-sm text-outline mb-1">{t('marketplaceOrders.adminFullOrderDetails.escrowBalance')}</p>
<p className="text-headline-md font-headline-md text-on-secondary-container">$12,104.00</p>
<div className="mt-4 flex items-center gap-2 text-secondary text-label-sm font-label-sm">
<ShieldCheck className="text-[16px]"  />
                        {t('marketplaceOrders.adminFullOrderDetails.securelyHeld')}
                    </div>
</div>
<div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center">
<p className="text-label-sm font-label-sm text-outline mb-1">{t('marketplaceOrders.adminFullOrderDetails.sellersInvolved')}</p>
<p className="text-headline-md font-headline-md text-primary">{t('marketplaceOrders.adminFullOrderDetails.managedEntities')}</p>
<div className="mt-4 flex items-center gap-2 text-tertiary-container text-label-sm font-label-sm">
<Info className="text-[16px]"  />
                        {t('marketplaceOrders.adminFullOrderDetails.sellerBreakdown')}
                    </div>
</div>
</div>

<div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
<div className="flex border-b border-outline-variant overflow-x-auto no-scrollbar">
<button className="px-6 py-4 text-label-md font-label-md active-tab whitespace-nowrap">{t('marketplaceOrders.adminFullOrderDetails.overview')}</button>
<button className="px-6 py-4 text-label-md font-label-md text-on-surface-variant hover:text-primary whitespace-nowrap">{t('marketplaceOrders.adminFullOrderDetails.sellers')}</button>
<button className="px-6 py-4 text-label-md font-label-md text-on-surface-variant hover:text-primary whitespace-nowrap">{t('marketplaceOrders.adminFullOrderDetails.shipments')}</button>
<button className="px-6 py-4 text-label-md font-label-md text-on-surface-variant hover:text-primary whitespace-nowrap">{t('marketplaceOrders.adminFullOrderDetails.payments')}</button>
<button className="px-6 py-4 text-label-md font-label-md text-on-surface-variant hover:text-primary whitespace-nowrap">{t('marketplaceOrders.adminFullOrderDetails.auditTrail')}</button>
</div>
<div className="p-6">

<div className="space-y-6">
<div className="flex items-center gap-2 mb-4">
<HelpCircle className="text-primary"  />
<h3 className="text-headline-md font-headline-md text-on-surface">{t('marketplaceOrders.adminFullOrderDetails.orderHierarchyVisibility')}</h3>
</div>

<div className="border border-outline-variant rounded-lg overflow-hidden">
<div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant">
<div className="flex items-center gap-3">
<ChevronDown className="text-outline"  />
<span className="text-body-md font-bold text-on-surface">SellerOrder #SO-101 (Global Tech Ltd)</span>
<span className="bg-secondary-fixed-dim text-on-secondary-fixed text-[11px] px-2 py-0.5 rounded-full font-bold">READY</span>
</div>
<div className="text-label-md font-bold text-primary">$8,500.00</div>
</div>
<div className="p-0">
<table className="w-full text-left">
<thead className="bg-surface text-label-sm font-label-sm text-outline border-b border-outline-variant">
<tr>
<th className="px-10 py-3">{t('marketplaceOrders.adminFullOrderDetails.lineItem')}</th>
<th className="px-4 py-3">{t('marketplaceOrders.adminFullOrderDetails.quantity')}</th>
<th className="px-4 py-3">{t('marketplaceOrders.adminFullOrderDetails.unitPrice')}</th>
<th className="px-4 py-3 text-right">{t('marketplaceOrders.adminFullOrderDetails.total')}</th>
</tr>
</thead>
<tbody className="text-body-sm font-body-sm text-on-surface-variant">
<tr className="border-b border-outline-variant hover:bg-surface transition-colors">
<td className="px-10 py-4 flex items-center gap-3">
<div className="w-10 h-10 rounded-md bg-surface-variant overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<span>Industrial PLC Controller v4</span>
</td>
<td className="px-4 py-4">10 Units</td>
<td className="px-4 py-4">$750.00</td>
<td className="px-4 py-4 text-right font-bold text-on-surface">$7,500.00</td>
</tr>
<tr className="hover:bg-surface transition-colors">
<td className="px-10 py-4 flex items-center gap-3">
<div className="w-10 h-10 rounded-md bg-surface-variant overflow-hidden">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<span>Connector Harness Bundle</span>
</td>
<td className="px-4 py-4">20 Units</td>
<td className="px-4 py-4">$50.00</td>
<td className="px-4 py-4 text-right font-bold text-on-surface">$1,000.00</td>
</tr>
</tbody>
</table>
</div>
</div>

<div className="border border-outline-variant rounded-lg overflow-hidden">
<div className="bg-surface-container-low px-4 py-3 flex items-center justify-between border-b border-outline-variant">
<div className="flex items-center gap-3">
<ChevronRight className="text-outline"  />
<span className="text-body-md font-bold text-on-surface">SellerOrder #SO-102 (Pioneer Parts)</span>
<span className="bg-tertiary-fixed-dim text-on-tertiary-fixed text-[11px] px-2 py-0.5 rounded-full font-bold uppercase">Pending</span>
</div>
<div className="text-label-md font-bold text-primary">$5,740.50</div>
</div>
</div>

<div className="mt-10 max-w-md ml-auto">
<h4 className="text-label-md font-label-md text-outline uppercase mb-4 border-b border-outline-variant pb-2">{t('marketplaceOrders.adminFullOrderDetails.financialSummary')}</h4>
<div className="space-y-0 text-body-md">
<div className="flex justify-between py-2 px-3 bg-surface">
<span>{t('marketplaceOrders.adminFullOrderDetails.subtotal')}</span>
<span>$13,240.50</span>
</div>
<div className="flex justify-between py-2 px-3">
<span>{t('marketplaceOrders.adminFullOrderDetails.platformFee')}</span>
<span>$331.00</span>
</div>
<div className="flex justify-between py-2 px-3 bg-surface">
<span>{t('marketplaceOrders.adminFullOrderDetails.logisticsInsurance')}</span>
<span>$669.00</span>
</div>
<div className="flex justify-between py-4 px-3 border-t-2 border-primary text-primary font-bold">
<span className="text-headline-md font-headline-md">{t('marketplaceOrders.adminFullOrderDetails.totalAmount')}</span>
<span className="text-headline-md font-headline-md">$14,240.50</span>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
</div>

<footer className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest flex justify-around items-center h-16 px-2 border-t border-outline-variant z-50">
<a className="flex flex-col items-center justify-center text-on-surface-variant py-1" href="#">
<Package className=""  />
<span className="font-label-sm text-label-sm">{t('marketplaceOrders.adminFullOrderDetails.orders')}</span>
</a>
<a className="flex flex-col items-center justify-center text-on-surface-variant py-1" href="#">
<Truck className=""  />
<span className="font-label-sm text-label-sm">{t('marketplaceOrders.adminFullOrderDetails.shipments')}</span>
</a>
<a className="flex flex-col items-center justify-center text-on-surface-variant py-1" href="#">
<Image className=""  />
<span className="font-label-sm text-label-sm">{t('marketplaceOrders.adminFullOrderDetails.requests')}</span>
</a>
<a className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-xl px-4 py-1" href="#">
<User className=""  />
<span className="font-label-sm text-label-sm">{t('marketplaceOrders.adminFullOrderDetails.profile')}</span>
</a>
</footer>
      </div>
    </div>
  );
}
