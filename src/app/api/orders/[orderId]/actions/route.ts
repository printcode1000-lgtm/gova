import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderService } from "@/modules/marketplace-orders/api/server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";
import {
  actorFromInput,
  mapOrderError,
  moneyMinor,
} from "../../order-api-helpers";
import type { ActorRole } from "@/modules/marketplace-orders/domain/enums";
import { notificationSendService } from "@/features/notifications/services/notification-service.bootstrap.server";
import {
  NotificationCategories,
  NotificationPriorities,
} from "@/features/notifications/domain/enums";

interface ActionInput {
  uid: string;
  phone?: string;
  role?: ActorRole;
  action: string;
  itemId?: string;
  customItemId?: string;
  sellerOrderId?: string;
  shipmentId?: string;
  shipmentItemId?: string;
  returnRequestId?: string;
  priceMinor?: number;
  shippingQuoteId?: string;
  shippingPriceMinor?: number;
  notes?: string;
  reason?: string;
}

async function notifyShippingQuote(input: {
  uids: string[];
  orderId: string;
  quoteId: string;
  status: "pending_buyer" | "accepted" | "rejected";
  amount: number;
}) {
  const recipients = Array.from(new Set(input.uids.filter(Boolean)));
  if (recipients.length === 0) return;
  const amount = new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
  }).format(input.amount / 100);
  const content =
    input.status === "pending_buyer"
      ? {
          title: "عرض شحن جديد",
          body: `تم إرسال عرض شحن بقيمة ${amount}. راجع الطلب للقبول أو الرفض.`,
        }
      : input.status === "accepted"
        ? {
            title: "تم قبول عرض الشحن",
            body: `وافق المشتري على عرض الشحن بقيمة ${amount}.`,
          }
        : {
            title: "تم رفض عرض الشحن",
            body: `رفض المشتري عرض الشحن بقيمة ${amount}. يمكنك إرسال عرض معدل.`,
          };
  await notificationSendService
    .sendToUsers({
      uids: recipients,
      title: content.title,
      body: content.body,
      locale: "ar",
      category: NotificationCategories.Offers,
      priority: NotificationPriorities.High,
      dedupeKey: `shipping-quote:${input.quoteId}:${input.status}`,
      route: {
        href: `/orders/details?orderId=${encodeURIComponent(input.orderId)}&role=${
          input.status === "pending_buyer" ? "buyer" : "seller"
        }`,
        label: "عرض الطلب",
      },
      metadata: {
        orderId: input.orderId,
        shippingQuoteId: input.quoteId,
        shippingQuoteStatus: input.status,
        amount: input.amount,
      },
    })
    .catch(() => undefined);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return runTracedBusinessRoute(
    "POST /api/orders/:orderId/actions",
    async () => {
      try {
        const { orderId } = await params;
        const body = (await request.json()) as ActionInput;
        const service = getMarketplaceOrderService();
        const adminCapable = actorFromInput(
          { uid: body.uid, phone: body.phone },
          "buyer",
        );
        const identity = { uid: body.uid, phone: body.phone };
        const asBuyer =
          adminCapable.role === "admin"
            ? adminCapable
            : actorFromInput(identity, "buyer");
        const asSeller =
          adminCapable.role === "admin"
            ? adminCapable
            : actorFromInput(
                {
                  ...identity,
                  role:
                    body.role === "service_provider"
                      ? "service_provider"
                      : "seller",
                },
                "seller",
              );
        const asCarrier =
          adminCapable.role === "admin"
            ? adminCapable
            : actorFromInput(identity, "carrier");

        switch (body.action) {
          case "seller_accept_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.sellerAcceptItem(body.itemId, asSeller),
            );
          case "seller_reject_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.sellerRejectItem(
                body.itemId,
                asSeller,
                body.reason,
              ),
            );
          case "seller_accept_custom_request":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await service.sellerAcceptCustomRequest(
                body.customItemId,
                asSeller,
              ),
            );
          case "seller_reject_custom_request":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await service.sellerRejectCustomRequest(
                body.customItemId,
                asSeller,
                body.reason,
              ),
            );
          case "seller_send_custom_price_offer":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await service.sellerSendPriceOfferForCustomRequest(
                body.customItemId,
                { unitPrice: moneyMinor(body.priceMinor), quantity: 1 },
                asSeller,
              ),
            );
          case "seller_send_shipping_quote": {
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            const quote = await service.proposeShippingQuote(
              body.sellerOrderId,
              {
                baseShippingPrice: moneyMinor(body.shippingPriceMinor),
                notes: body.notes,
              },
              asSeller,
            );
            await notifyShippingQuote({
              uids: [String(quote.buyer_id)],
              orderId,
              quoteId: String(quote.id),
              status: "pending_buyer",
              amount: Number(quote.total_shipping_price),
            });
            return apiSuccess(quote);
          }
          case "buyer_accept_shipping_quote": {
            if (!body.shippingQuoteId)
              throw new Error("shippingQuoteId is required");
            const quote = await service.acceptShippingQuote(
              body.shippingQuoteId,
              asBuyer,
            );
            await notifyShippingQuote({
              uids: [
                String(quote.proposed_by ?? ""),
                String(quote.seller_id ?? ""),
                String(quote.service_provider_id ?? ""),
              ],
              orderId,
              quoteId: String(quote.id),
              status: "accepted",
              amount: Number(quote.total_shipping_price),
            });
            return apiSuccess(quote);
          }
          case "buyer_reject_shipping_quote": {
            if (!body.shippingQuoteId)
              throw new Error("shippingQuoteId is required");
            const quote = await service.rejectShippingQuote(
              body.shippingQuoteId,
              asBuyer,
            );
            await notifyShippingQuote({
              uids: [
                String(quote.proposed_by ?? ""),
                String(quote.seller_id ?? ""),
                String(quote.service_provider_id ?? ""),
              ],
              orderId,
              quoteId: String(quote.id),
              status: "rejected",
              amount: Number(quote.total_shipping_price),
            });
            return apiSuccess(quote);
          }
          case "buyer_accept_custom_price":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await service.buyerAcceptCustomRequestPrice(
                body.customItemId,
                asBuyer,
              ),
            );
          case "buyer_reject_custom_price":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await service.buyerRejectCustomRequestPrice(
                body.customItemId,
                asBuyer,
              ),
            );
          case "seller_prepare_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.sellerMarkItemPreparing(body.itemId, asSeller),
            );
          case "seller_ready_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.sellerMarkItemReadyForShipping(
                body.itemId,
                asSeller,
              ),
            );
          case "admin_create_seller_shipment":
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            return apiSuccess(
              await service.createSellerOrderShipment(
                orderId,
                { sellerOrderId: body.sellerOrderId },
                adminCapable,
              ),
            );
          case "buyer_cancel_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.cancelOrderItem(
                body.itemId,
                body.reason || "buyer_cancelled",
                asBuyer,
              ),
            );
          case "buyer_cancel_custom_request":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await service.cancelCustomRequestItem(
                body.customItemId,
                body.reason || "buyer_cancelled",
                asBuyer,
              ),
            );
          case "buyer_cancel_seller_order":
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            return apiSuccess(
              await service.cancelSellerOrder(
                body.sellerOrderId,
                body.reason || "buyer_cancelled",
                asBuyer,
              ),
            );
          case "buyer_cancel_order":
            return apiSuccess(
              await service.cancelFullOrder(
                orderId,
                body.reason || "buyer_cancelled",
                asBuyer,
              ),
            );
          case "buyer_reject_delivery_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.buyerRejectDeliveryItem(
                body.itemId,
                body.reason || "buyer_rejected_delivery",
                asBuyer,
              ),
            );
          case "buyer_reject_delivery_seller_order":
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            return apiSuccess(
              await service.buyerRejectSellerDelivery(
                body.sellerOrderId,
                body.reason || "buyer_rejected_delivery",
                asBuyer,
              ),
            );
          case "buyer_reject_delivery_order":
            return apiSuccess(
              await service.buyerRejectOrderDelivery(
                orderId,
                body.reason || "buyer_rejected_delivery",
                asBuyer,
              ),
            );
          case "buyer_request_return_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await service.createReturnRequest(
                orderId,
                {
                  reason: body.reason || "buyer_return_requested",
                  items: [
                    {
                      itemType: "order_item",
                      orderItemId: body.itemId,
                      quantity: 1,
                    },
                  ],
                },
                asBuyer,
              ),
            );
          case "seller_approve_return":
            if (!body.returnRequestId)
              throw new Error("returnRequestId is required");
            return apiSuccess(
              await service.approveReturnRequest(
                body.returnRequestId,
                asSeller,
              ),
            );
          case "seller_reject_return":
            if (!body.returnRequestId)
              throw new Error("returnRequestId is required");
            return apiSuccess(
              await service.rejectReturnRequest(
                body.returnRequestId,
                asSeller,
                body.reason,
              ),
            );
          case "carrier_in_transit":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await service.markShipmentInTransit(body.shipmentId, asCarrier),
            );
          case "carrier_receive_shipment":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await service.setShipmentItemsStatus(
                body.shipmentId,
                "received_by_carrier",
                asCarrier,
              ),
            );
          case "carrier_reject_shipment":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await service.setShipmentItemsStatus(
                body.shipmentId,
                "rejected_by_carrier",
                asCarrier,
              ),
            );
          case "carrier_out_for_delivery":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await service.markShipmentOutForDelivery(
                body.shipmentId,
                asCarrier,
              ),
            );
          case "carrier_delivered":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await service.markShipmentFullyDelivered(
                body.shipmentId,
                asCarrier,
              ),
            );
          case "carrier_deliver_shipment_item":
            if (!body.shipmentItemId)
              throw new Error("shipmentItemId is required");
            return apiSuccess(
              await service.markShipmentItemDelivered(
                body.shipmentItemId,
                asCarrier,
              ),
            );
          default:
            throw new Error("Unknown order action");
        }
      } catch (error) {
        return mapOrderError(error);
      }
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
