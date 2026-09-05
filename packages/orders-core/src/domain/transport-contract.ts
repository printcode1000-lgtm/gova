/**
 * Application-owned marketplace order transport DTOs.
 *
 * SQL column names stay inside @asol/data-core. These shapes are the only order
 * rows allowed to cross into routes, services, clients, hooks, or presentation.
 */

export interface OrderDto {
  id: string;
  orderNumber: string;
  buyerId: string;
  orderType: string;
  deliveryAddressSnapshotJson: string;
  currency: string;
  notes: string | null;
  source: string | null;
  calculatedStatus: string;
  subtotalPrice: number;
  itemsDiscountTotal: number;
  orderDiscountTotal: number;
  shippingTotal: number;
  shippingDiscountTotal: number;
  taxTotal: number;
  serviceFeeTotal: number;
  platformFeeTotal: number;
  grandTotal: number;
  paidTotal: number;
  refundedTotal: number;
  remainingTotal: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  archivedAt: string | null;
}

export interface SellerOrderDto {
  id: string;
  orderId: string;
  sellerId: string;
  serviceProviderId: string | null;
  sellerOrderType: string;
  status: string;
  sellerSubtotal: number;
  sellerDiscountTotal: number;
  sellerShippingTotal: number;
  sellerTaxTotal: number;
  sellerCommissionTotal: number;
  sellerGrandTotal: number;
  sellerPayoutTotal: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  fulfillmentSnapshotJson: string;
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  productId: string;
  variantId: string | null;
  productNameSnapshot: string;
  productDescriptionSnapshot: string;
  productImageSnapshot: string | null;
  quantity: number;
  requiresSpecialVehicle: number;
  requiredVehicleType: string | null;
  weight: number | null;
  dimensionsJson: string | null;
  fragile: number;
  requiresRefrigeration: number;
  requiresSpecialLoading: number;
  shippingNotes: string | null;
  unitPrice: number;
  subtotalPrice: number;
  itemDiscountAmount: number;
  couponDiscountAmount: number;
  shippingPrice: number;
  shippingDiscountAmount: number;
  taxAmount: number;
  serviceFeeAmount: number;
  commissionAmount: number;
  totalPrice: number;
  paidAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CustomRequestItemDto {
  id: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string | null;
  serviceProviderId: string | null;
  title: string;
  buyerDescription: string;
  buyerNotes: string | null;
  requestedQuantity: number | null;
  requestType: string;
  requiresSellerReviewBeforePricing: number;
  sellerAccepted: number | null;
  sellerNotes: string | null;
  sellerProvidedDescription: string | null;
  availableQuantity: number | null;
  suggestedAlternativesJson: string | null;
  requiresBuyerPriceApproval: number;
  priceOfferExpiresAt: string | null;
  requiresSpecialVehicle: number;
  requiredVehicleType: string | null;
  estimatedWeight: number | null;
  estimatedDimensionsJson: string | null;
  fragile: number;
  requiresRefrigeration: number;
  requiresSpecialLoading: number;
  shippingNotes: string | null;
  estimatedPrice: number | null;
  finalUnitPrice: number | null;
  quantity: number | null;
  subtotalPrice: number;
  discountAmount: number;
  shippingPrice: number;
  shippingDiscountAmount: number;
  specialVehicleFee: number;
  handlingFee: number;
  taxAmount: number;
  serviceFeeAmount: number;
  commissionAmount: number;
  totalPrice: number;
  paidAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface CustomRequestImageDto {
  id: string; customRequestItemId: string; orderId: string; uploadedBy: string;
  storageProfileId: string; imageUrl: string; imageKey: string; fileName: string | null;
  fileSize: number; mimeType: string; width: number | null; height: number | null;
  imageDescription: string | null; sortOrder: number; createdAt: string; updatedAt: string;
}

export interface PaymentDto {
  id: string; orderId: string; buyerId: string; paymentMethod: string; amount: number;
  currency: string; status: string; provider: string | null; providerTransactionId: string | null;
  transactionDataJson: string | null; paidAt: string | null; createdAt: string; updatedAt: string;
}

export interface RefundDto {
  id: string; orderId: string; paymentId: string | null; orderItemId: string | null;
  customRequestItemId: string | null; returnRequestId: string | null; amount: number;
  currency: string; reason: string; status: string; executedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface ShipmentDto {
  id: string;
  orderId: string;
  direction: string;
  carrierId: string | null;
  carrierCompanyName: string | null;
  trackingNumber: string | null;
  shippingMethod: string;
  pickupAddressSnapshotJson: string;
  deliveryAddressSnapshotJson: string;
  expectedDeliveryAt: string | null;
  containsSpecialVehicleItems: number;
  requiredVehicleType: string | null;
  totalWeight: number | null;
  dimensionsJson: string | null;
  requiresRefrigeration: number;
  requiresSpecialLoading: number;
  carrierNotes: string | null;
  baseShippingPrice: number;
  extraHandlingFee: number;
  specialVehicleFee: number;
  insuranceFee: number;
  shippingDiscountAmount: number;
  taxAmount: number;
  finalShippingPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface ShipmentItemDto {
  id: string;
  shipmentId: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string | null;
  serviceProviderId: string | null;
  itemType: string;
  orderItemId: string | null;
  customRequestItemId: string | null;
  quantity: number;
  status: string;
  carrierReceivedAt: string | null;
  deliveredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingQuoteDto {
  id: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  serviceProviderId: string | null;
  buyerId: string;
  version: number;
  proposedBy: string | null;
  proposedByRole: string | null;
  baseShippingPrice: number;
  specialVehicleFee: number;
  totalShippingPrice: number;
  status: string;
  notes: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPlanDto {
  id: string;
  orderId: string;
  buyerId: string;
  strategy: string;
  status: string;
  selectedQuoteId: string | null;
  fallbackConfirmedPrice: number;
  fallbackHasPendingQuotes: number;
  fallbackAvailable: number;
  specialVehicleRequired: number;
  sellerCount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPlanStopDto {
  id: string;
  planId: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  originalCarrierId: string | null;
  pickupAddressSnapshotJson: string;
  requiresLocationQuote: number;
  fallbackShippingPrice: number;
  fallbackSpecialVehicleFee: number;
  pickupSequence: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPlanCandidateDto {
  planId: string;
  providerId: string;
  source: string;
  coverageScore: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPlanCandidateStopDto {
  planId: string;
  providerId: string;
  stopId: string;
  createdAt: string;
}

export interface DeliveryPlanQuoteDto {
  id: string;
  planId: string;
  orderId: string;
  providerId: string;
  version: number;
  baseShippingPrice: number;
  specialVehicleFee: number;
  totalShippingPrice: number;
  status: string;
  notes: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryPlanQuoteStopDto {
  quoteId: string;
  planId: string;
  stopId: string;
  createdAt: string;
}

export interface DeliveryPlanShipmentDto {
  planId: string;
  shipmentId: string;
  quoteId: string | null;
  createdAt: string;
}

export interface CancellationDto {
  id: string;
  orderId: string;
  sellerOrderId: string | null;
  orderItemId: string | null;
  customRequestItemId: string | null;
  cancelledBy: string;
  cancelledByRole: string;
  reason: string;
  affectedAmount: number;
  currency: string;
  requiresRefund: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRequestDto {
  id: string;
  orderId: string;
  buyerId: string;
  sellerOrderId: string | null;
  reason: string;
  sellerApproved: number | null;
  sellerRejectionReason: string | null;
  carrierId: string | null;
  returnShipmentId: string | null;
  inspectionStatus: string | null;
  inspectionNotes: string | null;
  refundId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface ReturnRequestItemDto {
  id: string;
  returnRequestId: string;
  itemType: string;
  orderItemId: string | null;
  customRequestItemId: string | null;
  quantity: number;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReplacementRequestDto {
  id: string;
  orderId: string;
  buyerId: string;
  sellerOrderId: string | null;
  reason: string;
  sellerApproved: number | null;
  sellerRejectionReason: string | null;
  returnShipmentId: string | null;
  replacementShipmentId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface DisputeDto {
  id: string;
  orderId: string;
  sellerOrderId: string | null;
  orderItemId: string | null;
  customRequestItemId: string | null;
  shipmentId: string | null;
  returnRequestId: string | null;
  openedBy: string;
  openedByRole: string;
  reason: string;
  status: string;
  adminDecision: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditTrailDto {
  id: string;
  orderId: string;
  entityType: string;
  entityId: string;
  action: string;
  oldStatus: string | null;
  newStatus: string | null;
  oldValueJson: string | null;
  newValueJson: string | null;
  performedBy: string;
  performedByRole: string;
  reason: string | null;
  source: string | null;
  ipAddress: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOrderDetailsDto {
  order: OrderDto;
  sellerOrders: SellerOrderDto[];
  orderItems: OrderItemDto[];
  customItems: CustomRequestItemDto[];
  shipments: ShipmentDto[];
  shipmentItems: ShipmentItemDto[];
  shippingQuotes: ShippingQuoteDto[];
  deliveryPlans: DeliveryPlanDto[];
  deliveryPlanStops: DeliveryPlanStopDto[];
  deliveryPlanCandidates: DeliveryPlanCandidateDto[];
  deliveryPlanCandidateStops: DeliveryPlanCandidateStopDto[];
  deliveryPlanQuotes: DeliveryPlanQuoteDto[];
  deliveryPlanQuoteStops: DeliveryPlanQuoteStopDto[];
  deliveryPlanShipments: DeliveryPlanShipmentDto[];
  cancellations: CancellationDto[];
  returns: ReturnRequestDto[];
  returnItems: ReturnRequestItemDto[];
  replacements: ReplacementRequestDto[];
  disputes: DisputeDto[];
  audit: AuditTrailDto[];
}

export type OrderViewerRole = "buyer" | "seller" | "service_provider";
export interface OrderListEntryDto { order: OrderDto; viewerRoles: OrderViewerRole[]; }
export interface OrderListPageDto { items: OrderListEntryDto[]; hasMore: boolean; }
