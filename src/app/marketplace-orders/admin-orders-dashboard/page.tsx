'use client';

import React, { useState } from 'react';
import { Package, ShoppingBag, HelpCircle, CreditCard, Search, Filter, Calendar, MoreVertical, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';
import { useTranslation } from '@/lib/i18n';

export default function Page() {
  const { t } = useTranslation();
  return (
    <div className="w-full asol-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">{t('marketplaceOrders.adminOrdersDashboard.title')}</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">{t('marketplaceOrders.stitchScreen')}</span>
        </div>
        
        {/* Converted content */}
        <aside className="fixed inset-y-0 left-0 z-[60] flex flex-col h-full w-80 rounded-r-xl bg-surface-container-low dark:bg-inverse-surface shadow-xl hidden md:flex" id="main-drawer">
<div className="px-6 py-8 flex flex-col gap-stack-lg">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary">
<Package className=""  />
</div>
<h1 className="text-headline-md font-headline-md font-extrabold text-primary dark:text-primary-fixed-dim">Asol</h1>
</div>
<div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-high">
<div className="w-10 h-10 rounded-full overflow-hidden bg-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<p className="font-label-md text-label-md text-on-surface">Asol User</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Role Switcher</p>
</div>
</div>
</div>
<nav className="flex-1 flex flex-col gap-1">
<a className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-all duration-300 flex items-center gap-3" href="#">
<ShoppingBag className=""  />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.buyerView')}</span>
</a>
<a className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-all duration-300 flex items-center gap-3" href="#">
<HelpCircle className=""  />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.sellerDashboard')}</span>
</a>
<a className="text-on-surface-variant dark:text-surface-variant mx-2 px-4 py-3 hover:bg-surface-container-highest dark:hover:bg-surface-variant rounded-full transition-all duration-300 flex items-center gap-3" href="#">
<HelpCircle className=""  />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.carrierPortal')}</span>
</a>
<a className="bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary font-bold rounded-full mx-2 px-4 py-3 flex items-center gap-3" href="#">
<HelpCircle className=""  />
<span className="font-body-md text-body-md">{t('marketplaceOrders.adminDisputes.adminPanel')}</span>
</a>
</nav>
<div className="p-6 mt-auto">
<p className="text-label-sm text-outline font-label-sm">v1.0.4</p>
</div>
</aside>



<main className="p-margin-mobile md:p-margin-desktop space-y-stack-xl max-w-7xl mx-auto">

<section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">

<div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl tonal-shadow flex flex-col justify-between group hover:border-primary transition-colors cursor-default">
<div className="flex justify-between items-start">
<div className="p-3 bg-primary-container rounded-lg">
<Package className="text-on-primary-container"  />
</div>
<span className="text-secondary font-label-sm bg-secondary-container/20 px-2 py-1 rounded-full">+12% vs LW</span>
</div>
<div className="mt-6">
<p className="font-label-md text-label-md text-on-surface-variant">{t('marketplaceOrders.adminOrdersDashboard.totalOrders')}</p>
<h3 className="font-headline-xl text-headline-xl text-on-surface">1,284</h3>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl tonal-shadow flex flex-col justify-between group hover:border-tertiary transition-colors cursor-default">
<div className="flex justify-between items-start">
<div className="p-3 bg-tertiary-fixed rounded-lg">
<CreditCard className="text-on-tertiary-fixed"  />
</div>
<span className="text-tertiary font-label-sm bg-tertiary-container/15 px-2 py-1 rounded-full">Requires Action</span>
</div>
<div className="mt-6">
<p className="font-label-md text-label-md text-on-surface-variant">{t('marketplaceOrders.adminOrdersDashboard.pendingPricing')}</p>
<h3 className="font-headline-xl text-headline-xl text-on-surface">43</h3>
</div>
</div>

<div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl tonal-shadow flex flex-col justify-between group hover:border-error transition-colors cursor-default">
<div className="flex justify-between items-start">
<div className="p-3 bg-error-container rounded-lg">
<HelpCircle className="text-on-error-container"  />
</div>
<span className="text-error font-label-sm bg-error-container/20 px-2 py-1 rounded-full">High Priority</span>
</div>
<div className="mt-6">
<p className="font-label-md text-label-md text-on-surface-variant">{t('marketplaceOrders.adminOrdersDashboard.activeDisputes')}</p>
<h3 className="font-headline-xl text-headline-xl text-on-surface">07</h3>
</div>
</div>
</section>

<section className="bg-surface-container-low border border-outline-variant p-4 md:p-6 rounded-xl">
<div className="flex flex-col md:flex-row gap-4 items-center justify-between">
<div className="relative w-full md:max-w-md">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"  />
<input className="w-full h-12 pl-10 pr-4 bg-surface border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none font-body-md text-body-md" placeholder={t('marketplaceOrders.adminOrdersDashboard.searchPlaceholder')} type="text"/>
</div>
<div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar">
<button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors whitespace-nowrap">
<Filter className="text-[20px]"  />
<span className="font-label-md text-label-md">{t('marketplaceOrders.adminOrdersDashboard.allRoles')}</span>
</button>
<button className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors whitespace-nowrap">
<Calendar className="text-[20px]"  />
<span className="font-label-md text-label-md">{t('marketplaceOrders.adminOrdersDashboard.last30Days')}</span>
</button>
<button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-full hover:shadow-lg transition-all whitespace-nowrap">
<span className="font-label-md text-label-md">{t('marketplaceOrders.adminOrdersDashboard.exportCSV')}</span>
</button>
</div>
</div>
</section>

<section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden tonal-shadow">
<div className="overflow-x-auto">
<table className="w-full border-collapse text-left">
<thead className="bg-surface-container-high border-b border-outline-variant">
<tr>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.adminOrdersDashboard.orderDetails')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.adminOrdersDashboard.stakeholders')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.adminOrdersDashboard.status')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">{t('marketplaceOrders.adminOrdersDashboard.amount')}</th>
<th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">{t('marketplaceOrders.adminOrdersDashboard.actions')}</th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant">

<tr className="hover:bg-surface-container transition-colors group">
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-primary">#GV-82741</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Created Oct 12, 2023</p>
</td>
<td className="px-6 py-4">
<div className="flex flex-col gap-1">
<span className="font-label-sm text-label-sm bg-primary-container/10 text-primary px-2 py-0.5 rounded w-fit">Buyer: Global Logistics Corp</span>
<span className="font-label-sm text-label-sm bg-secondary-container/10 text-secondary px-2 py-0.5 rounded w-fit">Seller: FastShip Intl</span>
</div>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center px-3 py-1 rounded-full text-label-sm font-label-sm bg-secondary-container/20 text-secondary border border-secondary/20">
<span className="w-1.5 h-1.5 rounded-full bg-secondary mr-2"></span>
                                    {t('marketplaceOrders.adminOrdersDashboard.dispatched')}
                                </span>
</td>
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-on-surface">$12,450.00</p>
</td>
<td className="px-6 py-4 text-right">
<button className="p-2 hover:bg-outline-variant rounded-full transition-colors">
<MoreVertical className="text-outline"  />
</button>
</td>
</tr>

<tr className="hover:bg-surface-container transition-colors group">
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-primary">#GV-82745</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Created Oct 12, 2023</p>
</td>
<td className="px-6 py-4">
<div className="flex flex-col gap-1">
<span className="font-label-sm text-label-sm bg-primary-container/10 text-primary px-2 py-0.5 rounded w-fit">Buyer: TechNexus Ltd</span>
<span className="font-label-sm text-label-sm bg-outline-variant/20 text-on-surface-variant px-2 py-0.5 rounded w-fit italic">Seller: Unassigned</span>
</div>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center px-3 py-1 rounded-full text-label-sm font-label-sm bg-tertiary-container/15 text-tertiary border border-tertiary/20">
<span className="w-1.5 h-1.5 rounded-full bg-tertiary mr-2 animate-pulse"></span>
                                    {t('marketplaceOrders.adminOrdersDashboard.pendingPricing')}
                                </span>
</td>
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-outline">TBD</p>
</td>
<td className="px-6 py-4 text-right">
<button className="px-3 py-1.5 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm">{t('marketplaceOrders.adminOrdersDashboard.assign')}</button>
</td>
</tr>

<tr className="hover:bg-surface-container transition-colors group">
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-primary">#GV-82739</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Created Oct 11, 2023</p>
</td>
<td className="px-6 py-4">
<div className="flex flex-col gap-1">
<span className="font-label-sm text-label-sm bg-primary-container/10 text-primary px-2 py-0.5 rounded w-fit">Buyer: Horizon Retail</span>
<span className="font-label-sm text-label-sm bg-secondary-container/10 text-secondary px-2 py-0.5 rounded w-fit">Seller: Apex Carriers</span>
</div>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center px-3 py-1 rounded-full text-label-sm font-label-sm bg-error-container/20 text-error border border-error/20">
<span className="w-1.5 h-1.5 rounded-full bg-error mr-2"></span>
                                    {t('marketplaceOrders.adminOrdersDashboard.disputeOpen')}
                                </span>
</td>
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-on-surface">$5,200.00</p>
</td>
<td className="px-6 py-4 text-right">
<button className="px-3 py-1.5 border border-error text-error rounded-lg font-label-sm text-label-sm hover:bg-error-container/10 transition-colors">{t('marketplaceOrders.adminOrdersDashboard.review')}</button>
</td>
</tr>

<tr className="hover:bg-surface-container transition-colors group">
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-primary">#GV-82730</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Created Oct 10, 2023</p>
</td>
<td className="px-6 py-4">
<div className="flex flex-col gap-1">
<span className="font-label-sm text-label-sm bg-primary-container/10 text-primary px-2 py-0.5 rounded w-fit">Buyer: Global Logistics Corp</span>
<span className="font-label-sm text-label-sm bg-secondary-container/10 text-secondary px-2 py-0.5 rounded w-fit">Seller: FastShip Intl</span>
</div>
</td>
<td className="px-6 py-4">
<span className="inline-flex items-center px-3 py-1 rounded-full text-label-sm font-label-sm bg-surface-variant text-on-surface-variant border border-outline-variant">
<CheckCircle2 className="text-[14px] mr-1"  />
                                    {t('marketplaceOrders.adminOrdersDashboard.completed')}
                                </span>
</td>
<td className="px-6 py-4">
<p className="font-label-md text-label-md text-on-surface">$8,900.00</p>
</td>
<td className="px-6 py-4 text-right">
<button className="p-2 hover:bg-outline-variant rounded-full transition-colors">
<MoreVertical className="text-outline"  />
</button>
</td>
</tr>
</tbody>
</table>
</div>
<div className="px-6 py-4 bg-surface-container border-t border-outline-variant flex items-center justify-between">
<p className="font-body-sm text-body-sm text-on-surface-variant">{t('marketplaceOrders.adminOrdersDashboard.showingOrders')}</p>
<div className="flex gap-2">
<button className="p-2 border border-outline-variant rounded-lg hover:bg-surface transition-colors disabled:opacity-50" disabled>
<ChevronLeft className=""  />
</button>
<button className="p-2 border border-outline-variant rounded-lg hover:bg-surface transition-colors">
<ChevronRight className=""  />
</button>
</div>
</div>
</section>
</main>
      </div>
    </div>
  );
}
