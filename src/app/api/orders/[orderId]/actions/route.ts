import { apiSuccess } from "@/core/api/api-response";
import {
  getMarketplaceOrderQueries,
  getMarketplaceOrderService,
} from "@/modules/data-access/domains/marketplace-orders/index.server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";
import { actorFromInput } from "@/modules/marketplace-orders/domain/actor-from-input";
import { mapOrderError, moneyMinor } from "../../order-api-helpers";
import type { ActorRole } from "@/modules/marketplace-orders/domain/enums";
import {
  notificationsServer,
  moneyVariablesByLocale,
} from "@/features/notifications/server";
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";
import { logServerSystemIssue } from "@/features/system-logs/services/persistent-system-log-service.server";

import {
  ActionInput,
  grantDeliveryPlan,
  grantShippingQuote,
} from "./route-parts/route.action-grants";
import {
  applyBuyerDeliveryToOrder,
  applyCarrierToOrder,
} from "@/features/orders/services/order-progression.server";
import {
  finalizeOrderActionResponse,
  type OrderActionNotificationContext,
} from "@/features/orders/services/order-action-notifications.server";

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
        const notificationGrants = notificationsServer.createGrantIssuer(
          body.uid,
        );
        const service = getMarketplaceOrderService();
        const queries = getMarketplaceOrderQueries();
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
        const asDeliveryProvider =
          adminCapable.role === "admin"
            ? adminCapable
            : actorFromInput(
                { ...identity, role: "service_provider" },
                "service_provider",
              );

        const notifyPayload = (context?: OrderActionNotificationContext) => ({
          grants: notificationGrants,
          orderId,
          action: body.action,
          actorUid: body.uid,
          queries,
          context,
        });

        switch (body.action) {
          case "seller_accept_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.sellerAcceptItem(body.itemId, asSeller),
              }),
            );
          case "seller_reject_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.sellerRejectItem(
                  body.itemId,
                  asSeller,
                  body.reason,
                ),
              }),
            );
          case "seller_accept_custom_request":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ customItemId: body.customItemId }),
                result: await service.sellerAcceptCustomRequest(
                  body.customItemId,
                  asSeller,
                ),
              }),
            );
          case "seller_reject_custom_request":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ customItemId: body.customItemId }),
                result: await service.sellerRejectCustomRequest(
                  body.customItemId,
                  asSeller,
                  body.reason,
                ),
              }),
            );
          case "seller_send_custom_price_offer":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({
                  customItemId: body.customItemId,
                  priceMinor: body.priceMinor,
                }),
                result: await service.sellerSendPriceOfferForCustomRequest(
                  body.customItemId,
                  { unitPrice: moneyMinor(body.priceMinor), quantity: 1 },
                  asSeller,
                ),
              }),
            );
          case "seller_assign_delivery_carrier": {
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            const carrierUid = body.carrierUid?.trim();
            if (!carrierUid) throw new Error("carrierUid is required");
            const fulfillment = await profileService.getFulfillmentSettings(
              body.uid,
            );
            if (!fulfillment.carrierUids.includes(carrierUid)) {
              throw new Error(
                "carrierUid is not linked in fulfillment settings",
              );
            }
            const sellerOrder = await applyCarrierToOrder(
              orderId,
              body.sellerOrderId,
              carrierUid,
              service,
              queries,
              asSeller,
              notificationGrants,
            );
            return apiSuccess(
              notificationsServer.attachGrants(
                sellerOrder,
                notificationGrants.toArray(),
              ),
            );
          }
          case "buyer_apply_delivery_address": {
            const result = await applyBuyerDeliveryToOrder(
              orderId,
              body.uid,
              body.phone,
              service,
              queries,
              asBuyer,
              notificationGrants,
            );
            return apiSuccess(
              notificationsServer.attachGrants(
                result,
                notificationGrants.toArray(),
              ),
            );
          }
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
            grantShippingQuote(notificationGrants, {
              uids: [String(quote.buyer_id)],
              orderId,
              quoteId: String(quote.id),
              status: "pending_buyer",
              amount: Number(quote.total_shipping_price),
            });
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...quote },
                notificationGrants.toArray(),
              ),
            );
          }
          case "provider_send_unified_delivery_quote": {
            if (!body.deliveryPlanId)
              throw new Error("deliveryPlanId is required");
            const quote = await service.proposeUnifiedDeliveryQuote(
              body.deliveryPlanId,
              {
                baseShippingPrice: moneyMinor(body.shippingPriceMinor),
                specialVehicleFee: moneyMinor(body.specialVehicleFeeMinor ?? 0),
                notes: body.notes,
              },
              asDeliveryProvider,
            );
            const details =
              await getMarketplaceOrderQueries().getDetails(orderId);
            grantDeliveryPlan(notificationGrants, {
              uids: [String(details?.order.buyer_id ?? "")],
              orderId,
              planId: body.deliveryPlanId,
              quoteId: String(quote.id),
              status: "new_quote",
              amount: Number(quote.total_shipping_price),
            });
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...quote },
                notificationGrants.toArray(),
              ),
            );
          }
          case "buyer_accept_unified_delivery_quote": {
            if (!body.deliveryPlanQuoteId)
              throw new Error("deliveryPlanQuoteId is required");
            const plan = await service.acceptUnifiedDeliveryQuote(
              body.deliveryPlanQuoteId,
              asBuyer,
            );
            const details =
              await getMarketplaceOrderQueries().getDetails(orderId);
            const quote = details?.deliveryPlanQuotes.find(
              (entry) => String(entry.id) === body.deliveryPlanQuoteId,
            );
            grantDeliveryPlan(notificationGrants, {
              uids: [String(quote?.provider_id ?? "")],
              orderId,
              planId: String(plan.id),
              quoteId: body.deliveryPlanQuoteId,
              status: "accepted",
              amount: Number(quote?.total_shipping_price ?? 0),
            });
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...plan },
                notificationGrants.toArray(),
              ),
            );
          }
          case "buyer_reject_unified_delivery_quote": {
            if (!body.deliveryPlanQuoteId)
              throw new Error("deliveryPlanQuoteId is required");
            const quote = await service.rejectUnifiedDeliveryQuote(
              body.deliveryPlanQuoteId,
              asBuyer,
            );
            grantDeliveryPlan(notificationGrants, {
              uids: [String(quote.provider_id ?? "")],
              orderId,
              planId: String(quote.plan_id),
              quoteId: body.deliveryPlanQuoteId,
              status: "rejected",
              amount: Number(quote.total_shipping_price),
            });
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...quote },
                notificationGrants.toArray(),
              ),
            );
          }
          case "buyer_choose_separate_delivery": {
            if (!body.deliveryPlanId)
              throw new Error("deliveryPlanId is required");
            const plan = await service.chooseSeparateDelivery(
              body.deliveryPlanId,
              asBuyer,
            );
            const details =
              await getMarketplaceOrderQueries().getDetails(orderId);
            grantDeliveryPlan(notificationGrants, {
              uids:
                details?.deliveryPlanCandidates.map((candidate) =>
                  String(candidate.provider_id),
                ) ?? [],
              orderId,
              planId: body.deliveryPlanId,
              status: "separate",
            });
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...plan },
                notificationGrants.toArray(),
              ),
            );
          }
          case "admin_create_unified_delivery_shipment": {
            if (!body.deliveryPlanId)
              throw new Error("deliveryPlanId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ sellerOrderId: body.deliveryPlanId }),
                result: await service.createUnifiedDeliveryShipment(
                  body.deliveryPlanId,
                  adminCapable,
                ),
              }),
            );
          }
          case "buyer_accept_shipping_quote": {
            if (!body.shippingQuoteId)
              throw new Error("shippingQuoteId is required");
            const quote = await service.acceptShippingQuote(
              body.shippingQuoteId,
              asBuyer,
            );
            grantShippingQuote(notificationGrants, {
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
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...quote },
                notificationGrants.toArray(),
              ),
            );
          }
          case "buyer_reject_shipping_quote": {
            if (!body.shippingQuoteId)
              throw new Error("shippingQuoteId is required");
            const quote = await service.rejectShippingQuote(
              body.shippingQuoteId,
              asBuyer,
            );
            grantShippingQuote(notificationGrants, {
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
            return apiSuccess(
              notificationsServer.attachGrants(
                { ...quote },
                notificationGrants.toArray(),
              ),
            );
          }
          case "buyer_accept_custom_price":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ customItemId: body.customItemId }),
                result: await service.buyerAcceptCustomRequestPrice(
                  body.customItemId,
                  asBuyer,
                ),
              }),
            );
          case "buyer_reject_custom_price":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ customItemId: body.customItemId }),
                result: await service.buyerRejectCustomRequestPrice(
                  body.customItemId,
                  asBuyer,
                ),
              }),
            );
          case "seller_prepare_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.sellerMarkItemPreparing(body.itemId, asSeller),
              }),
            );
          case "seller_ready_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.sellerMarkItemReadyForShipping(
                  body.itemId,
                  asSeller,
                ),
              }),
            );
          case "admin_create_seller_shipment":
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ sellerOrderId: body.sellerOrderId }),
                result: await service.createSellerOrderShipment(
                  orderId,
                  { sellerOrderId: body.sellerOrderId },
                  adminCapable,
                ),
              }),
            );
          case "buyer_cancel_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.cancelOrderItem(
                  body.itemId,
                  body.reason || "buyer_cancelled",
                  asBuyer,
                ),
              }),
            );
          case "buyer_cancel_custom_request":
            if (!body.customItemId) throw new Error("customItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ customItemId: body.customItemId }),
                result: await service.cancelCustomRequestItem(
                  body.customItemId,
                  body.reason || "buyer_cancelled",
                  asBuyer,
                ),
              }),
            );
          case "buyer_cancel_seller_order":
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ sellerOrderId: body.sellerOrderId }),
                result: await service.cancelSellerOrder(
                  body.sellerOrderId,
                  body.reason || "buyer_cancelled",
                  asBuyer,
                ),
              }),
            );
          case "buyer_cancel_order":
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload(),
                result: await service.cancelFullOrder(
                  orderId,
                  body.reason || "buyer_cancelled",
                  asBuyer,
                ),
              }),
            );
          case "buyer_reject_delivery_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.buyerRejectDeliveryItem(
                  body.itemId,
                  body.reason || "buyer_rejected_delivery",
                  asBuyer,
                ),
              }),
            );
          case "buyer_reject_delivery_seller_order":
            if (!body.sellerOrderId)
              throw new Error("sellerOrderId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ sellerOrderId: body.sellerOrderId }),
                result: await service.buyerRejectSellerDelivery(
                  body.sellerOrderId,
                  body.reason || "buyer_rejected_delivery",
                  asBuyer,
                ),
              }),
            );
          case "buyer_reject_delivery_order":
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload(),
                result: await service.buyerRejectOrderDelivery(
                  orderId,
                  body.reason || "buyer_rejected_delivery",
                  asBuyer,
                ),
              }),
            );
          case "buyer_request_return_item":
            if (!body.itemId) throw new Error("itemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ itemId: body.itemId }),
                result: await service.createReturnRequest(
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
              }),
            );
          case "seller_approve_return":
            if (!body.returnRequestId)
              throw new Error("returnRequestId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ returnRequestId: body.returnRequestId }),
                result: await service.approveReturnRequest(
                  body.returnRequestId,
                  asSeller,
                ),
              }),
            );
          case "seller_reject_return":
            if (!body.returnRequestId)
              throw new Error("returnRequestId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ returnRequestId: body.returnRequestId }),
                result: await service.rejectReturnRequest(
                  body.returnRequestId,
                  asSeller,
                  body.reason,
                ),
              }),
            );
          case "carrier_in_transit":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ shipmentId: body.shipmentId }),
                result: await service.markShipmentInTransit(body.shipmentId, asCarrier),
              }),
            );
          case "carrier_receive_shipment":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ shipmentId: body.shipmentId }),
                result: await service.setShipmentItemsStatus(
                  body.shipmentId,
                  "received_by_carrier",
                  asCarrier,
                ),
              }),
            );
          case "carrier_reject_shipment":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ shipmentId: body.shipmentId }),
                result: await service.setShipmentItemsStatus(
                  body.shipmentId,
                  "rejected_by_carrier",
                  asCarrier,
                ),
              }),
            );
          case "carrier_out_for_delivery":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ shipmentId: body.shipmentId }),
                result: await service.markShipmentOutForDelivery(
                  body.shipmentId,
                  asCarrier,
                ),
              }),
            );
          case "carrier_delivered":
            if (!body.shipmentId) throw new Error("shipmentId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ shipmentId: body.shipmentId }),
                result: await service.markShipmentFullyDelivered(
                  body.shipmentId,
                  asCarrier,
                ),
              }),
            );
          case "carrier_deliver_shipment_item":
            if (!body.shipmentItemId)
              throw new Error("shipmentItemId is required");
            return apiSuccess(
              await finalizeOrderActionResponse({
                ...notifyPayload({ shipmentItemId: body.shipmentItemId }),
                result: await service.markShipmentItemDelivered(
                  body.shipmentItemId,
                  asCarrier,
                ),
              }),
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
