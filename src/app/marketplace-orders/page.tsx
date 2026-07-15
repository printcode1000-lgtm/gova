'use client';

import React from 'react';
import Link from 'next/link';
import { Package, ChevronRight, LayoutDashboard, ShoppingBag, Eye, HelpCircle } from 'lucide-react';

const screens = [
  {
    "title": "Shipment Tracking",
    "slug": "shipment-tracking"
  },
  {
    "title": "Return or Replace Items",
    "slug": "return-replace-items"
  },
  {
    "title": "Create Custom Request",
    "slug": "create-custom-request"
  },
  {
    "title": "Buyer Cart and Checkout",
    "slug": "buyer-cart-checkout"
  },
  {
    "title": "Prepare Items for Shipping",
    "slug": "prepare-items-shipping"
  },
  {
    "title": "Buyer Order Details",
    "slug": "buyer-order-details"
  },
  {
    "title": "Open or View Dispute",
    "slug": "open-view-dispute"
  },
  {
    "title": "Carrier Shipment Details",
    "slug": "carrier-shipment-details"
  },
  {
    "title": "Admin Orders Dashboard",
    "slug": "admin-orders-dashboard"
  },
  {
    "title": "Custom Request Price Offer",
    "slug": "custom-request-price-offer"
  },
  {
    "title": "Assigned Shipments",
    "slug": "assigned-shipments"
  },
  {
    "title": "Admin Disputes",
    "slug": "admin-disputes"
  },
  {
    "title": "Send Custom Request Price Offer",
    "slug": "send-custom-request-price-offer"
  },
  {
    "title": "Audit Trail",
    "slug": "audit-trail"
  },
  {
    "title": "Seller Orders",
    "slug": "seller-orders"
  },
  {
    "title": "Admin Full Order Details",
    "slug": "admin-full-order-details"
  },
  {
    "title": "Seller Custom Requests",
    "slug": "seller-custom-requests"
  },
  {
    "title": "My Orders",
    "slug": "my-orders"
  },
  {
    "title": "Seller Order Details",
    "slug": "seller-order-details"
  },
  {
    "title": "Cancel Order or Items",
    "slug": "cancel-order-items"
  }
];

export default function MarketplaceOrdersDashboard() {
  return (
    <div className="w-full asol-canvas min-h-screen p-6 text-on-surface">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 border-b border-outline-variant/30 pb-5">
          <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">واجهات إدارة الطلبات (Marketplace Order Management)</h1>
            <p className="text-sm text-on-surface-variant">مجموعة من 20 صفحة تم استيرادها محلياً بالكامل من Stitch وتكاملها مع سمات وتصميم المشروع الحالي.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screens.map((screen, idx) => (
            <Link 
              key={screen.slug} 
              href={`/marketplace-orders/${screen.slug}`}
              className="group block p-4 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/40 hover:border-primary/40 rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 bg-primary/10 text-primary font-bold text-xs rounded-full flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    {idx + 1}
                  </span>
                  <span className="font-medium truncate text-on-surface group-hover:text-primary transition-colors text-sm">
                    {screen.title}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
