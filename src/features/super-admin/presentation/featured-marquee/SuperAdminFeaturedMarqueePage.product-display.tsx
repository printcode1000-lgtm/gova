"use client";

import {
  Eye,
  GripVertical,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeaturedMarquee } from "@/components/ui/FeaturedMarquee";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FEATURED_MARQUEE_CACHE_KEY,
  type FeaturedMarqueeRecord,
} from "@asol/featured-marquee-core";
import { featuredMarqueeApiService } from "@/features/advertisements/services/featured-marquee-api-service";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { productApiService } from "@/features/product/services/product-api-service";
import { reportSystemIssue } from '@asol/system-logs-core';
import { ASOL_DB_STORES, asolDbDelete } from "@asol/data-core/browser";

export interface ResolvedItem {
  productId: string;
  product: ProductRecord | null;
  isLoading: boolean;
  error: string | null;
}

export function getProductName(product: ProductRecord): string {
  return product.mainData.name || "منتج بدون اسم";
}

export function getProductPrice(product: ProductRecord): string {
  return product.price.current || product.price.label || "";
}

export function getProductImage(product: ProductRecord): string {
  return product.images[0]?.url ?? "";
}

export function buildProductAction(product: ProductRecord): string {
  return [
    "mode=view",
    `productId=${encodeURIComponent(product.id)}`,
    `mainCategoryId=${encodeURIComponent(product.mainCategoryId)}`,
    `subcategoryId=${encodeURIComponent(product.subcategoryId)}`,
  ].join("&");
}
