import assert from "node:assert/strict";
import { createMemoryMarketplaceDb } from "../db/test-client";
import { MarketplaceOrderService } from "../services/marketplace-order-service";
import * as enums from "../domain/enums";
const columns: Record<string, string> = {
  orders:
    "id order_number buyer_id order_type delivery_address_snapshot_json currency notes source calculated_status subtotal_price items_discount_total order_discount_total shipping_total shipping_discount_total tax_total service_fee_total platform_fee_total grand_total paid_total refunded_total remaining_total created_at updated_at closed_at archived_at",
  seller_orders:
    "id order_id seller_id service_provider_id seller_order_type status seller_subtotal seller_discount_total seller_shipping_total seller_tax_total seller_commission_total seller_grand_total seller_payout_total created_at updated_at closed_at",
  order_items:
    "id order_id seller_order_id seller_id product_id variant_id product_name_snapshot product_description_snapshot product_image_snapshot quantity requires_special_vehicle required_vehicle_type weight dimensions_json fragile requires_refrigeration requires_special_loading shipping_notes unit_price subtotal_price item_discount_amount coupon_discount_amount shipping_price shipping_discount_amount tax_amount service_fee_amount commission_amount total_price paid_amount refunded_amount remaining_amount status created_at updated_at closed_at",
  custom_request_items:
    "id order_id seller_order_id seller_id service_provider_id title buyer_description buyer_notes requested_quantity request_type requires_seller_review_before_pricing seller_accepted seller_notes seller_provided_description available_quantity suggested_alternatives_json requires_buyer_price_approval price_offer_expires_at requires_special_vehicle required_vehicle_type estimated_weight estimated_dimensions_json fragile requires_refrigeration requires_special_loading shipping_notes estimated_price final_unit_price quantity subtotal_price discount_amount shipping_price shipping_discount_amount special_vehicle_fee handling_fee tax_amount service_fee_amount commission_amount total_price paid_amount refunded_amount remaining_amount status created_at updated_at closed_at",
  custom_request_images:
    "id custom_request_item_id order_id uploaded_by storage_profile_id image_url image_key file_name file_size mime_type width height image_description created_at updated_at",
  shipments:
    "id order_id carrier_id carrier_company_name tracking_number shipping_method pickup_address_snapshot_json delivery_address_snapshot_json expected_delivery_at contains_special_vehicle_items required_vehicle_type total_weight dimensions_json requires_refrigeration requires_special_loading carrier_notes base_shipping_price extra_handling_fee special_vehicle_fee insurance_fee shipping_discount_amount tax_amount final_shipping_price status created_at updated_at closed_at",
  shipment_items:
    "id shipment_id order_id seller_order_id seller_id service_provider_id item_type order_item_id custom_request_item_id quantity status carrier_received_at delivered_at notes created_at updated_at",
  shipping_quotes:
    "id order_id seller_order_id seller_id service_provider_id buyer_id version proposed_by proposed_by_role base_shipping_price special_vehicle_fee total_shipping_price status notes expires_at responded_at created_at updated_at",
  delivery_plans:
    "id order_id buyer_id strategy status selected_quote_id fallback_confirmed_price fallback_has_pending_quotes fallback_available special_vehicle_required seller_count currency created_at updated_at",
  delivery_plan_stops:
    "id plan_id order_id seller_order_id seller_id original_carrier_id pickup_address_snapshot_json requires_location_quote fallback_shipping_price fallback_special_vehicle_fee pickup_sequence status created_at updated_at",
  delivery_plan_candidates:
    "plan_id provider_id source coverage_score status created_at updated_at",
  delivery_plan_candidate_stops: "plan_id provider_id stop_id created_at",
  delivery_plan_quotes:
    "id plan_id order_id provider_id version base_shipping_price special_vehicle_fee total_shipping_price status notes expires_at responded_at created_at updated_at",
  delivery_plan_quote_stops: "quote_id plan_id stop_id created_at",
  delivery_plan_shipments: "plan_id shipment_id quote_id created_at",
  payments:
    "id order_id buyer_id payment_method amount currency status provider provider_transaction_id transaction_data_json paid_at created_at updated_at",
  refunds:
    "id order_id payment_id order_item_id custom_request_item_id return_request_id amount currency reason status executed_at created_at updated_at",
  cancellations:
    "id order_id seller_order_id order_item_id custom_request_item_id cancelled_by cancelled_by_role reason affected_amount currency requires_refund status created_at updated_at",
  cancellation_items:
    "id cancellation_id order_item_id custom_request_item_id amount created_at",
  return_requests:
    "id order_id buyer_id seller_order_id reason seller_approved seller_rejection_reason carrier_id return_shipment_id inspection_status inspection_notes refund_id status created_at updated_at closed_at",
  return_request_items:
    "id return_request_id item_type order_item_id custom_request_item_id quantity reason created_at updated_at",
  replacement_requests:
    "id order_id buyer_id seller_order_id reason seller_approved seller_rejection_reason return_shipment_id replacement_shipment_id status created_at updated_at closed_at",
  replacement_request_items:
    "id replacement_request_id old_item_type old_order_item_id old_custom_request_item_id replacement_description replacement_product_id replacement_variant_id quantity created_at updated_at",
  disputes:
    "id order_id seller_order_id order_item_id custom_request_item_id shipment_id return_request_id opened_by opened_by_role reason status admin_decision closed_at created_at updated_at",
  dispute_messages:
    "id dispute_id sender_id sender_role message created_at updated_at",
  audit_trail:
    "id order_id entity_type entity_id action old_status new_status old_value_json new_value_json performed_by performed_by_role reason source ip_address notes created_at updated_at",
};
const methods =
  "createProductOrder createCustomRequestOrder createMixedOrder addOrderItem addCustomRequestItem addCustomRequestImage sellerAcceptItem sellerRejectItem sellerAcceptCustomRequest sellerRejectCustomRequest sellerSendPriceOfferForCustomRequest buyerAcceptCustomRequestPrice buyerRejectCustomRequestPrice requestShippingQuote proposeShippingQuote acceptShippingQuote rejectShippingQuote createUnifiedDeliveryPlan proposeUnifiedDeliveryQuote acceptUnifiedDeliveryQuote rejectUnifiedDeliveryQuote chooseSeparateDelivery createUnifiedDeliveryShipment cancelFullOrder cancelSellerOrder cancelOrderItem cancelCustomRequestItem createShipment assignOrderItemToShipment assignCustomRequestItemToShipment carrierReceiveShipmentItem carrierRejectShipmentItem markShipmentInTransit markShipmentOutForDelivery markShipmentItemDelivered markShipmentPartiallyDelivered markShipmentFullyDelivered registerPayment markPaymentFailed createRefund executeRefund createReturnRequest approveReturnRequest rejectReturnRequest createReplacementRequest approveReplacementRequest rejectReplacementRequest openDispute replyToDispute adminResolveDispute recalculateOrderPricing recalculateSellerOrderPricing recalculateShipmentPricing recalculateOrderStatus recalculateSellerOrderStatus".split(
    " ",
  );
async function main() {
  const db = createMemoryMarketplaceDb();
  for (const [table, required] of Object.entries(columns)) {
    const actual = new Set(
      (await db.execute(`PRAGMA table_info(${table})`)).map((x) =>
        String(x.name),
      ),
    );
    for (const column of required.split(" "))
      assert.ok(actual.has(column), `${table}.${column} is missing`);
  }
  const service = new MarketplaceOrderService(db) as any;
  for (const method of methods)
    assert.equal(typeof service[method], "function", `${method} is missing`);
  for (const name of [
    "ORDER_TYPES",
    "SELLER_ORDER_TYPES",
    "CUSTOM_REQUEST_TYPES",
    "ORDER_STATUSES",
    "SELLER_ORDER_STATUSES",
    "ORDER_ITEM_STATUSES",
    "CUSTOM_REQUEST_ITEM_STATUSES",
    "SHIPMENT_STATUSES",
    "SHIPMENT_ITEM_STATUSES",
    "SHIPPING_QUOTE_STATUSES",
    "DELIVERY_PLAN_STATUSES",
    "DELIVERY_PLAN_QUOTE_STATUSES",
    "PAYMENT_METHODS",
    "PAYMENT_STATUSES",
    "REFUND_STATUSES",
    "CANCELLATION_STATUSES",
    "RETURN_STATUSES",
    "REPLACEMENT_STATUSES",
    "DISPUTE_STATUSES",
    "ACTOR_ROLES",
    "AUDIT_ACTIONS",
    "SHIPMENT_ITEM_TYPES",
  ])
    assert.ok(Array.isArray((enums as any)[name]), `${name} is missing`);
  console.log(
    `marketplace-orders contract: ${Object.keys(columns).length} tables, ${methods.length} required services, and 22 enum families verified`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
