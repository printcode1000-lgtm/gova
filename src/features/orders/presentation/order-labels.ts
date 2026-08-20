"use client";

import type { DbRow, OrderRole, OrderViewerRole } from "./order-types";
import { formatCurrencyMinor, formatDateTime } from "@asol/format-core";
import {
  parseSellerFulfillmentSnapshot,
  type SellerFulfillmentSnapshot,
} from "@asol/orders-core";

export function formatMoney(minor: unknown, currency = "EGP", locale = "ar") {
  return formatCurrencyMinor(minor, { locale, currency });
}

export function statusLabel(status: unknown, locale = "ar") {
  if (locale !== "ar") {
    const englishLabels: Record<string, string> = {
      new: "New", waiting_for_seller_response: "Waiting for seller response",
      waiting_for_pricing: "Waiting for pricing", processing: "Processing",
      partially_fulfilled: "Partially fulfilled", fully_fulfilled: "Fulfilled",
      partially_cancelled: "Partially cancelled", fully_cancelled: "Cancelled",
      waiting_for_return: "Waiting for return", requested: "Requested",
      seller_approved: "Approved by seller", seller_rejected: "Rejected by seller",
      waiting_for_pickup: "Waiting for pickup", picked_up: "Picked up", received: "Received",
      under_inspection: "Under inspection", inspection_accepted: "Inspection accepted",
      inspection_rejected: "Inspection rejected", refund_pending: "Refund pending", refunded: "Refunded",
      waiting_for_replacement: "Waiting for replacement", closed: "Closed", archived: "Archived",
      waiting_for_response: "Waiting for response", fully_accepted: "Fully accepted",
      partially_accepted: "Partially accepted", fully_rejected: "Fully rejected", preparing: "Preparing",
      ready_for_shipping: "Ready for shipping", handed_to_shipping: "Handed to delivery",
      seller_accepted: "Accepted by seller", buyer_cancelled: "Cancelled by buyer",
      admin_cancelled: "Cancelled by admin", assigned_to_shipment: "Assigned to shipment",
      assigned: "Assigned to shipment", received_by_carrier: "Received by carrier",
      rejected_by_carrier: "Rejected by carrier", in_transit: "In transit",
      at_distribution_center: "At distribution center", out_for_delivery: "Out for delivery",
      delivered: "Delivered", delivery_rejected: "Delivery rejected",
      waiting_for_carrier_pickup: "Waiting for carrier pickup",
      partially_received_by_carrier: "Partially received by carrier",
      partially_rejected_by_carrier: "Partially rejected by carrier",
      fully_received_by_carrier: "Received by carrier", arrived_at_distribution_center: "Arrived at distribution center",
      partially_delivered: "Partially delivered", fully_delivered: "Delivered",
      customer_rejected_delivery: "Delivery rejected by customer", delivery_failed: "Delivery failed",
    };
    return englishLabels[String(status)] ?? "Unknown";
  }
  const labels: Record<string, string> = {
    new: "جديد",
    waiting_for_seller_response: "بانتظار رد البائع",
    waiting_for_pricing: "بانتظار التسعير",
    processing: "قيد التنفيذ",
    partially_fulfilled: "تم تنفيذ جزء",
    fully_fulfilled: "تم التنفيذ بالكامل",
    partially_cancelled: "ملغي جزئيًا",
    fully_cancelled: "ملغي بالكامل",
    waiting_for_return: "بانتظار الإرجاع",
    requested: "تم الطلب",
    seller_approved: "وافق البائع",
    seller_rejected: "رفض البائع",
    waiting_for_pickup: "بانتظار الاستلام",
    picked_up: "تم الاستلام",
    received: "تم الاستلام",
    under_inspection: "قيد الفحص",
    inspection_accepted: "تم قبول الفحص",
    inspection_rejected: "تم رفض الفحص",
    refund_pending: "بانتظار الاسترداد",
    refunded: "تم الاسترداد",
    waiting_for_replacement: "بانتظار الاستبدال",
    closed: "مغلق",
    archived: "مؤرشف",
    waiting_for_response: "بانتظار الرد",
    fully_accepted: "مقبول بالكامل",
    partially_accepted: "مقبول جزئيًا",
    fully_rejected: "مرفوض بالكامل",
    preparing: "جاري التجهيز",
    ready_for_shipping: "جاهز للشحن",
    handed_to_shipping: "تم تسليمه للتوصيل",
    seller_accepted: "وافق البائع",
    buyer_cancelled: "ألغاه المشتري",
    admin_cancelled: "ألغاه المشرف",
    assigned_to_shipment: "مسند للشحن",
    assigned: "مسند للشحن",
    received_by_carrier: "استلمتها شركة التوصيل",
    rejected_by_carrier: "رفضت شركة التوصيل الاستلام",
    in_transit: "في الطريق",
    at_distribution_center: "في مركز التوزيع",
    out_for_delivery: "خارج للتسليم",
    delivered: "تم التسليم",
    delivery_rejected: "رفض المشتري الاستلام",
    waiting_for_carrier_pickup: "بانتظار استلام شركة التوصيل",
    partially_received_by_carrier: "استلمت شركة التوصيل جزءًا من الشحنة",
    partially_rejected_by_carrier: "رفضت شركة التوصيل جزءًا من الشحنة",
    fully_received_by_carrier: "استلمت شركة التوصيل الشحنة",
    arrived_at_distribution_center: "وصلت إلى مركز التوزيع",
    partially_delivered: "تم تسليم جزء من الشحنة",
    fully_delivered: "تم التسليم بالكامل",
    customer_rejected_delivery: "رفض الاستلام من العميل",
    delivery_failed: "فشل التسليم",
  };
  return labels[String(status)] ?? "غير معروف";
}

export function actionLabel(action: unknown) {
  const labels: Record<string, string> = {
    created: "تم الإنشاء",
    updated: "تم التحديث",
    status_changed: "تغيرت الحالة",
    price_changed: "تغير السعر",
    shipping_fee_changed: "تغيرت تكلفة الشحن",
    tracking_updated: "تم تحديث الشحن",
    accepted: "تم القبول",
    rejected: "تم الرفض",
    cancelled: "تم الإلغاء",
    assigned: "تم الإسناد",
    received: "تم الاستلام",
    delivered: "تم التسليم",
    delivery_rejected: "تم رفض الاستلام",
    payment_created: "تم تسجيل الدفع",
    refund_requested: "تم طلب استرداد",
    refund_executed: "تم تنفيذ الاسترداد",
    return_requested: "تم طلب إرجاع",
    replacement_requested: "تم طلب استبدال",
    dispute_opened: "تم فتح نزاع",
    dispute_replied: "تم الرد على النزاع",
    admin_decision: "قرار إداري",
    admin_change: "تعديل إداري",
    image_uploaded: "تم رفع صورة",
  };
  return labels[String(action)] ?? "إجراء غير معروف";
}

export function commandLabel(action: string) {
  const labels: Record<string, string> = {
    seller_accept_item: "قبول المنتج",
    seller_reject_item: "رفض المنتج",
    seller_accept_custom_request: "قبول الطلب الخاص",
    seller_reject_custom_request: "رفض الطلب الخاص",
    seller_send_custom_price_offer: "إرسال عرض السعر",
    seller_send_shipping_quote: "إرسال عرض الشحن",
    seller_assign_delivery_carrier: "ربط مقدم التوصيل بالطلب",
    buyer_apply_delivery_address: "تطبيق العنوان على الطلب",
    buyer_accept_shipping_quote: "قبول عرض الشحن",
    buyer_reject_shipping_quote: "رفض عرض الشحن",
    provider_send_unified_delivery_quote: "إرسال عرض التوصيل الموحّد",
    buyer_accept_unified_delivery_quote: "اختيار هذا العرض",
    buyer_reject_unified_delivery_quote: "رفض العرض",
    buyer_choose_separate_delivery: "العودة للتوصيل المنفصل",
    admin_create_unified_delivery_shipment: "إنشاء الشحنة الموحّدة",
    buyer_accept_custom_price: "قبول السعر",
    buyer_reject_custom_price: "رفض السعر",
    buyer_cancel_custom_request: "إلغاء الطلب الخاص",
    seller_prepare_item: "بدء التجهيز",
    seller_ready_item: "جاهز للشحن",
    buyer_cancel_item: "إلغاء المنتج",
    buyer_cancel_seller_order: "إلغاء طلب هذا البائع",
    buyer_cancel_order: "إلغاء الطلب بالكامل",
    buyer_reject_delivery_item: "رفض استلام المنتج",
    buyer_reject_delivery_seller_order: "رفض استلام طلب البائع",
    buyer_reject_delivery_order: "رفض استلام الطلب بالكامل",
    buyer_request_return_item: "طلب إرجاع المنتج",
    seller_approve_return: "قبول الإرجاع",
    seller_reject_return: "رفض الإرجاع",
    admin_create_seller_shipment: "إنشاء شحنة للبائع",
    carrier_receive_shipment: "استلام الشحنة",
    carrier_reject_shipment: "رفض استلام الشحنة",
    carrier_in_transit: "في الطريق",
    carrier_out_for_delivery: "خارج للتسليم",
    carrier_delivered: "تم التسليم",
    carrier_deliver_shipment_item: "تسليم هذا المنتج",
  };
  return labels[action] ?? action;
}

export function profileName(profile: unknown, fallback: string) {
  const record = profile as
    | {
        storeDetails?: { storeName?: string };
        contacts?: { phones?: { number: string }[] };
      }
    | undefined;
  return (
    record?.storeDetails?.storeName?.trim() ||
    record?.contacts?.phones?.[0]?.number ||
    fallback
  );
}

export function profileAddress(profile: unknown) {
  const record = profile as
    | {
        contacts?: {
          locations?: { address: string }[];
          phones?: { number: string }[];
        };
      }
    | undefined;
  return {
    address: record?.contacts?.locations?.[0]?.address ?? "",
    phone: record?.contacts?.phones?.[0]?.number ?? "",
  };
}

export function parseSellerOrderFulfillmentSnapshot(
  sellerOrder: DbRow,
): SellerFulfillmentSnapshot {
  return parseSellerFulfillmentSnapshot(sellerOrder.fulfillment_snapshot_json);
}

export function sellerFulfillmentShippingSummary(
  snapshot: SellerFulfillmentSnapshot,
  locale = "ar",
) {
  const { mode, flatRate, freeShippingThreshold, notes } = snapshot.shippingPricing;
  if (locale !== "ar") {
    if (mode === "free") return "Free shipping";
    if (mode === "flat") {
      const threshold =
        freeShippingThreshold > 0
          ? ` (free over ${formatMoney(freeShippingThreshold, "EGP", locale)})`
          : "";
      return `Flat rate ${formatMoney(flatRate, "EGP", locale)}${threshold}`;
    }
    const note = notes.trim() ? ` — ${notes.trim()}` : "";
    return `Location-based quote${note}`;
  }
  if (mode === "free") return "شحن مجاني";
  if (mode === "flat") {
    const threshold =
      freeShippingThreshold > 0
        ? ` (مجاني فوق ${formatMoney(freeShippingThreshold, "EGP", locale)})`
        : "";
    return `سعر ثابت ${formatMoney(flatRate, "EGP", locale)}${threshold}`;
  }
  const note = notes.trim() ? ` — ${notes.trim()}` : "";
  return `تسعير حسب الموقع${note}`;
}

export function sellerFulfillmentReturnsSummary(
  snapshot: SellerFulfillmentSnapshot,
  locale = "ar",
) {
  const { enabled, returnWindowDays, returnShippingPayer, policyText } =
    snapshot.returns;
  if (!enabled) {
    return locale === "ar" ? "الإرجاع غير متاح" : "Returns not available";
  }
  const payerLabelsAr: Record<string, string> = {
    buyer: "المشتري",
    seller: "البائع",
    case_by_case: "حسب الحالة",
  };
  const payerLabelsEn: Record<string, string> = {
    buyer: "buyer",
    seller: "seller",
    case_by_case: "case by case",
  };
  const payer =
    locale === "ar"
      ? payerLabelsAr[returnShippingPayer] ?? returnShippingPayer
      : payerLabelsEn[returnShippingPayer] ?? returnShippingPayer;
  const base =
    locale === "ar"
      ? `إرجاع خلال ${returnWindowDays} يوم — شحن الإرجاع: ${payer}`
      : `Returns within ${returnWindowDays} days — return shipping: ${payer}`;
  const policy = policyText.trim();
  return policy ? `${base} — ${policy}` : base;
}

export function queryWithActor(uid: string, phone: string, role: OrderRole) {
  return `uid=${encodeURIComponent(uid)}&phone=${encodeURIComponent(phone)}&role=${encodeURIComponent(role)}`;
}

export function queryForOrderList(
  uid: string,
  phone: string,
  pagination: { limit: number; offset: number },
) {
  const params = new URLSearchParams({
    uid,
    phone,
    limit: String(pagination.limit),
    offset: String(pagination.offset),
  });
  return params.toString();
}

export function formatOrderDate(value: unknown, locale = "ar") {
  return formatDateTime(value as string, locale);
}

export function viewerRoleLabel(role: OrderViewerRole, locale = "ar") {
  if (locale !== "ar") {
    const labels: Record<OrderViewerRole, string> = {
      buyer: "Buyer",
      seller: "Seller",
      service_provider: "Delivery",
    };
    return labels[role];
  }
  const labels: Record<OrderViewerRole, string> = {
    buyer: "مشتري",
    seller: "بائع",
    service_provider: "توصيل",
  };
  return labels[role];
}

export function primaryViewerRole(
  viewerRoles: OrderViewerRole[],
  admin = false,
): OrderRole {
  if (admin) return "admin";
  if (viewerRoles.includes("buyer")) return "buyer";
  if (viewerRoles.includes("seller")) return "seller";
  return "service_provider";
}

export type ProfileFulfillmentSection = "shipping" | "returns";

export function profileFulfillmentSectionHref(
  orderId: string,
  section: ProfileFulfillmentSection,
  role: OrderRole = "seller",
) {
  const returnTo = `/orders/details?orderId=${orderId}&role=${role}`;
  return `/profile?mode=edit&tab=fulfillment&section=${section}&returnTo=${encodeURIComponent(returnTo)}`;
}

export interface OrderDeliveryAddress {
  address: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
}

export function parseOrderDeliveryAddress(order: DbRow): OrderDeliveryAddress {
  try {
    const raw =
      typeof order.delivery_address_snapshot_json === "string"
        ? (JSON.parse(order.delivery_address_snapshot_json) as Record<
            string,
            unknown
          >)
        : ((order.delivery_address_snapshot_json as Record<string, unknown>) ??
          {});
    return {
      address: String(raw.address ?? "").trim(),
      phone: String(raw.phone ?? "").trim(),
      latitude:
        typeof raw.latitude === "number" ? raw.latitude : Number(raw.latitude) || null,
      longitude:
        typeof raw.longitude === "number"
          ? raw.longitude
          : Number(raw.longitude) || null,
    };
  } catch {
    return { address: "", phone: "", latitude: null, longitude: null };
  }
}

export function hasOrderDeliveryAddress(order: DbRow) {
  return Boolean(parseOrderDeliveryAddress(order).address);
}

export function resolveBuyerDeliveryDisplay(
  order: DbRow,
  profile: unknown,
): OrderDeliveryAddress {
  const snapshot = parseOrderDeliveryAddress(order);
  const fromProfile = profileAddress(profile);
  return {
    address: snapshot.address || fromProfile.address,
    phone: snapshot.phone || fromProfile.phone,
    latitude: snapshot.latitude,
    longitude: snapshot.longitude,
  };
}

export function carrierFromSellerOrder(sellerOrder: DbRow, items: DbRow[]) {
  const direct = String(sellerOrder.service_provider_id ?? "");
  if (direct) return direct;
  const note = String(
    items.find((item) => item.seller_order_id === sellerOrder.id)
      ?.shipping_notes ?? "",
  );
  return note.startsWith("carrier:") ? note.slice("carrier:".length) : "";
}

export function canCancelStatus(status: unknown) {
  return ![
    "buyer_cancelled",
    "admin_cancelled",
    "seller_rejected",
    "delivery_rejected",
    "delivered",
    "closed",
  ].includes(String(status));
}

export function canRejectDeliveryStatus(status: unknown) {
  return ["assigned_to_shipment", "in_transit"].includes(String(status));
}

export function canRequestReturnStatus(status: unknown) {
  return String(status) === "delivered";
}

export function canDeliverShipmentItemStatus(status: unknown) {
  return ["in_transit", "at_distribution_center", "out_for_delivery"].includes(
    String(status),
  );
}
