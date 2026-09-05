import { assertCamelCaseJsonKeys } from "@asol/api-contract-core";
import { marketplaceOrderRowMappers as map } from "../repositories/order-transport-mappers";

type Mapper = (row: Record<string, unknown>) => unknown;

const operationMappers: Readonly<Partial<Record<string, Mapper>>> = {
  createProductOrder: map.orders,
  createCustomRequestOrder: map.orders,
  createMixedOrder: map.orders,
  sellerAcceptItem: map.order_items,
  sellerRejectItem: map.order_items,
  sellerMarkItemPreparing: map.order_items,
  sellerMarkItemReadyForShipping: map.order_items,
  cancelOrderItem: map.order_items,
  buyerRejectDeliveryItem: map.order_items,
  sellerAcceptCustomRequest: map.custom_request_items,
  sellerRejectCustomRequest: map.custom_request_items,
  sellerSendPriceOfferForCustomRequest: map.custom_request_items,
  buyerAcceptCustomRequestPrice: map.custom_request_items,
  buyerRejectCustomRequestPrice: map.custom_request_items,
  cancelCustomRequestItem: map.custom_request_items,
  addCustomRequestImage: map.custom_request_images,
  requestShippingQuote: map.shipping_quotes,
  proposeShippingQuote: map.shipping_quotes,
  acceptShippingQuote: map.shipping_quotes,
  rejectShippingQuote: map.shipping_quotes,
  createUnifiedDeliveryPlan: map.delivery_plans,
  acceptUnifiedDeliveryQuote: map.delivery_plans,
  chooseSeparateDelivery: map.delivery_plans,
  proposeUnifiedDeliveryQuote: map.delivery_plan_quotes,
  rejectUnifiedDeliveryQuote: map.delivery_plan_quotes,
  createUnifiedDeliveryShipment: map.shipments,
  createShipment: map.shipments,
  createSellerOrderShipment: map.shipments,
  updateShipmentPricing: map.shipments,
  setShipmentItemsStatus: map.shipments,
  markShipmentInTransit: map.shipments,
  markShipmentArrivedAtDistributionCenter: map.shipments,
  markShipmentOutForDelivery: map.shipments,
  markShipmentFullyDelivered: map.shipments,
  assignOrderItemToShipment: map.shipment_items,
  assignCustomRequestItemToShipment: map.shipment_items,
  updateShipmentItem: map.shipment_items,
  carrierReceiveShipmentItem: map.shipment_items,
  carrierRejectShipmentItem: map.shipment_items,
  markShipmentItemDelivered: map.shipment_items,
  markShipmentItemDeliveryRejected: map.shipment_items,
  markShipmentItemDeliveryFailed: map.shipment_items,
  cancelSellerOrder: map.seller_orders,
  buyerRejectSellerDelivery: map.seller_orders,
  assignSellerOrderCarrier: map.seller_orders,
  cancelFullOrder: map.orders,
  buyerRejectOrderDelivery: map.orders,
  buyerUpdateDeliveryAddress: map.orders,
  adminUpdateOrder: map.orders,
  registerPayment: map.payments,
  createRefund: map.refunds,
  executeRefund: map.refunds,
  createReturnRequest: map.return_requests,
  approveReturnRequest: map.return_requests,
  rejectReturnRequest: map.return_requests,
  createReplacementRequest: map.replacement_requests,
  approveReplacementRequest: map.replacement_requests,
  rejectReplacementRequest: map.replacement_requests,
  openDispute: map.disputes,
  replyToDispute: map.disputes,
  adminResolveDispute: map.disputes,
};

export function mapMarketplaceOrderServiceResult(
  operation: string,
  value: unknown,
): unknown {
  const mapper = operationMappers[operation];
  const mapped =
    mapper && value && typeof value === "object" && !Array.isArray(value)
      ? mapper(value as Record<string, unknown>)
      : value;
  assertCamelCaseJsonKeys(mapped, {
    label: `marketplace order service ${operation}`,
  });
  return mapped;
}
export const mappedMarketplaceOrderServiceOperations = Object.freeze(
  Object.keys(operationMappers).sort(),
);
