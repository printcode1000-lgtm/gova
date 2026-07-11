import { apiSuccess } from "@/core/api/api-response";
import { getMarketplaceOrderService } from "@/modules/marketplace-orders/api/server";
import { runTracedBusinessRoute } from "../../../auth/traced-route";
import { actorFromInput, mapOrderError } from "../../order-api-helpers";

interface ActionInput {
  uid: string;
  phone?: string;
  action: string;
  itemId?: string;
  sellerOrderId?: string;
  shipmentId?: string;
  reason?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  return runTracedBusinessRoute("POST /api/orders/:orderId/actions", async () => {
    try {
      const { orderId } = await params;
      const body = (await request.json()) as ActionInput;
      const service = getMarketplaceOrderService();
      const adminCapable = actorFromInput({ uid: body.uid, phone: body.phone }, "buyer");
      const asBuyer = adminCapable.role === "admin" ? adminCapable : actorFromInput(body, "buyer");
      const asSeller = adminCapable.role === "admin" ? adminCapable : actorFromInput(body, "seller");
      const asCarrier = adminCapable.role === "admin" ? adminCapable : actorFromInput(body, "carrier");

      switch (body.action) {
        case "seller_accept_item":
          if (!body.itemId) throw new Error("itemId is required");
          return apiSuccess(await service.sellerAcceptItem(body.itemId, asSeller));
        case "seller_reject_item":
          if (!body.itemId) throw new Error("itemId is required");
          return apiSuccess(await service.sellerRejectItem(body.itemId, asSeller, body.reason));
        case "seller_prepare_item":
          if (!body.itemId) throw new Error("itemId is required");
          return apiSuccess(await service.sellerMarkItemPreparing(body.itemId, asSeller));
        case "seller_ready_item":
          if (!body.itemId) throw new Error("itemId is required");
          return apiSuccess(await service.sellerMarkItemReadyForShipping(body.itemId, asSeller));
        case "admin_create_seller_shipment":
          if (!body.sellerOrderId) throw new Error("sellerOrderId is required");
          return apiSuccess(
            await service.createSellerOrderShipment(
              orderId,
              { sellerOrderId: body.sellerOrderId },
              adminCapable,
            ),
          );
        case "buyer_cancel_item":
          if (!body.itemId) throw new Error("itemId is required");
          return apiSuccess(await service.cancelOrderItem(body.itemId, body.reason || "buyer_cancelled", asBuyer));
        case "buyer_cancel_seller_order":
          if (!body.sellerOrderId) throw new Error("sellerOrderId is required");
          return apiSuccess(await service.cancelSellerOrder(body.sellerOrderId, body.reason || "buyer_cancelled", asBuyer));
        case "buyer_cancel_order":
          return apiSuccess(await service.cancelFullOrder(orderId, body.reason || "buyer_cancelled", asBuyer));
        case "buyer_reject_delivery_item":
          if (!body.itemId) throw new Error("itemId is required");
          return apiSuccess(await service.buyerRejectDeliveryItem(body.itemId, body.reason || "buyer_rejected_delivery", asBuyer));
        case "buyer_reject_delivery_seller_order":
          if (!body.sellerOrderId) throw new Error("sellerOrderId is required");
          return apiSuccess(await service.buyerRejectSellerDelivery(body.sellerOrderId, body.reason || "buyer_rejected_delivery", asBuyer));
        case "buyer_reject_delivery_order":
          return apiSuccess(await service.buyerRejectOrderDelivery(orderId, body.reason || "buyer_rejected_delivery", asBuyer));
        case "carrier_in_transit":
          if (!body.shipmentId) throw new Error("shipmentId is required");
          return apiSuccess(await service.markShipmentInTransit(body.shipmentId, asCarrier));
        case "carrier_receive_shipment":
          if (!body.shipmentId) throw new Error("shipmentId is required");
          return apiSuccess(await service.setShipmentItemsStatus(body.shipmentId, "received_by_carrier", asCarrier));
        case "carrier_reject_shipment":
          if (!body.shipmentId) throw new Error("shipmentId is required");
          return apiSuccess(await service.setShipmentItemsStatus(body.shipmentId, "rejected_by_carrier", asCarrier));
        case "carrier_out_for_delivery":
          if (!body.shipmentId) throw new Error("shipmentId is required");
          return apiSuccess(await service.markShipmentOutForDelivery(body.shipmentId, asCarrier));
        case "carrier_delivered":
          if (!body.shipmentId) throw new Error("shipmentId is required");
          return apiSuccess(await service.markShipmentFullyDelivered(body.shipmentId, asCarrier));
        default:
          throw new Error("Unknown order action");
      }
    } catch (error) {
      return mapOrderError(error);
    }
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
