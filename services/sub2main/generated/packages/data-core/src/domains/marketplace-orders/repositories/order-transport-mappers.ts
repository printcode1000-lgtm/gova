import type {
  OrderDto,
  SellerOrderDto,
  OrderItemDto,
  CustomRequestItemDto,
  CustomRequestImageDto,
  ShipmentDto,
  ShipmentItemDto,
  ShippingQuoteDto,
  DeliveryPlanDto,
  DeliveryPlanStopDto,
  DeliveryPlanCandidateDto,
  DeliveryPlanCandidateStopDto,
  DeliveryPlanQuoteDto,
  DeliveryPlanQuoteStopDto,
  DeliveryPlanShipmentDto,
  CancellationDto,
  ReturnRequestDto,
  ReturnRequestItemDto,
  ReplacementRequestDto,
  DisputeDto,
  AuditTrailDto,
  PaymentDto,
  RefundDto,
} from "@asol/orders-core";

type PersistenceRow = Record<string, unknown>;

function text(value: unknown): string { return value == null ? "" : String(value); }
function nullableText(value: unknown): string | null { return value == null ? null : String(value); }
function numberValue(value: unknown): number { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function nullableNumber(value: unknown): number | null { if (value == null) return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }

export function mapOrderPersistenceRow(row: PersistenceRow): OrderDto {
  return {
    id: text(row.id),
    orderNumber: text(row.order_number),
    buyerId: text(row.buyer_id),
    orderType: text(row.order_type),
    deliveryAddressSnapshotJson: text(row.delivery_address_snapshot_json),
    currency: text(row.currency),
    notes: nullableText(row.notes),
    source: nullableText(row.source),
    calculatedStatus: text(row.calculated_status),
    subtotalPrice: numberValue(row.subtotal_price),
    itemsDiscountTotal: numberValue(row.items_discount_total),
    orderDiscountTotal: numberValue(row.order_discount_total),
    shippingTotal: numberValue(row.shipping_total),
    shippingDiscountTotal: numberValue(row.shipping_discount_total),
    taxTotal: numberValue(row.tax_total),
    serviceFeeTotal: numberValue(row.service_fee_total),
    platformFeeTotal: numberValue(row.platform_fee_total),
    grandTotal: numberValue(row.grand_total),
    paidTotal: numberValue(row.paid_total),
    refundedTotal: numberValue(row.refunded_total),
    remainingTotal: numberValue(row.remaining_total),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
    archivedAt: nullableText(row.archived_at),
  };
}

export function mapSellerOrderPersistenceRow(row: PersistenceRow): SellerOrderDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    sellerId: text(row.seller_id),
    serviceProviderId: nullableText(row.service_provider_id),
    sellerOrderType: text(row.seller_order_type),
    status: text(row.status),
    sellerSubtotal: numberValue(row.seller_subtotal),
    sellerDiscountTotal: numberValue(row.seller_discount_total),
    sellerShippingTotal: numberValue(row.seller_shipping_total),
    sellerTaxTotal: numberValue(row.seller_tax_total),
    sellerCommissionTotal: numberValue(row.seller_commission_total),
    sellerGrandTotal: numberValue(row.seller_grand_total),
    sellerPayoutTotal: numberValue(row.seller_payout_total),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
    fulfillmentSnapshotJson: text(row.fulfillment_snapshot_json),
  };
}

export function mapOrderItemPersistenceRow(row: PersistenceRow): OrderItemDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    sellerOrderId: text(row.seller_order_id),
    sellerId: text(row.seller_id),
    productId: text(row.product_id),
    variantId: nullableText(row.variant_id),
    productNameSnapshot: text(row.product_name_snapshot),
    productDescriptionSnapshot: text(row.product_description_snapshot),
    productImageSnapshot: nullableText(row.product_image_snapshot),
    quantity: numberValue(row.quantity),
    requiresSpecialVehicle: numberValue(row.requires_special_vehicle),
    requiredVehicleType: nullableText(row.required_vehicle_type),
    weight: nullableNumber(row.weight),
    dimensionsJson: nullableText(row.dimensions_json),
    fragile: numberValue(row.fragile),
    requiresRefrigeration: numberValue(row.requires_refrigeration),
    requiresSpecialLoading: numberValue(row.requires_special_loading),
    shippingNotes: nullableText(row.shipping_notes),
    unitPrice: numberValue(row.unit_price),
    subtotalPrice: numberValue(row.subtotal_price),
    itemDiscountAmount: numberValue(row.item_discount_amount),
    couponDiscountAmount: numberValue(row.coupon_discount_amount),
    shippingPrice: numberValue(row.shipping_price),
    shippingDiscountAmount: numberValue(row.shipping_discount_amount),
    taxAmount: numberValue(row.tax_amount),
    serviceFeeAmount: numberValue(row.service_fee_amount),
    commissionAmount: numberValue(row.commission_amount),
    totalPrice: numberValue(row.total_price),
    paidAmount: numberValue(row.paid_amount),
    refundedAmount: numberValue(row.refunded_amount),
    remainingAmount: numberValue(row.remaining_amount),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
  };
}

export function mapCustomRequestItemPersistenceRow(row: PersistenceRow): CustomRequestItemDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    sellerOrderId: text(row.seller_order_id),
    sellerId: nullableText(row.seller_id),
    serviceProviderId: nullableText(row.service_provider_id),
    title: text(row.title),
    buyerDescription: text(row.buyer_description),
    buyerNotes: nullableText(row.buyer_notes),
    requestedQuantity: nullableNumber(row.requested_quantity),
    requestType: text(row.request_type),
    requiresSellerReviewBeforePricing: numberValue(row.requires_seller_review_before_pricing),
    sellerAccepted: nullableNumber(row.seller_accepted),
    sellerNotes: nullableText(row.seller_notes),
    sellerProvidedDescription: nullableText(row.seller_provided_description),
    availableQuantity: nullableNumber(row.available_quantity),
    suggestedAlternativesJson: nullableText(row.suggested_alternatives_json),
    requiresBuyerPriceApproval: numberValue(row.requires_buyer_price_approval),
    priceOfferExpiresAt: nullableText(row.price_offer_expires_at),
    requiresSpecialVehicle: numberValue(row.requires_special_vehicle),
    requiredVehicleType: nullableText(row.required_vehicle_type),
    estimatedWeight: nullableNumber(row.estimated_weight),
    estimatedDimensionsJson: nullableText(row.estimated_dimensions_json),
    fragile: numberValue(row.fragile),
    requiresRefrigeration: numberValue(row.requires_refrigeration),
    requiresSpecialLoading: numberValue(row.requires_special_loading),
    shippingNotes: nullableText(row.shipping_notes),
    estimatedPrice: nullableNumber(row.estimated_price),
    finalUnitPrice: nullableNumber(row.final_unit_price),
    quantity: nullableNumber(row.quantity),
    subtotalPrice: numberValue(row.subtotal_price),
    discountAmount: numberValue(row.discount_amount),
    shippingPrice: numberValue(row.shipping_price),
    shippingDiscountAmount: numberValue(row.shipping_discount_amount),
    specialVehicleFee: numberValue(row.special_vehicle_fee),
    handlingFee: numberValue(row.handling_fee),
    taxAmount: numberValue(row.tax_amount),
    serviceFeeAmount: numberValue(row.service_fee_amount),
    commissionAmount: numberValue(row.commission_amount),
    totalPrice: numberValue(row.total_price),
    paidAmount: numberValue(row.paid_amount),
    refundedAmount: numberValue(row.refunded_amount),
    remainingAmount: numberValue(row.remaining_amount),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
  };
}

export function mapShipmentPersistenceRow(row: PersistenceRow): ShipmentDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    direction: text(row.direction),
    carrierId: nullableText(row.carrier_id),
    carrierCompanyName: nullableText(row.carrier_company_name),
    trackingNumber: nullableText(row.tracking_number),
    shippingMethod: text(row.shipping_method),
    pickupAddressSnapshotJson: text(row.pickup_address_snapshot_json),
    deliveryAddressSnapshotJson: text(row.delivery_address_snapshot_json),
    expectedDeliveryAt: nullableText(row.expected_delivery_at),
    containsSpecialVehicleItems: numberValue(row.contains_special_vehicle_items),
    requiredVehicleType: nullableText(row.required_vehicle_type),
    totalWeight: nullableNumber(row.total_weight),
    dimensionsJson: nullableText(row.dimensions_json),
    requiresRefrigeration: numberValue(row.requires_refrigeration),
    requiresSpecialLoading: numberValue(row.requires_special_loading),
    carrierNotes: nullableText(row.carrier_notes),
    baseShippingPrice: numberValue(row.base_shipping_price),
    extraHandlingFee: numberValue(row.extra_handling_fee),
    specialVehicleFee: numberValue(row.special_vehicle_fee),
    insuranceFee: numberValue(row.insurance_fee),
    shippingDiscountAmount: numberValue(row.shipping_discount_amount),
    taxAmount: numberValue(row.tax_amount),
    finalShippingPrice: numberValue(row.final_shipping_price),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
  };
}

export function mapShipmentItemPersistenceRow(row: PersistenceRow): ShipmentItemDto {
  return {
    id: text(row.id),
    shipmentId: text(row.shipment_id),
    orderId: text(row.order_id),
    sellerOrderId: text(row.seller_order_id),
    sellerId: nullableText(row.seller_id),
    serviceProviderId: nullableText(row.service_provider_id),
    itemType: text(row.item_type),
    orderItemId: nullableText(row.order_item_id),
    customRequestItemId: nullableText(row.custom_request_item_id),
    quantity: numberValue(row.quantity),
    status: text(row.status),
    carrierReceivedAt: nullableText(row.carrier_received_at),
    deliveredAt: nullableText(row.delivered_at),
    notes: nullableText(row.notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapShippingQuotePersistenceRow(row: PersistenceRow): ShippingQuoteDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    sellerOrderId: text(row.seller_order_id),
    sellerId: text(row.seller_id),
    serviceProviderId: nullableText(row.service_provider_id),
    buyerId: text(row.buyer_id),
    version: numberValue(row.version),
    proposedBy: nullableText(row.proposed_by),
    proposedByRole: nullableText(row.proposed_by_role),
    baseShippingPrice: numberValue(row.base_shipping_price),
    specialVehicleFee: numberValue(row.special_vehicle_fee),
    totalShippingPrice: numberValue(row.total_shipping_price),
    status: text(row.status),
    notes: nullableText(row.notes),
    expiresAt: nullableText(row.expires_at),
    respondedAt: nullableText(row.responded_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapDeliveryPlanPersistenceRow(row: PersistenceRow): DeliveryPlanDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    buyerId: text(row.buyer_id),
    strategy: text(row.strategy),
    status: text(row.status),
    selectedQuoteId: nullableText(row.selected_quote_id),
    fallbackConfirmedPrice: numberValue(row.fallback_confirmed_price),
    fallbackHasPendingQuotes: numberValue(row.fallback_has_pending_quotes),
    fallbackAvailable: numberValue(row.fallback_available),
    specialVehicleRequired: numberValue(row.special_vehicle_required),
    sellerCount: numberValue(row.seller_count),
    currency: text(row.currency),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapDeliveryPlanStopPersistenceRow(row: PersistenceRow): DeliveryPlanStopDto {
  return {
    id: text(row.id),
    planId: text(row.plan_id),
    orderId: text(row.order_id),
    sellerOrderId: text(row.seller_order_id),
    sellerId: text(row.seller_id),
    originalCarrierId: nullableText(row.original_carrier_id),
    pickupAddressSnapshotJson: text(row.pickup_address_snapshot_json),
    requiresLocationQuote: numberValue(row.requires_location_quote),
    fallbackShippingPrice: numberValue(row.fallback_shipping_price),
    fallbackSpecialVehicleFee: numberValue(row.fallback_special_vehicle_fee),
    pickupSequence: numberValue(row.pickup_sequence),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapDeliveryPlanCandidatePersistenceRow(row: PersistenceRow): DeliveryPlanCandidateDto {
  return {
    planId: text(row.plan_id),
    providerId: text(row.provider_id),
    source: text(row.source),
    coverageScore: numberValue(row.coverage_score),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapDeliveryPlanCandidateStopPersistenceRow(row: PersistenceRow): DeliveryPlanCandidateStopDto {
  return {
    planId: text(row.plan_id),
    providerId: text(row.provider_id),
    stopId: text(row.stop_id),
    createdAt: text(row.created_at),
  };
}

export function mapDeliveryPlanQuotePersistenceRow(row: PersistenceRow): DeliveryPlanQuoteDto {
  return {
    id: text(row.id),
    planId: text(row.plan_id),
    orderId: text(row.order_id),
    providerId: text(row.provider_id),
    version: numberValue(row.version),
    baseShippingPrice: numberValue(row.base_shipping_price),
    specialVehicleFee: numberValue(row.special_vehicle_fee),
    totalShippingPrice: numberValue(row.total_shipping_price),
    status: text(row.status),
    notes: nullableText(row.notes),
    expiresAt: nullableText(row.expires_at),
    respondedAt: nullableText(row.responded_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapDeliveryPlanQuoteStopPersistenceRow(row: PersistenceRow): DeliveryPlanQuoteStopDto {
  return {
    quoteId: text(row.quote_id),
    planId: text(row.plan_id),
    stopId: text(row.stop_id),
    createdAt: text(row.created_at),
  };
}

export function mapDeliveryPlanShipmentPersistenceRow(row: PersistenceRow): DeliveryPlanShipmentDto {
  return {
    planId: text(row.plan_id),
    shipmentId: text(row.shipment_id),
    quoteId: nullableText(row.quote_id),
    createdAt: text(row.created_at),
  };
}

export function mapCancellationPersistenceRow(row: PersistenceRow): CancellationDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    sellerOrderId: nullableText(row.seller_order_id),
    orderItemId: nullableText(row.order_item_id),
    customRequestItemId: nullableText(row.custom_request_item_id),
    cancelledBy: text(row.cancelled_by),
    cancelledByRole: text(row.cancelled_by_role),
    reason: text(row.reason),
    affectedAmount: numberValue(row.affected_amount),
    currency: text(row.currency),
    requiresRefund: numberValue(row.requires_refund),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapReturnRequestPersistenceRow(row: PersistenceRow): ReturnRequestDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    buyerId: text(row.buyer_id),
    sellerOrderId: nullableText(row.seller_order_id),
    reason: text(row.reason),
    sellerApproved: nullableNumber(row.seller_approved),
    sellerRejectionReason: nullableText(row.seller_rejection_reason),
    carrierId: nullableText(row.carrier_id),
    returnShipmentId: nullableText(row.return_shipment_id),
    inspectionStatus: nullableText(row.inspection_status),
    inspectionNotes: nullableText(row.inspection_notes),
    refundId: nullableText(row.refund_id),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
  };
}

export function mapReturnRequestItemPersistenceRow(row: PersistenceRow): ReturnRequestItemDto {
  return {
    id: text(row.id),
    returnRequestId: text(row.return_request_id),
    itemType: text(row.item_type),
    orderItemId: nullableText(row.order_item_id),
    customRequestItemId: nullableText(row.custom_request_item_id),
    quantity: numberValue(row.quantity),
    reason: nullableText(row.reason),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapReplacementRequestPersistenceRow(row: PersistenceRow): ReplacementRequestDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    buyerId: text(row.buyer_id),
    sellerOrderId: nullableText(row.seller_order_id),
    reason: text(row.reason),
    sellerApproved: nullableNumber(row.seller_approved),
    sellerRejectionReason: nullableText(row.seller_rejection_reason),
    returnShipmentId: nullableText(row.return_shipment_id),
    replacementShipmentId: nullableText(row.replacement_shipment_id),
    status: text(row.status),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    closedAt: nullableText(row.closed_at),
  };
}

export function mapDisputePersistenceRow(row: PersistenceRow): DisputeDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    sellerOrderId: nullableText(row.seller_order_id),
    orderItemId: nullableText(row.order_item_id),
    customRequestItemId: nullableText(row.custom_request_item_id),
    shipmentId: nullableText(row.shipment_id),
    returnRequestId: nullableText(row.return_request_id),
    openedBy: text(row.opened_by),
    openedByRole: text(row.opened_by_role),
    reason: text(row.reason),
    status: text(row.status),
    adminDecision: nullableText(row.admin_decision),
    closedAt: nullableText(row.closed_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapAuditTrailPersistenceRow(row: PersistenceRow): AuditTrailDto {
  return {
    id: text(row.id),
    orderId: text(row.order_id),
    entityType: text(row.entity_type),
    entityId: text(row.entity_id),
    action: text(row.action),
    oldStatus: nullableText(row.old_status),
    newStatus: nullableText(row.new_status),
    oldValueJson: nullableText(row.old_value_json),
    newValueJson: nullableText(row.new_value_json),
    performedBy: text(row.performed_by),
    performedByRole: text(row.performed_by_role),
    reason: nullableText(row.reason),
    source: nullableText(row.source),
    ipAddress: nullableText(row.ip_address),
    notes: nullableText(row.notes),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapCustomRequestImagePersistenceRow(row: PersistenceRow): CustomRequestImageDto {
  return { id: text(row.id), customRequestItemId: text(row.custom_request_item_id), orderId: text(row.order_id),
    uploadedBy: text(row.uploaded_by), storageProfileId: text(row.storage_profile_id), imageUrl: text(row.image_url),
    imageKey: text(row.image_key), fileName: nullableText(row.file_name), fileSize: numberValue(row.file_size),
    mimeType: text(row.mime_type), width: nullableNumber(row.width), height: nullableNumber(row.height),
    imageDescription: nullableText(row.image_description), sortOrder: numberValue(row.sort_order),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at) };
}

export function mapPaymentPersistenceRow(row: PersistenceRow): PaymentDto {
  return { id: text(row.id), orderId: text(row.order_id), buyerId: text(row.buyer_id), paymentMethod: text(row.payment_method),
    amount: numberValue(row.amount), currency: text(row.currency), status: text(row.status), provider: nullableText(row.provider),
    providerTransactionId: nullableText(row.provider_transaction_id), transactionDataJson: nullableText(row.transaction_data_json),
    paidAt: nullableText(row.paid_at), createdAt: text(row.created_at), updatedAt: text(row.updated_at) };
}

export function mapRefundPersistenceRow(row: PersistenceRow): RefundDto {
  return { id: text(row.id), orderId: text(row.order_id), paymentId: nullableText(row.payment_id),
    orderItemId: nullableText(row.order_item_id), customRequestItemId: nullableText(row.custom_request_item_id),
    returnRequestId: nullableText(row.return_request_id), amount: numberValue(row.amount), currency: text(row.currency),
    reason: text(row.reason), status: text(row.status), executedAt: nullableText(row.executed_at),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at) };
}

export const marketplaceOrderRowMappers = {
  orders: mapOrderPersistenceRow,
  seller_orders: mapSellerOrderPersistenceRow,
  order_items: mapOrderItemPersistenceRow,
  custom_request_items: mapCustomRequestItemPersistenceRow,
  custom_request_images: mapCustomRequestImagePersistenceRow,
  shipments: mapShipmentPersistenceRow,
  shipment_items: mapShipmentItemPersistenceRow,
  shipping_quotes: mapShippingQuotePersistenceRow,
  delivery_plans: mapDeliveryPlanPersistenceRow,
  delivery_plan_stops: mapDeliveryPlanStopPersistenceRow,
  delivery_plan_candidates: mapDeliveryPlanCandidatePersistenceRow,
  delivery_plan_candidate_stops: mapDeliveryPlanCandidateStopPersistenceRow,
  delivery_plan_quotes: mapDeliveryPlanQuotePersistenceRow,
  delivery_plan_quote_stops: mapDeliveryPlanQuoteStopPersistenceRow,
  delivery_plan_shipments: mapDeliveryPlanShipmentPersistenceRow,
  cancellations: mapCancellationPersistenceRow,
  return_requests: mapReturnRequestPersistenceRow,
  return_request_items: mapReturnRequestItemPersistenceRow,
  replacement_requests: mapReplacementRequestPersistenceRow,
  disputes: mapDisputePersistenceRow,
  audit_trail: mapAuditTrailPersistenceRow,
  payments: mapPaymentPersistenceRow,
  refunds: mapRefundPersistenceRow,
} as const;
