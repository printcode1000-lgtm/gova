"use client";

import * as React from "react";
import {
  Copy,
  Gift,
  PackagePlus,
  Percent,
  Plus,
  Save,
  Ticket,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileSectionStatus } from "@/components/profile/profile-save-controller";
import {
  createEmptySellerDiscount,
  formatMinorCurrency,
  type SaveSellerDiscountInput,
  type SellerDiscountRule,
  type SellerDiscountType,
  type SellerDiscountValueType,
} from "../../entities/seller-discount.entity";
import { useSellerDiscounts } from "../../hooks/use-seller-discounts";

export interface SellerDiscountsController extends ProfileSectionStatus {
  save: () => Promise<boolean>;
  getSnapshot: () => SellerDiscountRule[];
  applySaved: (discounts: SellerDiscountRule[]) => void;
}

export const TYPE_LABELS_AR: Record<SellerDiscountType, string> = {
  quantity: "خصم الكمية",
  bundle: "خصم الباقات",
  free_shipping: "شحن مجاني",
  coupon: "كوبون خصم",
  free_gift: "هدية مجانية",
  automatic: "خصم تلقائي",
  order_total: "خصم إجمالي المشتريات",
};

export const TYPE_LABELS_EN: Record<SellerDiscountType, string> = {
  quantity: "Quantity discount",
  bundle: "Bundle discount",
  free_shipping: "Free shipping",
  coupon: "Coupon",
  free_gift: "Free gift",
  automatic: "Automatic discount",
  order_total: "Order total discount",
};

export const DISCOUNT_TYPES: SellerDiscountType[] = [
  "order_total",
  "coupon",
  "free_shipping",
  "quantity",
  "bundle",
  "free_gift",
  "automatic",
];

export function isDirty(current: SellerDiscountRule[], saved: SellerDiscountRule[]) {
  return JSON.stringify(current) !== JSON.stringify(saved);
}

export function normalizeForSave(discount: SellerDiscountRule): SaveSellerDiscountInput {
  return {
    ...discount,
    title: discount.title.trim(),
    description: discount.description.trim(),
    couponCode: discount.couponCode.trim(),
    value: Math.max(0, Math.floor(discount.value || 0)),
    maxDiscountMinor: Math.max(0, Math.floor(discount.maxDiscountMinor || 0)),
  };
}
