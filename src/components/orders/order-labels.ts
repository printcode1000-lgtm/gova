"use client";

import type { DbRow, OrderRole } from "./order-types";

export function formatMoney(minor: unknown, currency = "EGP") {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
  }).format(Number(minor ?? 0) / 100);
}

export function statusLabel(status: unknown) {
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
    | { storeDetails?: { storeName?: string }; contacts?: { phones?: { number: string }[] } }
    | undefined;
  return (
    record?.storeDetails?.storeName?.trim() ||
    record?.contacts?.phones?.[0]?.number ||
    fallback
  );
}

export function profileAddress(profile: unknown) {
  const record = profile as
    | { contacts?: { locations?: { address: string }[]; phones?: { number: string }[] } }
    | undefined;
  return {
    address: record?.contacts?.locations?.[0]?.address ?? "",
    phone: record?.contacts?.phones?.[0]?.number ?? "",
  };
}

export function queryWithActor(uid: string, phone: string, role: OrderRole) {
  return `uid=${encodeURIComponent(uid)}&phone=${encodeURIComponent(phone)}&role=${encodeURIComponent(role)}`;
}

export function carrierFromSellerOrder(sellerOrder: DbRow, items: DbRow[]) {
  const direct = String(sellerOrder.service_provider_id ?? "");
  if (direct) return direct;
  const note = String(
    items.find((item) => item.seller_order_id === sellerOrder.id)?.shipping_notes ??
      "",
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
