import type * as E from "../enums";
export type MinorUnits = number;
export interface Actor { id: string; role: E.ActorRole; ipAddress?: string; source?: string }
export interface MoneyBreakdown { subtotal: MinorUnits; discount: MinorUnits; shipping: MinorUnits; shippingDiscount: MinorUnits; tax: MinorUnits; serviceFee: MinorUnits; platformFee: MinorUnits; grandTotal: MinorUnits; paid: MinorUnits; refunded: MinorUnits; remaining: MinorUnits }
export interface ItemRef { itemType: E.ShipmentItemType; orderItemId?: string; customRequestItemId?: string; quantity: number }
export interface OrderAggregate { id: string; buyerId: string; calculatedStatus: E.OrderStatus; archivedAt?: string | null; closedAt?: string | null; itemStatuses: string[]; sellerStatuses: E.SellerOrderStatus[]; shipmentStatuses: E.ShipmentStatus[]; paymentStatuses: E.PaymentStatus[]; refundStatuses: E.RefundStatus[]; cancellationStatuses: E.CancellationStatus[]; returnStatuses: E.ReturnStatus[]; replacementStatuses: E.ReplacementStatus[] }
export interface AuditInput { orderId: string; entityType: string; entityId: string; action: E.AuditAction; actor: Actor; oldStatus?: string | null; newStatus?: string | null; oldValue?: unknown; newValue?: unknown; reason?: string; notes?: string }

