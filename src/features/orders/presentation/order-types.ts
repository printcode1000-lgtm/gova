"use client";

export type OrderRole = "buyer" | "seller" | "service_provider" | "admin";

export type OrderViewerRole = "buyer" | "seller" | "service_provider";

export type DbRow = Record<string, unknown>;

export interface OrderListItem {
  order: DbRow;
  viewerRoles: OrderViewerRole[];
}

export interface OrderListResponse {
  items: OrderListItem[];
  hasMore: boolean;
}

export interface OrderDetails {
  order: DbRow;
  sellerOrders: DbRow[];
  orderItems: DbRow[];
  customItems: DbRow[];
  shipments: DbRow[];
  shipmentItems: DbRow[];
  shippingQuotes: DbRow[];
  deliveryPlans: DbRow[];
  deliveryPlanStops: DbRow[];
  deliveryPlanCandidates: DbRow[];
  deliveryPlanCandidateStops: DbRow[];
  deliveryPlanQuotes: DbRow[];
  deliveryPlanQuoteStops: DbRow[];
  deliveryPlanShipments: DbRow[];
  cancellations: DbRow[];
  returns: DbRow[];
  returnItems: DbRow[];
  replacements: DbRow[];
  disputes: DbRow[];
  audit: DbRow[];
  profiles: Record<string, unknown>;
}
