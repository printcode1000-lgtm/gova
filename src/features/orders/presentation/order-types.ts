"use client";

import type {
  MarketplaceOrderDetailsDto,
  OrderListEntryDto,
  OrderListPageDto,
  OrderViewerRole,
} from "@asol/orders-core";

export type OrderRole = "buyer" | "seller" | "service_provider" | "admin";
export type { OrderViewerRole };
export type OrderListItem = OrderListEntryDto;
export type OrderListResponse = OrderListPageDto;
export interface OrderDetails extends MarketplaceOrderDetailsDto {
  profiles: Record<string, unknown>;
}
