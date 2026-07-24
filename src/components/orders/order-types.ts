"use client";

export type OrderRole = "buyer" | "seller" | "service_provider" | "admin";

export type DbRow = Record<string, unknown>;

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
