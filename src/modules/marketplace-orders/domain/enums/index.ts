export const ORDER_TYPES = [
  "product_order",
  "custom_request_order",
  "mixed_order",
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];
export const ORDER_STATUSES = [
  "new",
  "waiting_for_seller_response",
  "waiting_for_pricing",
  "processing",
  "partially_fulfilled",
  "fully_fulfilled",
  "partially_cancelled",
  "fully_cancelled",
  "waiting_for_return",
  "waiting_for_replacement",
  "closed",
  "archived",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const SELLER_ORDER_TYPES = [
  "product_items",
  "custom_request",
  "mixed",
] as const;
export type SellerOrderType = (typeof SELLER_ORDER_TYPES)[number];
export const SELLER_ORDER_STATUSES = [
  "waiting_for_response",
  "waiting_for_pricing",
  "price_offer_sent",
  "buyer_accepted_price",
  "buyer_rejected_price",
  "fully_accepted",
  "partially_accepted",
  "fully_rejected",
  "preparing",
  "ready_for_shipping",
  "handed_to_shipping",
  "partially_fulfilled",
  "fully_fulfilled",
  "cancelled",
  "closed",
] as const;
export type SellerOrderStatus = (typeof SELLER_ORDER_STATUSES)[number];
export const ORDER_ITEM_STATUSES = [
  "new",
  "seller_accepted",
  "seller_rejected",
  "buyer_cancelled",
  "admin_cancelled",
  "preparing",
  "ready_for_shipping",
  "assigned_to_shipment",
  "in_transit",
  "delivered",
  "delivery_rejected",
  "return_requested",
  "replacement_requested",
  "returned",
  "refunded",
  "replaced",
  "closed",
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];
export const CUSTOM_REQUEST_TYPES = [
  "pharmacy",
  "supermarket",
  "service",
  "custom_purchase",
  "other",
] as const;
export type CustomRequestType = (typeof CUSTOM_REQUEST_TYPES)[number];
export const CUSTOM_REQUEST_ITEM_STATUSES = [
  "new",
  "waiting_for_seller_response",
  "waiting_for_pricing",
  "price_offer_sent",
  "buyer_accepted_price",
  "buyer_rejected_price",
  "seller_accepted",
  "seller_rejected",
  "buyer_cancelled",
  "admin_cancelled",
  "preparing",
  "ready_for_shipping",
  "assigned_to_shipment",
  "in_transit",
  "delivered",
  "delivery_rejected",
  "return_requested",
  "replacement_requested",
  "returned",
  "refunded",
  "replaced",
  "closed",
] as const;
export type CustomRequestItemStatus =
  (typeof CUSTOM_REQUEST_ITEM_STATUSES)[number];
export const SHIPMENT_STATUSES = [
  "waiting_for_carrier_pickup",
  "partially_received_by_carrier",
  "partially_rejected_by_carrier",
  "fully_received_by_carrier",
  "in_transit",
  "arrived_at_distribution_center",
  "out_for_delivery",
  "partially_delivered",
  "fully_delivered",
  "customer_rejected_delivery",
  "delivery_failed",
  "returned",
  "closed",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export const SHIPMENT_ITEM_STATUSES = [
  "assigned",
  "received_by_carrier",
  "rejected_by_carrier",
  "in_transit",
  "at_distribution_center",
  "out_for_delivery",
  "delivered",
  "delivery_rejected",
  "delivery_failed",
  "returned",
  "closed",
] as const;
export type ShipmentItemStatus = (typeof SHIPMENT_ITEM_STATUSES)[number];
export const SHIPPING_QUOTE_STATUSES = [
  "requested",
  "pending_buyer",
  "accepted",
  "rejected",
  "superseded",
  "expired",
  "cancelled",
] as const;
export type ShippingQuoteStatus = (typeof SHIPPING_QUOTE_STATUSES)[number];
export const DELIVERY_PLAN_STATUSES = [
  "collecting_quotes",
  "pending_buyer",
  "accepted",
  "reprice_required",
  "separate_selected",
  "cancelled",
  "completed",
] as const;
export type DeliveryPlanStatus = (typeof DELIVERY_PLAN_STATUSES)[number];
export const DELIVERY_PLAN_QUOTE_STATUSES = [
  "pending_buyer",
  "accepted",
  "rejected",
  "superseded",
  "withdrawn",
  "expired",
] as const;
export type DeliveryPlanQuoteStatus =
  (typeof DELIVERY_PLAN_QUOTE_STATUSES)[number];
export const SHIPMENT_ITEM_TYPES = [
  "order_item",
  "custom_request_item",
] as const;
export type ShipmentItemType = (typeof SHIPMENT_ITEM_TYPES)[number];
export const PAYMENT_METHODS = [
  "electronic_payment",
  "cash_on_delivery",
  "wallet",
  "bank_transfer",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_STATUSES = [
  "pending",
  "partially_paid",
  "fully_paid",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const REFUND_STATUSES = [
  "requested",
  "under_review",
  "accepted",
  "rejected",
  "partially_refunded",
  "fully_refunded",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];
export const CANCELLATION_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "executed",
] as const;
export type CancellationStatus = (typeof CANCELLATION_STATUSES)[number];
export const RETURN_STATUSES = [
  "requested",
  "seller_approved",
  "seller_rejected",
  "waiting_for_pickup",
  "picked_up",
  "received",
  "under_inspection",
  "inspection_accepted",
  "inspection_rejected",
  "refund_pending",
  "refunded",
  "closed",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const REPLACEMENT_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "waiting_for_return",
  "return_in_transit",
  "replacement_preparing",
  "replacement_in_transit",
  "replaced",
  "closed",
] as const;
export type ReplacementStatus = (typeof REPLACEMENT_STATUSES)[number];
export const DISPUTE_STATUSES = [
  "opened",
  "buyer_replied",
  "seller_replied",
  "carrier_replied",
  "admin_intervened",
  "admin_decision_issued",
  "closed",
] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];
export const ACTOR_ROLES = [
  "buyer",
  "seller",
  "service_provider",
  "carrier",
  "admin",
  "system",
] as const;
export type ActorRole = (typeof ACTOR_ROLES)[number];
export const AUDIT_ACTIONS = [
  "created",
  "updated",
  "status_changed",
  "price_changed",
  "shipping_fee_changed",
  "tracking_updated",
  "accepted",
  "rejected",
  "cancelled",
  "assigned",
  "received",
  "delivered",
  "delivery_rejected",
  "payment_created",
  "refund_requested",
  "refund_executed",
  "return_requested",
  "replacement_requested",
  "dispute_opened",
  "dispute_replied",
  "admin_decision",
  "admin_change",
  "image_uploaded",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
