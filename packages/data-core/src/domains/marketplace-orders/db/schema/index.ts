export const MARKETPLACE_ORDER_TABLES = ["orders","seller_orders","order_items","custom_request_items","custom_request_images","shipments","shipment_items","payments","refunds","cancellations","cancellation_items","return_requests","return_request_items","replacement_requests","replacement_request_items","disputes","dispute_messages","audit_trail"] as const;
export type MarketplaceOrderTable = (typeof MARKETPLACE_ORDER_TABLES)[number];

