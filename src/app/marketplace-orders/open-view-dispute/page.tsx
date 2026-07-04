'use client';

import React, { useState } from 'react';
import { ChevronRight, Gavel, HelpCircle, Paperclip, Package, FileText, ShieldCheck, XCircle } from 'lucide-react';
import { ImagePlaceholder } from '../components/ImagePlaceholder';

export default function Page() {
  return (
    <div className="w-full gova-canvas min-h-screen p-4 text-on-surface">
      <div className="max-w-7xl mx-auto">
        {/* Screen Title for reference */}
        <div className="mb-6 flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <h1 className="text-xl font-bold text-primary">Open or View Dispute</h1>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-semibold">Stitch Screen (Local)</span>
        </div>
        
        {/* Converted content */}
        <main className="px-margin-mobile md:px-margin-desktop py-stack-lg desktop-content-max">

<div className="flex flex-col md:flex-row md:items-center justify-between gap-stack-md mb-stack-xl">
<div>
<nav className="flex items-center gap-1 text-on-surface-variant mb-2">
<span className="font-label-sm text-label-sm">Orders</span>
<ChevronRight className="text-sm"  />
<span className="font-label-sm text-label-sm">Order #GV-98421</span>
<ChevronRight className="text-sm"  />
<span className="font-label-sm text-label-sm text-primary">Dispute</span>
</nav>
<h1 className="font-headline-lg-mobile md:font-headline-xl text-headline-lg-mobile md:text-headline-xl text-primary">Dispute Case #DC-0042</h1>
</div>
<div className="flex items-center gap-stack-sm">
<span className="px-3 py-1 bg-tertiary-container text-on-tertiary-container rounded-full text-label-sm font-label-sm flex items-center gap-1">
<Gavel className="text-[16px]"  />
                    Admin Intervened
                </span>
<span className="px-3 py-1 bg-error-container text-on-error-container rounded-full text-label-sm font-label-sm">
                    Open
                </span>
</div>
</div>
<div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">

<div className="lg:col-span-8 space-y-stack-lg">

<div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
<div className="px-gutter py-stack-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
<h2 className="font-headline-md text-headline-md text-on-surface">Case Discussion</h2>
<span className="text-label-sm font-label-sm text-on-surface-variant">Last activity 2h ago</span>
</div>
<div className="p-gutter overflow-y-auto message-thread-height space-y-stack-lg bg-surface-container-lowest">

<div className="flex gap-stack-md items-start max-w-[85%]">
<div className="w-10 h-10 rounded-full bg-primary-fixed flex-shrink-0 flex items-center justify-center text-on-primary-fixed font-bold">B</div>
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="font-label-md text-label-md text-on-surface">Buyer (You)</span>
<span className="text-body-sm text-label-sm text-on-surface-variant">10:45 AM</span>
</div>
<div className="p-4 bg-surface-container-high rounded-r-xl rounded-bl-xl text-body-md font-body-md text-on-surface-variant">
                                    The shipment for "Smart Logistics Module" (Item #4) arrived with significant external damage. The packaging was crushed on the left side, and the unit itself doesn't power on. I've attached photos of the damage.
                                </div>
</div>
</div>

<div className="flex gap-stack-md items-start max-w-[85%] ml-auto flex-row-reverse">
<div className="w-10 h-10 rounded-full bg-secondary-fixed flex-shrink-0 flex items-center justify-center text-on-secondary-fixed font-bold">S</div>
<div className="space-y-1 text-right">
<div className="flex items-center gap-2 justify-end">
<span className="text-body-sm text-label-sm text-on-surface-variant">11:15 AM</span>
<span className="font-label-md text-label-md text-on-surface">Nexus Components</span>
</div>
<div className="p-4 bg-primary text-on-primary rounded-l-xl rounded-br-xl text-body-md font-body-md text-left">
                                    We apologize for the inconvenience. Every item is inspected before shipping. This appears to be a carrier mishandling issue. We can offer a 20% partial refund if you'd like to try and repair it locally.
                                </div>
</div>
</div>

<div className="flex flex-col items-center py-stack-md">
<div className="w-full h-px bg-outline-variant relative">
<span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 bg-surface-container-lowest text-label-sm font-label-sm text-tertiary-fixed-variant uppercase tracking-wider">
                                    Gova Resolution Team Joined
                                </span>
</div>
</div>

<div className="flex gap-stack-md items-start max-w-[90%] mx-auto">
<div className="w-10 h-10 rounded-full bg-tertiary flex-shrink-0 flex items-center justify-center text-on-tertiary">
<HelpCircle className="text-[20px]"  />
</div>
<div className="space-y-1">
<div className="flex items-center gap-2">
<span className="font-label-md text-label-md text-tertiary font-bold">Gova Dispute Specialist</span>
<span className="text-body-sm text-label-sm text-on-surface-variant">1:30 PM</span>
</div>
<div className="p-4 bg-tertiary-container/20 border border-tertiary-container rounded-xl text-body-md font-body-md text-on-tertiary-container">
                                    I have reviewed the evidence. Buyer, please upload a video of the device failing to power on while connected to a verified power source. Seller, please provide the insurance certificate for this shipment. We will make a final determination within 24 hours.
                                </div>
</div>
</div>
</div>

<div className="p-gutter border-t border-outline-variant bg-surface-container-lowest">
<div className="relative">
<textarea className="w-full min-h-[100px] p-4 rounded-xl border border-outline-variant bg-white focus:ring-2 focus:ring-primary focus:border-primary text-body-md font-body-md transition-all resize-none" placeholder="Write your response..."></textarea>
<div className="absolute bottom-3 right-3 flex items-center gap-2">
<button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors">
<Paperclip className=""  />
</button>
<button className="bg-primary text-on-primary px-6 py-2 rounded-lg font-label-md hover:opacity-90 transition-opacity">
                                    Send Reply
                                </button>
</div>
</div>
</div>
</div>
</div>

<div className="lg:col-span-4 space-y-stack-lg">

<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-gutter shadow-sm space-y-stack-md">
<h3 className="font-headline-md text-headline-md text-on-surface">Case Summary</h3>
<div className="space-y-stack-sm">
<label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Dispute Scope</label>
<div className="p-3 bg-surface-container-low rounded-lg flex items-center gap-3">
<Package className="text-primary"  />
<span className="font-body-md text-body-md text-on-surface">Specific Item (#4)</span>
</div>
</div>
<div className="space-y-stack-sm">
<label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Reason for Dispute</label>
<div className="p-3 bg-surface-container-low rounded-lg flex items-center gap-3">
<HelpCircle className="text-primary"  />
<span className="font-body-md text-body-md text-on-surface">Damaged/Defective Item</span>
</div>
</div>
<div className="space-y-stack-sm">
<label className="text-label-sm font-label-sm text-on-surface-variant uppercase">Dispute Amount</label>
<div className="text-headline-md font-headline-md text-primary">$1,240.00 USD</div>
</div>
<div className="pt-stack-sm">
<button className="w-full flex items-center justify-center gap-2 py-3 border border-outline text-on-surface-variant rounded-xl hover:bg-surface-container-low transition-colors font-label-md">
<FileText className=""  />
                            View Order Details
                        </button>
</div>
</div>

<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-gutter shadow-sm">
<div className="flex items-center gap-stack-md mb-stack-md">
<div className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant">
<ImagePlaceholder alt="" className="w-full h-full object-cover"   />
</div>
<div>
<div className="font-label-md text-label-md text-on-surface">Nexus Components</div>
<div className="text-body-sm text-label-sm text-on-surface-variant">Platinum Seller • 4.98 Rating</div>
</div>
</div>
<div className="flex gap-2">
<button className="flex-1 py-2 text-primary border border-primary rounded-lg font-label-sm hover:bg-primary-fixed transition-colors">Contact Seller</button>
</div>
</div>

<div className="grid grid-cols-2 gap-stack-sm">
<div className="bg-primary text-on-primary p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform cursor-pointer">
<ShieldCheck className=""  />
<div className="font-label-sm text-label-sm leading-tight">Accept Partial Refund Offer</div>
</div>
<div className="bg-error text-on-error p-4 rounded-xl flex flex-col justify-between h-32 hover:scale-[1.02] transition-transform cursor-pointer">
<XCircle className=""  />
<div className="font-label-sm text-label-sm leading-tight">Withdraw Dispute</div>
</div>
</div>
</div>
</div>
</main>
      </div>
    </div>
  );
}
