import { randomUUID } from "node:crypto";
import type { MarketplaceDb } from "../../ports/marketplace-order-store";
import type { Actor, ItemRef, OrderAggregate } from "@asol/orders-core";
import type { OrderType, PaymentMethod } from "@asol/orders-core";
import { writeAuditLog } from "../write-audit-log.command";
import {
  calculateOrderStatus,
  calculateSellerOrderStatus,
  calculateShipmentStatus,
} from "@asol/orders-core";
import {
  calculateItemPricing,
  calculateOrderPricing,
  calculateShipmentPricing,
} from "@asol/orders-core";
import {
  NON_SHIPPABLE,
  RETURN_ELIGIBLE,
  validateImageAttachment,
  validateItemRef,
  validateMoneyAndCurrency,
  validatePriceOfferExpiry,
  validateRefund,
} from "@asol/orders-core";
import { MarketplaceOrderPart1 } from "./marketplace-order-service.part-01";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;

export abstract class MarketplaceOrderPart2 extends MarketplaceOrderPart1 {
  async ensureSellerOrder(
    orderId: string,
    sellerId: string,
    type: string,
    actor: Actor,
    serviceProviderId?: string,
  ) {
    await this.requireBuyerOrder(orderId, actor);
    let row = await this.one(
      "SELECT * FROM seller_orders WHERE order_id=? AND seller_id=? AND COALESCE(service_provider_id,'')=COALESCE(?, '')",
      [orderId, sellerId, serviceProviderId ?? null],
    );
    if (row) {
      if (row.seller_order_type !== type && row.seller_order_type !== "mixed") {
        await this.db.execute(
          "UPDATE seller_orders SET seller_order_type='mixed',updated_at=? WHERE id=?",
          [now(), row.id],
        );
        await this.audit(
          orderId,
          "seller_order",
          row.id,
          "updated",
          actor,
          row.status,
          row.status,
          { sellerOrderType: "mixed" },
        );
        row = await this.one("SELECT * FROM seller_orders WHERE id=?", [
          row.id,
        ]);
      }
      return row;
    }
    const sid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO seller_orders (id,order_id,seller_id,service_provider_id,seller_order_type,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      [sid, orderId, sellerId, serviceProviderId ?? null, type, ts, ts],
    );
    await this.audit(orderId, "seller_order", sid, "created", actor);
    return this.one("SELECT * FROM seller_orders WHERE id=?", [sid]);
  }

  async addOrderItem(orderId: string, input: any, actor: Actor) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    if (order.order_type === "custom_request_order")
      throw new Error("Cannot add product item to custom-only order");
    const so = await this.ensureSellerOrder(
      orderId,
      input.sellerId,
      "product_items",
      actor,
      input.serviceProviderId,
    );
    const p = calculateItemPricing({
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      itemDiscount: input.itemDiscount,
      couponDiscount: input.couponDiscount,
      shipping: input.shipping,
      shippingDiscount: input.shippingDiscount,
      tax: input.tax,
      serviceFee: input.serviceFee,
      commission: input.commission,
    });
    const iid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO order_items (id,order_id,seller_order_id,seller_id,product_id,variant_id,product_name_snapshot,product_description_snapshot,product_image_snapshot,quantity,requires_special_vehicle,required_vehicle_type,weight,dimensions_json,fragile,requires_refrigeration,requires_special_loading,shipping_notes,unit_price,subtotal_price,item_discount_amount,coupon_discount_amount,shipping_price,shipping_discount_amount,tax_amount,service_fee_amount,commission_amount,total_price,remaining_amount,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        iid,
        orderId,
        so.id,
        input.sellerId,
        input.productId,
        input.variantId ?? null,
        input.productName,
        input.productDescription ?? "",
        input.productImage ?? null,
        input.quantity,
        !!input.requiresSpecialVehicle,
        input.requiredVehicleType ?? null,
        input.weight ?? null,
        input.dimensions ? JSON.stringify(input.dimensions) : null,
        !!input.fragile,
        !!input.requiresRefrigeration,
        !!input.requiresSpecialLoading,
        input.shippingNotes ?? null,
        input.unitPrice,
        p.subtotal,
        input.itemDiscount ?? 0,
        input.couponDiscount ?? 0,
        input.shipping ?? 0,
        input.shippingDiscount ?? 0,
        input.tax ?? 0,
        input.serviceFee ?? 0,
        input.commission ?? 0,
        p.total,
        p.remaining,
        ts,
        ts,
      ],
    );
    await this.audit(orderId, "order_item", iid, "created", actor, null, "new");
    await this.recalculateAll(orderId);
    return this.one("SELECT * FROM order_items WHERE id=?", [iid]);
  }

  async addCustomRequestItem(orderId: string, input: any, actor: Actor) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    if (order.order_type === "product_order")
      throw new Error("Cannot add custom item to product-only order");
    if (!String(input.buyerDescription ?? "").trim())
      throw new Error("Buyer description is required");
    const sellerId = input.sellerId ?? input.serviceProviderId;
    if (!sellerId) throw new Error("sellerId or serviceProviderId is required");
    const so = await this.ensureSellerOrder(
      orderId,
      sellerId,
      "custom_request",
      actor,
      input.serviceProviderId,
    );
    const iid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO custom_request_items (id,order_id,seller_order_id,seller_id,service_provider_id,title,buyer_description,buyer_notes,requested_quantity,request_type,requires_special_vehicle,required_vehicle_type,estimated_weight,estimated_dimensions_json,fragile,requires_refrigeration,requires_special_loading,shipping_notes,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        iid,
        orderId,
        so.id,
        input.sellerId ?? null,
        input.serviceProviderId ?? null,
        input.title,
        input.buyerDescription,
        input.buyerNotes ?? null,
        input.requestedQuantity ?? null,
        input.requestType,
        !!input.requiresSpecialVehicle,
        input.requiredVehicleType ?? null,
        input.estimatedWeight ?? null,
        input.estimatedDimensions
          ? JSON.stringify(input.estimatedDimensions)
          : null,
        !!input.fragile,
        !!input.requiresRefrigeration,
        !!input.requiresSpecialLoading,
        input.shippingNotes ?? null,
        "waiting_for_seller_response",
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "custom_request_item",
      iid,
      "created",
      actor,
      null,
      "waiting_for_seller_response",
    );
    await this.recalculateAll(orderId);
    return this.one("SELECT * FROM custom_request_items WHERE id=?", [iid]);
  }

  async addCustomRequestImage(itemId: string, input: any, actor: Actor) {
    validateImageAttachment(input);
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Custom request not found");
    const order = await this.one("SELECT buyer_id FROM orders WHERE id=?", [
      item.order_id,
    ]);
    if (
      actor.role !== "admin" &&
      actor.id !== order.buyer_id &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id
    )
      throw new Error("Forbidden");
    const imageId = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO custom_request_images (id,custom_request_item_id,order_id,uploaded_by,storage_profile_id,image_url,image_key,file_name,file_size,mime_type,width,height,image_description,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        imageId,
        itemId,
        item.order_id,
        actor.id,
        input.storageProfileId,
        input.imageUrl,
        input.imageKey,
        input.fileName ?? null,
        input.fileSize,
        input.mimeType,
        input.width ?? null,
        input.height ?? null,
        input.imageDescription ?? null,
        input.sortOrder ?? 0,
        ts,
        ts,
      ],
    );
    await this.audit(
      item.order_id,
      "custom_request_image",
      imageId,
      "image_uploaded",
      actor,
      null,
      null,
      { storageProfileId: input.storageProfileId, imageKey: input.imageKey },
    );
    return this.one("SELECT * FROM custom_request_images WHERE id=?", [
      imageId,
    ]);
  }
}
