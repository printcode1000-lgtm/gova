import type {
  ActorRole,
  AuditAction,
  CancellationStatus,
  CustomRequestItemStatus,
  CustomRequestType,
  DeliveryPlanQuoteStatus,
  DeliveryPlanStatus,
  DisputeStatus,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  ReplacementStatus,
  ReturnStatus,
  SellerOrderStatus,
  SellerOrderType,
  ShipmentItemStatus,
  ShipmentItemType,
  ShippingQuoteStatus,
  ShipmentStatus,
} from "../enums";
export interface OrderEntity {
  id: string;
  orderNumber: string;
  buyerId: string;
  orderType: OrderType;
  deliveryAddressSnapshotJson: string;
  currency: string;
  notes: string | null;
  source: string | null;
  calculatedStatus: OrderStatus;
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
export interface SellerOrderEntity {
  id: string;
  orderId: string;
  sellerId: string;
  serviceProviderId: string | null;
  sellerOrderType: SellerOrderType;
  status: SellerOrderStatus;
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
}
export interface OrderItemEntity {
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
  requiresSpecialVehicle: boolean;
  requiredVehicleType: string | null;
  fragile: boolean;
  requiresRefrigeration: boolean;
  requiresSpecialLoading: boolean;
  unitPrice: number;
  subtotalPrice: number;
  totalPrice: number;
  paidAmount: number;
  refundedAmount: number;
  remainingAmount: number;
  status: OrderItemStatus;
}
export interface CustomRequestItemEntity {
  id: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string | null;
  serviceProviderId: string | null;
  title: string;
  buyerDescription: string;
  requestType: CustomRequestType;
  priceOfferExpiresAt: string | null;
  finalUnitPrice: number | null;
  quantity: number | null;
  totalPrice: number;
  status: CustomRequestItemStatus;
}
export interface CustomRequestImageEntity {
  id: string;
  customRequestItemId: string;
  orderId: string;
  uploadedBy: string;
  storageProfileId: "spicialOrder";
  imageUrl: string;
  imageKey: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  imageDescription: string | null;
}
export interface ShipmentEntity {
  id: string;
  orderId: string;
  direction: "outbound" | "return" | "replacement";
  carrierId: string | null;
  trackingNumber: string | null;
  containsSpecialVehicleItems: boolean;
  requiresRefrigeration: boolean;
  requiresSpecialLoading: boolean;
  finalShippingPrice: number;
  status: ShipmentStatus;
}
export interface ShipmentItemEntity {
  id: string;
  shipmentId: string;
  orderId: string;
  sellerOrderId: string;
  itemType: ShipmentItemType;
  orderItemId: string | null;
  customRequestItemId: string | null;
  quantity: number;
  status: ShipmentItemStatus;
}
export interface ShippingQuoteEntity {
  id: string;
  orderId: string;
  sellerOrderId: string;
  sellerId: string;
  serviceProviderId: string | null;
  buyerId: string;
  version: number;
  proposedBy: string | null;
  proposedByRole: "seller" | "service_provider" | "admin" | null;
  baseShippingPrice: number;
  specialVehicleFee: number;
  totalShippingPrice: number;
  status: ShippingQuoteStatus;
  notes: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface DeliveryPlanEntity {
  id: string;
  orderId: string;
  buyerId: string;
  strategy: "unified" | "hybrid" | "separate";
  status: DeliveryPlanStatus;
  selectedQuoteId: string | null;
  fallbackConfirmedPrice: number;
  fallbackHasPendingQuotes: boolean;
  fallbackAvailable: boolean;
  specialVehicleRequired: boolean;
  sellerCount: number;
  currency: string;
}
export interface DeliveryPlanQuoteEntity {
  id: string;
  planId: string;
  orderId: string;
  providerId: string;
  version: number;
  baseShippingPrice: number;
  specialVehicleFee: number;
  totalShippingPrice: number;
  status: DeliveryPlanQuoteStatus;
  notes: string | null;
  expiresAt: string | null;
  respondedAt: string | null;
}
export interface PaymentEntity {
  id: string;
  orderId: string;
  buyerId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
}
export interface RefundEntity {
  id: string;
  orderId: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
}
export interface CancellationEntity {
  id: string;
  orderId: string;
  cancelledBy: string;
  cancelledByRole: ActorRole;
  affectedAmount: number;
  currency: string;
  status: CancellationStatus;
}
export interface ReturnRequestEntity {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  status: ReturnStatus;
}
export interface ReplacementRequestEntity {
  id: string;
  orderId: string;
  buyerId: string;
  reason: string;
  status: ReplacementStatus;
}
export interface DisputeEntity {
  id: string;
  orderId: string;
  openedBy: string;
  openedByRole: ActorRole;
  reason: string;
  status: DisputeStatus;
  adminDecision: string | null;
}
export interface AuditTrailEntity {
  id: string;
  orderId: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  performedByRole: ActorRole;
  createdAt: string;
}
