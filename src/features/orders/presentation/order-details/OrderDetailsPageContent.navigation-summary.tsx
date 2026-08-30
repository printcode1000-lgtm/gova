"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  MapPin,
  PackageCheck,
  Route,
  Send,
  ShieldCheck,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { asolApi } from "@/core/api/asol-api-client";
import { ASOL_API_ROUTES } from "@/core/api/asol-api-routes";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { useSession } from "@/features/auth/ui";
import { isSuperAdmin } from "@/features/auth";
import { OrderActionButton } from "../OrderActionButton";
import { OrderAuditTrail } from "../OrderAuditTrail";
import {
  canCancelStatus,
  canDeliverShipmentItemStatus,
  canRejectDeliveryStatus,
  canRequestReturnStatus,
  carrierFromSellerOrder,
  formatMoney,
  profileAddress,
  profileName,
  queryWithActor,
  statusLabel,
} from "../order-labels";
import type { DbRow, OrderDetails, OrderRole } from "../order-types";

export type RunAction = (
  action: string,
  payload: Record<string, string | number>,
) => void;

export const text = {
  loadFailed: "تعذر تحميل الطلب.",
  actionFailed: "تعذر تنفيذ الإجراء.",
  actionReason: "تم التنفيذ من صفحة الطلب",
  loginRequired: "يجب تسجيل الدخول لعرض تفاصيل الطلب.",
  detailsTitle: "تفاصيل الطلب",
  notFound: "لم يتم العثور على الطلب.",
  back: "العودة للطلبات",
  order: "طلب",
  status: "الحالة",
  cod: "الدفع عند الاستلام فقط",
  adminAllRoles: "السوبر أدمن يتحكم بكل الأدوار",
  total: "إجمالي الطلب",
  remaining: "المبلغ المتبقي",
  buyerAddress: "عنوان المشتري",
  noAddress: "لا يوجد عنوان محفوظ",
  sellerStatus: "حالة البائع",
  carrier: "مقدم التوصيل",
  noCarrier: "لا يوجد مقدم توصيل مرتبط بهذا البائع.",
  noCarrierSellerHint:
    "لإكمال التوصيل، اربط مقدم خدمة من قسم الشحن والإرجاع في بروفايلك ثم أضِفه لهذا الطلب.",
  linkCarrierInProfile: "إعداد الشحن والإرجاع",
  applyCarrierToOrder: "ربط مقدم التوصيل بالطلب",
  sellerFulfillmentHint:
    "تغيير تسعير الشحن أو سياسة الإرجاع يُحدّث هذا الطلب تلقائياً بعد الحفظ في البروفايل.",
  editShippingPricing: "تعديل تسعير الشحن",
  editReturnPolicy: "تعديل سياسة الإرجاع",
  buyerAddressHint:
    "أضف عنوان التوصيل في بروفايلك ثم طبّقه على الطلب ليُعامل كأنه كان مرفقاً منذ الإنشاء.",
  editBuyerAddressInProfile: "تعديل العنوان في البروفايل",
  sellerProfile: "بروفايل البائع",
  carrierProfile: "بروفايل التوصيل",
  product: "منتج",
  quantity: "الكمية",
  itemStatus: "الحالة",
  sellerHint:
    "المطلوب الآن من البائع: قبول أو رفض المنتجات الجديدة في هذه البطاقة.",
  notSellerHint:
    "أزرار قبول ورفض المنتجات تظهر لحساب البائع صاحب هذه البطاقة أو للسوبر أدمن فقط.",
  orderActions: "إجراءات الطلب",
  shipments: "الشحنات",
  noShipments: "لم يتم إنشاء شحنات بعد.",
  carrierCompany: "شركة التوصيل",
  unknown: "غير محدد",
  returns: "الإرجاع",
  noReturns: "لا توجد طلبات إرجاع بعد.",
  returnStatus: "حالة الإرجاع",
  returnReason: "سبب الإرجاع",
  shipmentItems: "عناصر الشحنة",
};

export function isPendingSellerResponse(status: unknown) {
  return ["new", "waiting_for_seller_response"].includes(String(status));
}

export function BackToOrders({ id }: { id?: string }) {
  return (
    <Link id={id}
      href="/orders"
      className="inline-flex items-center gap-2 text-sm text-primary"
    >
      <ArrowRight className="h-4 w-4" />
      {text.back}
    </Link>
  );
}

export function OrderSummary({ id,
  order,
  buyerAddress,
  buyerPhone,
  currency,
  hasPendingShippingQuote,
}: {
  order: DbRow;
  buyerAddress: string;
  buyerPhone: string;
  currency: string;
  hasPendingShippingQuote: boolean;
} & { id?: string }) {
  return (
    <section id={id} className="mb-5 grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">{text.total}</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(order.grand_total, currency)}
        </p>
        {hasPendingShippingQuote ? (
          <p className="mt-2 text-xs leading-5 text-warning">
            الإجمالي مبدئي حتى قبول عرض الشحن حسب المكان.
          </p>
        ) : null}
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">{text.remaining}</p>
        <p className="mt-1 text-xl font-bold">
          {formatMoney(order.remaining_total, currency)}
        </p>
      </div>
      <div className="rounded-xl border border-outline-variant bg-surface p-4">
        <p className="text-sm text-muted-foreground">{text.buyerAddress}</p>
        <p className="mt-1 text-sm font-semibold">
          {buyerAddress || text.noAddress}
        </p>
        {buyerPhone ? (
          <p className="mt-1 text-xs text-muted-foreground">{buyerPhone}</p>
        ) : null}
      </div>
    </section>
  );
}
