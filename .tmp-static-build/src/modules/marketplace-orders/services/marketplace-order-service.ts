import { randomUUID } from "node:crypto";
import type { MarketplaceDb } from "../db/client";
import type { Actor, ItemRef, OrderAggregate } from "../domain/types";
import type { OrderType, PaymentMethod } from "../domain/enums";
import { writeAuditLog } from "../audit/audit-service";
import {
  calculateOrderStatus,
  calculateSellerOrderStatus,
  calculateShipmentStatus,
} from "../calculators/status-calculators";
import {
  calculateItemPricing,
  calculateOrderPricing,
  calculateShipmentPricing,
} from "../calculators/pricing-calculator";
import {
  NON_SHIPPABLE,
  RETURN_ELIGIBLE,
  validateImageAttachment,
  validateItemRef,
  validateMoneyAndCurrency,
  validatePriceOfferExpiry,
  validateRefund,
} from "../validators";
const now = () => new Date().toISOString(),
  id = () => randomUUID();
type Row = Record<string, any>;
export class MarketplaceOrderService {
  constructor(private db: MarketplaceDb) {}
  private async one(sql: string, args: unknown[] = []): Promise<Row> {
    return (await this.db.execute(sql, args))[0] as Row;
  }
  private async audit(
    orderId: string,
    entityType: string,
    entityId: string,
    action: any,
    actor: Actor,
    oldStatus?: string | null,
    newStatus?: string | null,
    newValue?: unknown,
    reason?: string,
  ) {
    await writeAuditLog(this.db, {
      orderId,
      entityType,
      entityId,
      action,
      actor,
      oldStatus,
      newStatus,
      newValue,
      reason,
    });
  }
  private async requireBuyerOrder(orderId: string, actor: Actor) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    if (
      actor.role !== "admin" &&
      (actor.role !== "buyer" || actor.id !== order.buyer_id)
    )
      throw new Error("Forbidden");
    return order;
  }
  private requireAdmin(actor: Actor) {
    if (actor.role !== "admin" && actor.role !== "system")
      throw new Error("Admin only");
  }
  private requireCarrier(actor: Actor) {
    if (actor.role !== "carrier" && actor.role !== "admin")
      throw new Error("Carrier only");
  }
  private async requireAfterSaleSeller(
    kind: "return" | "replacement",
    requestId: string,
    actor: Actor,
  ) {
    if (actor.role === "admin") return;
    if (!["seller", "service_provider"].includes(actor.role))
      throw new Error("Forbidden");
    const prefix = kind === "return" ? "return" : "replacement",
      request = await this.one(
        `SELECT seller_order_id FROM ${prefix}_requests WHERE id=?`,
        [requestId],
      );
    if (!request) throw new Error("Request not found");
    if (request.seller_order_id) {
      const so = await this.one(
        "SELECT seller_id,service_provider_id FROM seller_orders WHERE id=?",
        [request.seller_order_id],
      );
      if (
        so &&
        (so.seller_id === actor.id || so.service_provider_id === actor.id)
      )
        return;
    } else {
      const old = kind === "replacement" ? "old_" : "",
        match = await this.one(
          `SELECT 1 ok FROM ${prefix}_request_items ri LEFT JOIN order_items oi ON oi.id=ri.${old}order_item_id LEFT JOIN custom_request_items ci ON ci.id=ri.${old}custom_request_item_id WHERE ri.${prefix}_request_id=? AND (oi.seller_id=? OR ci.seller_id=? OR ci.service_provider_id=?) LIMIT 1`,
          [requestId, actor.id, actor.id, actor.id],
        );
      if (match) return;
    }
    throw new Error("Forbidden");
  }
  private async validateDisputeReferences(orderId: string, refs: Row) {
    for (const [table, key] of [
      ["seller_orders", "seller_order_id"],
      ["order_items", "order_item_id"],
      ["custom_request_items", "custom_request_item_id"],
      ["shipments", "shipment_id"],
      ["return_requests", "return_request_id"],
    ] as const)
      if (refs[key]) {
        const row = await this.one(`SELECT order_id FROM ${table} WHERE id=?`, [
          refs[key],
        ]);
        if (!row || row.order_id !== orderId)
          throw new Error("Invalid dispute reference");
      }
  }
  private async requireDisputeAccess(orderId: string, refs: Row, actor: Actor) {
    if (actor.role === "admin") return;
    const order = await this.one("SELECT buyer_id FROM orders WHERE id=?", [
      orderId,
    ]);
    if (!order) throw new Error("Order not found");
    if (actor.role === "buyer" && actor.id === order.buyer_id) return;
    if (refs.seller_order_id) {
      const so = await this.one(
        "SELECT order_id,seller_id,service_provider_id FROM seller_orders WHERE id=?",
        [refs.seller_order_id],
      );
      if (!so || so.order_id !== orderId)
        throw new Error("Invalid dispute reference");
      if (
        ["seller", "service_provider"].includes(actor.role) &&
        (so.seller_id === actor.id || so.service_provider_id === actor.id)
      )
        return;
    }
    for (const [table, key] of [
      ["order_items", "order_item_id"],
      ["custom_request_items", "custom_request_item_id"],
    ] as const) {
      if (refs[key]) {
        const providerColumn =
            table === "order_items"
              ? "NULL service_provider_id"
              : "service_provider_id",
          item = await this.one(
            `SELECT order_id,seller_id,${providerColumn} FROM ${table} WHERE id=?`,
            [refs[key]],
          );
        if (!item || item.order_id !== orderId)
          throw new Error("Invalid dispute reference");
        if (
          ["seller", "service_provider"].includes(actor.role) &&
          (item.seller_id === actor.id || item.service_provider_id === actor.id)
        )
          return;
      }
    }
    if (refs.shipment_id) {
      const shipment = await this.one(
        "SELECT order_id,carrier_id FROM shipments WHERE id=?",
        [refs.shipment_id],
      );
      if (!shipment || shipment.order_id !== orderId)
        throw new Error("Invalid dispute reference");
      if (actor.role === "carrier" && shipment.carrier_id === actor.id) return;
    }
    if (refs.return_request_id) {
      const request = await this.one(
        "SELECT order_id,buyer_id FROM return_requests WHERE id=?",
        [refs.return_request_id],
      );
      if (!request || request.order_id !== orderId)
        throw new Error("Invalid dispute reference");
      if (actor.role === "buyer" && request.buyer_id === actor.id) return;
    }
    throw new Error("Forbidden");
  }
  async createProductOrder(input: any, actor: Actor) {
    return this.createOrder("product_order", input, actor);
  }
  async createCustomRequestOrder(input: any, actor: Actor) {
    return this.createOrder("custom_request_order", input, actor);
  }
  async createMixedOrder(input: any, actor: Actor) {
    return this.createOrder("mixed_order", input, actor);
  }
  private async createOrder(type: OrderType, input: any, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Forbidden");
    const buyerId = input.buyerId ?? actor.id;
    if (actor.role === "buyer" && buyerId !== actor.id)
      throw new Error("Forbidden");
    const oid = id(),
      ts = now(),
      currency = String(input.currency ?? "").toUpperCase();
    validateMoneyAndCurrency(0, currency);
    validateMoneyAndCurrency(input.orderDiscount ?? 0, currency);
    await this.db.execute(
      "INSERT INTO orders (id,order_number,buyer_id,order_type,delivery_address_snapshot_json,currency,notes,source,order_discount_total,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      [
        oid,
        input.orderNumber ?? `ASOL-${Date.now()}-${oid.slice(0, 6)}`,
        buyerId,
        type,
        JSON.stringify(input.deliveryAddress ?? {}),
        currency,
        input.notes ?? null,
        input.source ?? actor.source ?? null,
        input.orderDiscount ?? 0,
        ts,
        ts,
      ],
    );
    await this.audit(oid, "order", oid, "created", actor, null, "new");
    return this.one("SELECT * FROM orders WHERE id=?", [oid]);
  }
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
  private async setItemStatus(
    table: "order_items" | "custom_request_items",
    itemId: string,
    status: string,
    actor: Actor,
    action: any = "status_changed",
    reason?: string,
  ) {
    const item = await this.one(`SELECT * FROM ${table} WHERE id=?`, [itemId]);
    if (!item) throw new Error("Item not found");
    if (
      actor.role !== "admin" &&
      actor.role !== "system" &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id &&
      actor.id !==
        (
          await this.one("SELECT buyer_id FROM orders WHERE id=?", [
            item.order_id,
          ])
        )?.buyer_id
    )
      throw new Error("Forbidden");
    await this.db.execute(
      `UPDATE ${table} SET status=?,updated_at=? WHERE id=?`,
      [status, now(), itemId],
    );
    await this.audit(
      item.order_id,
      table === "order_items" ? "order_item" : "custom_request_item",
      itemId,
      action,
      actor,
      item.status,
      status,
      undefined,
      reason,
    );
    await this.recalculateAll(item.order_id);
    return this.one(`SELECT * FROM ${table} WHERE id=?`, [itemId]);
  }
  private sellerActor(actor: Actor) {
    if (!["seller", "service_provider", "admin"].includes(actor.role))
      throw new Error("Seller/service provider only");
  }
  private productSellerActor(actor: Actor) {
    if (actor.role !== "seller" && actor.role !== "admin")
      throw new Error("Seller only");
  }
  sellerAcceptItem = (itemId: string, actor: Actor) => (
    this.productSellerActor(actor),
    this.setItemStatus(
      "order_items",
      itemId,
      "seller_accepted",
      actor,
      "accepted",
    )
  );
  sellerRejectItem = (itemId: string, actor: Actor, reason?: string) => (
    this.productSellerActor(actor),
    this.setItemStatus(
      "order_items",
      itemId,
      "seller_rejected",
      actor,
      "rejected",
      reason,
    )
  );
  async sellerMarkItemPreparing(itemId: string, actor: Actor) {
    this.productSellerActor(actor);
    const item = await this.one(
      "SELECT seller_order_id FROM order_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    await this.requireAcceptedShippingQuote(item.seller_order_id);
    return this.setItemStatus(
      "order_items",
      itemId,
      "preparing",
      actor,
      "status_changed",
    );
  }
  async sellerMarkItemReadyForShipping(itemId: string, actor: Actor) {
    this.productSellerActor(actor);
    const item = await this.one(
      "SELECT seller_order_id FROM order_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    await this.requireAcceptedShippingQuote(item.seller_order_id);
    return this.setItemStatus(
      "order_items",
      itemId,
      "ready_for_shipping",
      actor,
      "status_changed",
    );
  }
  async sellerAcceptCustomRequest(itemId: string, actor: Actor) {
    this.sellerActor(actor);
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    if (
      actor.role !== "admin" &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id
    )
      throw new Error("Forbidden");
    await this.db.execute(
      "UPDATE custom_request_items SET seller_accepted=1,updated_at=? WHERE id=?",
      [now(), itemId],
    );
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "waiting_for_pricing",
      actor,
      "accepted",
    );
  }
  async sellerRejectCustomRequest(
    itemId: string,
    actor: Actor,
    reason?: string,
  ) {
    this.sellerActor(actor);
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    if (
      actor.role !== "admin" &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id
    )
      throw new Error("Forbidden");
    await this.db.execute(
      "UPDATE custom_request_items SET seller_accepted=0,seller_notes=?,updated_at=? WHERE id=?",
      [reason ?? null, now(), itemId],
    );
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "seller_rejected",
      actor,
      "rejected",
      reason,
    );
  }
  async sellerSendPriceOfferForCustomRequest(
    itemId: string,
    input: any,
    actor: Actor,
  ) {
    this.sellerActor(actor);
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    if (
      actor.role !== "admin" &&
      actor.id !== item.seller_id &&
      actor.id !== item.service_provider_id
    )
      throw new Error("Forbidden");
    const p = calculateItemPricing({
      unitPrice: input.unitPrice,
      quantity: input.quantity,
      itemDiscount: input.discount,
      shipping: input.shipping,
      shippingDiscount: input.shippingDiscount,
      specialVehicleFee: input.specialVehicleFee,
      handlingFee: input.handlingFee,
      tax: input.tax,
      serviceFee: input.serviceFee,
      commission: input.commission,
    });
    await this.db.execute(
      "UPDATE custom_request_items SET final_unit_price=?,quantity=?,subtotal_price=?,discount_amount=?,shipping_price=?,shipping_discount_amount=?,special_vehicle_fee=?,handling_fee=?,tax_amount=?,service_fee_amount=?,commission_amount=?,total_price=?,remaining_amount=?,price_offer_expires_at=?,seller_provided_description=?,status='price_offer_sent',updated_at=? WHERE id=?",
      [
        input.unitPrice,
        input.quantity,
        p.subtotal,
        input.discount ?? 0,
        input.shipping ?? 0,
        input.shippingDiscount ?? 0,
        input.specialVehicleFee ?? 0,
        input.handlingFee ?? 0,
        input.tax ?? 0,
        input.serviceFee ?? 0,
        input.commission ?? 0,
        p.total,
        p.remaining,
        input.expiresAt ?? null,
        input.description ?? null,
        now(),
        itemId,
      ],
    );
    await this.audit(
      item.order_id,
      "custom_request_item",
      itemId,
      "price_changed",
      actor,
      item.status,
      "price_offer_sent",
      { total: p.total },
    );
    await this.recalculateAll(item.order_id);
    return this.one("SELECT * FROM custom_request_items WHERE id=?", [itemId]);
  }
  async buyerAcceptCustomRequestPrice(itemId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    validatePriceOfferExpiry(item?.price_offer_expires_at ?? null);
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "buyer_accepted_price",
      actor,
      "accepted",
    );
  }
  buyerRejectCustomRequestPrice = (itemId: string, actor: Actor) => {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      "buyer_rejected_price",
      actor,
      "rejected",
    );
  };
  async cancelOrderItem(itemId: string, reason: string, actor: Actor) {
    const item = await this.one("SELECT * FROM order_items WHERE id=?", [
      itemId,
    ]);
    if (!item) throw new Error("Item not found");
    if (["delivered", "closed"].includes(item.status))
      throw new Error("Delivered/closed items require a return flow");
    await this.createCancellation(
      item.order_id,
      { orderItemId: itemId, affectedAmount: item.total_price, reason },
      actor,
    );
    const result = await this.setItemStatus(
      "order_items",
      itemId,
      actor.role === "admin" ? "admin_cancelled" : "buyer_cancelled",
      actor,
      "cancelled",
      reason,
    );
    await this.reconcileShippingQuoteAfterItemCancellation(
      item.seller_order_id,
      actor,
    );
    await this.reconcileDeliveryPlanAfterItemCancellation(
      item.order_id,
      item.seller_order_id,
      actor,
    );
    return result;
  }
  async cancelCustomRequestItem(itemId: string, reason: string, actor: Actor) {
    const item = await this.one(
      "SELECT * FROM custom_request_items WHERE id=?",
      [itemId],
    );
    if (!item) throw new Error("Item not found");
    if (["delivered", "closed"].includes(item.status))
      throw new Error("Delivered/closed items require a return flow");
    await this.createCancellation(
      item.order_id,
      { customRequestItemId: itemId, affectedAmount: item.total_price, reason },
      actor,
    );
    return this.setItemStatus(
      "custom_request_items",
      itemId,
      actor.role === "admin" ? "admin_cancelled" : "buyer_cancelled",
      actor,
      "cancelled",
      reason,
    );
  }
  private async createCancellation(orderId: string, input: any, actor: Actor) {
    const order = await this.requireBuyerOrder(orderId, actor),
      cid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO cancellations (id,order_id,seller_order_id,order_item_id,custom_request_item_id,cancelled_by,cancelled_by_role,reason,affected_amount,currency,requires_refund,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        cid,
        orderId,
        input.sellerOrderId ?? null,
        input.orderItemId ?? null,
        input.customRequestItemId ?? null,
        actor.id,
        actor.role,
        input.reason,
        input.affectedAmount ?? 0,
        order.currency,
        (input.affectedAmount ?? 0) > 0,
        "executed",
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "cancellation",
      cid,
      "cancelled",
      actor,
      null,
      "executed",
      undefined,
      input.reason,
    );
    return cid;
  }
  async cancelFullOrder(orderId: string, reason: string, actor: Actor) {
    await this.requireBuyerOrder(orderId, actor);
    const items = await this.db.execute(
      "SELECT id FROM order_items WHERE order_id=? AND status NOT IN ('delivered','closed')",
      [orderId],
    );
    for (const x of items)
      await this.cancelOrderItem(String(x.id), reason, actor);
    const custom = await this.db.execute(
      "SELECT id FROM custom_request_items WHERE order_id=? AND status NOT IN ('delivered','closed')",
      [orderId],
    );
    for (const x of custom)
      await this.cancelCustomRequestItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }
  async cancelSellerOrder(sellerOrderId: string, reason: string, actor: Actor) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    await this.requireBuyerOrder(so.order_id, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM order_items WHERE seller_order_id=?",
      [sellerOrderId],
    ))
      await this.cancelOrderItem(String(x.id), reason, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM custom_request_items WHERE seller_order_id=?",
      [sellerOrderId],
    ))
      await this.cancelCustomRequestItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM seller_orders WHERE id=?", [sellerOrderId]);
  }
  async buyerRejectDeliveryItem(itemId: string, reason: string, actor: Actor) {
    const item = await this.one("SELECT * FROM order_items WHERE id=?", [
      itemId,
    ]);
    if (!item) throw new Error("Item not found");
    await this.requireBuyerOrder(item.order_id, actor);
    if (!["assigned_to_shipment", "in_transit"].includes(item.status))
      throw new Error(
        "Delivery can be rejected only while the item is with delivery",
      );
    const ts = now();
    await this.db.execute(
      "UPDATE shipment_items SET status='delivery_rejected',updated_at=? WHERE order_item_id=? AND status NOT IN ('delivered','closed')",
      [ts, itemId],
    );
    return this.setItemStatus(
      "order_items",
      itemId,
      "delivery_rejected",
      actor,
      "delivery_rejected",
      reason,
    );
  }
  async buyerRejectSellerDelivery(
    sellerOrderId: string,
    reason: string,
    actor: Actor,
  ) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    await this.requireBuyerOrder(so.order_id, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM order_items WHERE seller_order_id=? AND status IN ('assigned_to_shipment','in_transit')",
      [sellerOrderId],
    ))
      await this.buyerRejectDeliveryItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM seller_orders WHERE id=?", [sellerOrderId]);
  }
  async buyerRejectOrderDelivery(
    orderId: string,
    reason: string,
    actor: Actor,
  ) {
    await this.requireBuyerOrder(orderId, actor);
    for (const x of await this.db.execute(
      "SELECT id FROM order_items WHERE order_id=? AND status IN ('assigned_to_shipment','in_transit')",
      [orderId],
    ))
      await this.buyerRejectDeliveryItem(String(x.id), reason, actor);
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }
  async createUnifiedDeliveryPlan(orderId: string, input: any, actor: Actor) {
    const order = await this.requireBuyerOrder(orderId, actor);
    const existing = await this.one(
      "SELECT id FROM delivery_plans WHERE order_id=?",
      [orderId],
    );
    if (existing) throw new Error("Delivery plan already exists");
    const stops = Array.isArray(input.stops) ? input.stops : [],
      candidates = Array.isArray(input.candidates) ? input.candidates : [];
    if (stops.length < 2)
      throw new Error("Unified delivery requires at least two sellers");
    if (candidates.length < 1)
      throw new Error("Unified delivery requires a qualified provider");
    const sellerOrders = await this.db.execute(
      "SELECT * FROM seller_orders WHERE order_id=?",
      [orderId],
    );
    const byId = new Map(sellerOrders.map((row) => [String(row.id), row]));
    const seenStops = new Set<string>(),
      planId = id(),
      ts = now();
    let fallback = 0,
      special = false,
      pending = false;
    for (const stop of stops) {
      const sellerOrderId = String(stop.sellerOrderId ?? ""),
        sellerOrder = byId.get(sellerOrderId);
      if (
        !sellerOrder ||
        seenStops.has(sellerOrderId) ||
        String(sellerOrder.seller_id) !== String(stop.sellerId)
      )
        throw new Error("Invalid delivery plan stop");
      seenStops.add(sellerOrderId);
      const value = Number(stop.fallbackShippingPrice),
        vehicle = Number(stop.fallbackSpecialVehicleFee ?? 0);
      if (
        !Number.isSafeInteger(value) ||
        value < 0 ||
        !Number.isSafeInteger(vehicle) ||
        vehicle < 0
      )
        throw new Error("invalid delivery plan money");
      fallback += value;
      if (!Number.isSafeInteger(fallback))
        throw new Error("invalid delivery plan money");
      special = special || stop.requiresSpecialVehicle === true;
      pending = pending || stop.requiresLocationQuote === true;
    }
    const fallbackAvailable = stops.every((stop: any) =>
      Boolean(stop.originalCarrierId),
    );
    await this.db.execute(
      "INSERT INTO delivery_plans (id,order_id,buyer_id,strategy,status,fallback_confirmed_price,fallback_has_pending_quotes,fallback_available,special_vehicle_required,seller_count,currency,created_at,updated_at) VALUES (?,?,?,'unified','collecting_quotes',?,?,?,?,?,?,?,?)",
      [
        planId,
        orderId,
        order.buyer_id,
        fallback,
        pending ? 1 : 0,
        fallbackAvailable ? 1 : 0,
        special ? 1 : 0,
        stops.length,
        order.currency,
        ts,
        ts,
      ],
    );
    const stopIdsBySeller = new Map<string, string>();
    for (const [index, stop] of stops.entries()) {
      const stopId = id();
      stopIdsBySeller.set(String(stop.sellerId), stopId);
      await this.db.execute(
        "INSERT INTO delivery_plan_stops (id,plan_id,order_id,seller_order_id,seller_id,original_carrier_id,pickup_address_snapshot_json,requires_location_quote,fallback_shipping_price,fallback_special_vehicle_fee,pickup_sequence,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          stopId,
          planId,
          orderId,
          stop.sellerOrderId,
          stop.sellerId,
          stop.originalCarrierId ?? null,
          JSON.stringify(stop.pickupAddress ?? {}),
          stop.requiresLocationQuote ? 1 : 0,
          stop.fallbackShippingPrice,
          stop.fallbackSpecialVehicleFee ?? 0,
          index,
          ts,
          ts,
        ],
      );
    }
    const uniqueCandidates = new Map<string, any>();
    for (const candidate of candidates) {
      const providerId = String(candidate.providerId ?? "").trim();
      if (providerId && !uniqueCandidates.has(providerId))
        uniqueCandidates.set(providerId, candidate);
    }
    if (uniqueCandidates.size === 0)
      throw new Error("Unified delivery requires a qualified provider");
    for (const [providerId, candidate] of uniqueCandidates) {
      const source =
          candidate.source === "linked" ? "linked" : "qualified_network",
        score = Math.max(0, Math.floor(Number(candidate.coverageScore) || 0));
      await this.db.execute(
        "INSERT INTO delivery_plan_candidates (plan_id,provider_id,source,coverage_score,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        [planId, providerId, source, score, ts, ts],
      );
      const coveredSellerIds =
        Array.isArray(candidate.sellerIds) && candidate.sellerIds.length > 0
          ? candidate.sellerIds.map(String)
          : stops.map((stop: any) => String(stop.sellerId));
      const coveredStopIds = Array.from(
        new Set(
          coveredSellerIds
            .map((sellerId: string) => stopIdsBySeller.get(sellerId))
            .filter(Boolean),
        ),
      ) as string[];
      if (coveredStopIds.length === 0)
        throw new Error(
          "Delivery provider candidate must cover at least one seller",
        );
      for (const stopId of coveredStopIds)
        await this.db.execute(
          "INSERT INTO delivery_plan_candidate_stops (plan_id,provider_id,stop_id,created_at) VALUES (?,?,?,?)",
          [planId, providerId, stopId, ts],
        );
    }
    await this.audit(
      orderId,
      "delivery_plan",
      planId,
      "created",
      actor,
      null,
      "collecting_quotes",
      {
        strategy: "unified",
        sellerCount: stops.length,
        candidateCount: uniqueCandidates.size,
        fallbackConfirmedPrice: fallback,
      },
    );
    return this.one("SELECT * FROM delivery_plans WHERE id=?", [planId]);
  }
  private async setOrderItemShipping(item: Row, shipping: number) {
    const total = Math.max(
      0,
      Number(item.subtotal_price) -
        Number(item.item_discount_amount) -
        Number(item.coupon_discount_amount) +
        shipping -
        Number(item.shipping_discount_amount) +
        Number(item.tax_amount) +
        Number(item.service_fee_amount) +
        Number(item.commission_amount),
    );
    const remaining = Math.max(
      0,
      total - Number(item.paid_amount) + Number(item.refunded_amount),
    );
    await this.db.execute(
      "UPDATE order_items SET shipping_price=?,total_price=?,remaining_amount=?,updated_at=? WHERE id=?",
      [shipping, total, remaining, now(), item.id],
    );
  }
  private async reconcileDeliveryPlanAfterItemCancellation(
    orderId: string,
    sellerOrderId: string,
    actor: Actor,
  ) {
    const plan = await this.one(
      "SELECT * FROM delivery_plans WHERE order_id=?",
      [orderId],
    );
    if (
      !plan ||
      ["separate_selected", "cancelled", "completed"].includes(
        String(plan.status),
      )
    )
      return;
    const sellerActive = await this.one(
      "SELECT id FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') LIMIT 1",
      [sellerOrderId],
    );
    if (sellerActive) {
      if (plan.status === "accepted") {
        await this.applyAcceptedDeliveryPlanPrices(plan, actor);
      }
      return;
    }
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plan_stops SET status='cancelled',updated_at=? WHERE plan_id=? AND seller_order_id=?",
      [ts, plan.id, sellerOrderId],
    );
    const activeStops = Number(
      (
        await this.one(
          "SELECT COUNT(*) count FROM delivery_plan_stops WHERE plan_id=? AND status<>'cancelled'",
          [plan.id],
        )
      )?.count ?? 0,
    );
    if (activeStops === 0) {
      await this.db.execute(
        "UPDATE delivery_plan_quotes SET status=CASE WHEN status='accepted' THEN 'superseded' WHEN status='pending_buyer' THEN 'rejected' ELSE status END,responded_at=CASE WHEN status IN ('accepted','pending_buyer') THEN ? ELSE responded_at END,updated_at=? WHERE plan_id=?",
        [ts, ts, plan.id],
      );
      await this.db.execute(
        "UPDATE delivery_plans SET status='cancelled',selected_quote_id=NULL,seller_count=0,updated_at=? WHERE id=?",
        [ts, plan.id],
      );
      await this.recalculateAll(orderId, actor);
      await this.audit(
        orderId,
        "delivery_plan",
        plan.id,
        "cancelled",
        actor,
        plan.status,
        "cancelled",
        { reason: "all_delivery_stops_cancelled" },
      );
      return;
    }
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
      [orderId],
    );
    for (const item of items) await this.setOrderItemShipping(item, 0);
    const fallback = await this.one(
      "SELECT COALESCE(SUM(fallback_shipping_price),0) price,MAX(requires_location_quote) pending,MIN(CASE WHEN original_carrier_id IS NULL OR original_carrier_id='' THEN 0 ELSE 1 END) available FROM delivery_plan_stops WHERE plan_id=? AND status<>'cancelled'",
      [plan.id],
    );
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status=CASE WHEN status='accepted' THEN 'superseded' WHEN status='pending_buyer' THEN 'rejected' ELSE status END,responded_at=CASE WHEN status IN ('accepted','pending_buyer') THEN ? ELSE responded_at END,updated_at=? WHERE plan_id=?",
      [ts, ts, plan.id],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET status='reprice_required',selected_quote_id=NULL,seller_count=?,fallback_confirmed_price=?,fallback_has_pending_quotes=?,fallback_available=?,updated_at=? WHERE id=?",
      [
        activeStops,
        Number(fallback?.price ?? 0),
        Number(fallback?.pending ?? 0),
        Number(fallback?.available ?? 0),
        ts,
        plan.id,
      ],
    );
    await this.recalculateAll(orderId, actor);
    await this.audit(
      orderId,
      "delivery_plan",
      plan.id,
      "updated",
      actor,
      plan.status,
      "reprice_required",
      { reason: "seller_stop_cancelled", sellerOrderId, activeStops },
    );
  }
  private async applyAcceptedDeliveryPlanPrices(plan: Row, actor: Actor) {
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC,id ASC",
      [plan.order_id],
    );
    if (items.length === 0)
      throw new Error("Delivery plan has no active product items");
    for (const item of items) await this.setOrderItemShipping(item, 0);
    const quotes = await this.db.execute(
      "SELECT * FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted' ORDER BY created_at,id",
      [plan.id],
    );
    if (quotes.length === 0)
      throw new Error("Accepted delivery quote not found");
    for (const quote of quotes) {
      const scopedItem = await this.one(
        "SELECT oi.* FROM order_items oi JOIN delivery_plan_stops dps ON dps.seller_order_id=oi.seller_order_id JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=? AND oi.status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY oi.created_at,oi.id LIMIT 1",
        [quote.id],
      );
      if (!scopedItem) continue;
      await this.setOrderItemShipping(
        scopedItem,
        Number(quote.total_shipping_price),
      );
      await this.db.execute(
        "UPDATE seller_orders SET service_provider_id=?,updated_at=? WHERE id IN (SELECT dps.seller_order_id FROM delivery_plan_stops dps JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=?)",
        [quote.provider_id, now(), quote.id],
      );
      await this.db.execute(
        "UPDATE order_items SET shipping_notes=?,updated_at=? WHERE seller_order_id IN (SELECT dps.seller_order_id FROM delivery_plan_stops dps JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=?)",
        [
          `carrier:${quote.provider_id};delivery-plan:${plan.id};delivery-quote:${quote.id}`,
          now(),
          quote.id,
        ],
      );
    }
    await this.db.execute(
      "UPDATE shipping_quotes SET status='cancelled',responded_at=?,updated_at=? WHERE order_id=? AND status IN ('requested','pending_buyer','rejected','expired')",
      [now(), now(), plan.order_id],
    );
    await this.recalculateAll(plan.order_id, actor);
  }
  async proposeUnifiedDeliveryQuote(planId: string, input: any, actor: Actor) {
    if (actor.role !== "service_provider" && actor.role !== "admin")
      throw new Error("Delivery provider only");
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      planId,
    ]);
    if (!plan) throw new Error("Delivery plan not found");
    if (
      !["collecting_quotes", "pending_buyer", "reprice_required"].includes(
        plan.status,
      )
    )
      throw new Error("Delivery plan is not accepting quotes");
    if (actor.role !== "admin") {
      const candidate = await this.one(
        "SELECT * FROM delivery_plan_candidates WHERE plan_id=? AND provider_id=?",
        [planId, actor.id],
      );
      if (!candidate) throw new Error("Forbidden");
    }
    const pending = await this.one(
      "SELECT id FROM delivery_plan_quotes WHERE plan_id=? AND provider_id=? AND status='pending_buyer'",
      [planId, actor.id],
    );
    if (pending)
      throw new Error("A delivery quote is already pending buyer approval");
    const coveredStops =
      actor.role === "admin"
        ? await this.db.execute(
            "SELECT id stop_id FROM delivery_plan_stops WHERE plan_id=? AND status<>'cancelled'",
            [planId],
          )
        : await this.db.execute(
            "SELECT dpcs.stop_id FROM delivery_plan_candidate_stops dpcs JOIN delivery_plan_stops dps ON dps.id=dpcs.stop_id WHERE dpcs.plan_id=? AND dpcs.provider_id=? AND dps.status<>'cancelled'",
            [planId, actor.id],
          );
    if (coveredStops.length === 0)
      throw new Error("Delivery provider has no active pickup stops");
    const placeholders = coveredStops.map(() => "?").join(","),
      coveredIds = coveredStops.map((stop) => String(stop.stop_id));
    const scopeTransport = await this.one(
      `SELECT MAX(oi.requires_special_vehicle) special FROM order_items oi JOIN delivery_plan_stops dps ON dps.seller_order_id=oi.seller_order_id WHERE dps.id IN (${placeholders}) AND oi.status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')`,
      coveredIds,
    );
    const base = Number(input.baseShippingPrice),
      vehicle = Number(input.specialVehicleFee ?? 0);
    if (
      !Number.isSafeInteger(base) ||
      base < 0 ||
      !Number.isSafeInteger(vehicle) ||
      vehicle < 0
    )
      throw new Error("invalid delivery quote");
    if (!scopeTransport?.special && vehicle !== 0)
      throw new Error(
        "Special vehicle fee is not allowed for this delivery quote",
      );
    const total = base + vehicle;
    if (!Number.isSafeInteger(total)) throw new Error("invalid delivery quote");
    const latest = await this.one(
      "SELECT COALESCE(MAX(version),0) version FROM delivery_plan_quotes WHERE plan_id=? AND provider_id=?",
      [planId, actor.id],
    );
    const quoteId = id(),
      ts = now(),
      notes =
        String(input.notes ?? "")
          .trim()
          .slice(0, 1000) || null,
      expiresAt = input.expiresAt ? String(input.expiresAt) : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now())
      throw new Error("Delivery quote expiry must be in the future");
    await this.db.execute(
      "INSERT INTO delivery_plan_quotes (id,plan_id,order_id,provider_id,version,base_shipping_price,special_vehicle_fee,total_shipping_price,status,notes,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?, 'pending_buyer',?,?,?,?)",
      [
        quoteId,
        planId,
        plan.order_id,
        actor.id,
        Number(latest?.version ?? 0) + 1,
        base,
        vehicle,
        total,
        notes,
        expiresAt,
        ts,
        ts,
      ],
    );
    for (const stopId of coveredIds)
      await this.db.execute(
        "INSERT INTO delivery_plan_quote_stops (quote_id,plan_id,stop_id,created_at) VALUES (?,?,?,?)",
        [quoteId, planId, stopId, ts],
      );
    await this.db.execute(
      "UPDATE delivery_plan_candidates SET status='quoted',updated_at=? WHERE plan_id=? AND provider_id=?",
      [ts, planId, actor.id],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET status='pending_buyer',updated_at=? WHERE id=?",
      [ts, planId],
    );
    await this.audit(
      plan.order_id,
      "delivery_plan_quote",
      quoteId,
      "shipping_fee_changed",
      actor,
      null,
      "pending_buyer",
      {
        planId,
        baseShippingPrice: base,
        specialVehicleFee: vehicle,
        totalShippingPrice: total,
        coveredStopCount: coveredIds.length,
      },
    );
    return this.one("SELECT * FROM delivery_plan_quotes WHERE id=?", [quoteId]);
  }
  async acceptUnifiedDeliveryQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one(
      "SELECT * FROM delivery_plan_quotes WHERE id=?",
      [quoteId],
    );
    if (!quote) throw new Error("Delivery quote not found");
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      quote.plan_id,
    ]);
    await this.requireBuyerOrder(quote.order_id, actor);
    if (
      !plan ||
      !["pending_buyer", "reprice_required", "collecting_quotes"].includes(
        plan.status,
      ) ||
      quote.status !== "pending_buyer"
    )
      throw new Error("Delivery quote is not awaiting buyer approval");
    if (quote.expires_at && new Date(quote.expires_at).getTime() <= Date.now())
      throw new Error("Delivery quote expired");
    const ts = now();
    const conflict = await this.one(
      "SELECT aq.id FROM delivery_plan_quotes aq JOIN delivery_plan_quote_stops aqs ON aqs.quote_id=aq.id JOIN delivery_plan_quote_stops incoming ON incoming.stop_id=aqs.stop_id WHERE aq.plan_id=? AND aq.status='accepted' AND incoming.quote_id=? LIMIT 1",
      [plan.id, quoteId],
    );
    if (conflict)
      throw new Error(
        "Delivery quote overlaps an already accepted pickup group",
      );
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status='accepted',responded_at=?,updated_at=? WHERE id=? AND status='pending_buyer'",
      [ts, ts, quoteId],
    );
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status='rejected',responded_at=?,updated_at=? WHERE plan_id=? AND status='pending_buyer' AND id<>? AND EXISTS (SELECT 1 FROM delivery_plan_quote_stops other JOIN delivery_plan_quote_stops chosen ON chosen.stop_id=other.stop_id WHERE other.quote_id=delivery_plan_quotes.id AND chosen.quote_id=?)",
      [ts, ts, plan.id, quoteId, quoteId],
    );
    const coverage = await this.one(
      "SELECT COUNT(DISTINCT dps.id) total,COUNT(DISTINCT CASE WHEN aq.id IS NOT NULL THEN dps.id END) covered FROM delivery_plan_stops dps LEFT JOIN delivery_plan_quote_stops aqs ON aqs.stop_id=dps.id LEFT JOIN delivery_plan_quotes aq ON aq.id=aqs.quote_id AND aq.status='accepted' WHERE dps.plan_id=? AND dps.status<>'cancelled'",
      [plan.id],
    );
    const fullyCovered =
      Number(coverage?.total ?? 0) > 0 &&
      Number(coverage?.covered ?? 0) === Number(coverage?.total ?? 0);
    const acceptedCount = Number(
      (
        await this.one(
          "SELECT COUNT(*) count FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted'",
          [plan.id],
        )
      )?.count ?? 0,
    );
    const nextStatus = fullyCovered ? "accepted" : "pending_buyer",
      strategy = fullyCovered && acceptedCount === 1 ? "unified" : "hybrid",
      selected = fullyCovered && acceptedCount === 1 ? quoteId : null;
    await this.db.execute(
      "UPDATE delivery_plans SET status=?,strategy=?,selected_quote_id=?,updated_at=? WHERE id=?",
      [nextStatus, strategy, selected, ts, plan.id],
    );
    if (fullyCovered)
      await this.applyAcceptedDeliveryPlanPrices(
        { ...plan, status: nextStatus, strategy },
        actor,
      );
    await this.audit(
      quote.order_id,
      "delivery_plan",
      plan.id,
      "accepted",
      actor,
      plan.status,
      nextStatus,
      {
        quoteId,
        providerId: quote.provider_id,
        totalShippingPrice: quote.total_shipping_price,
        fullyCovered,
        acceptedQuoteCount: acceptedCount,
        strategy,
      },
    );
    return this.one("SELECT * FROM delivery_plans WHERE id=?", [plan.id]);
  }
  async rejectUnifiedDeliveryQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one(
      "SELECT * FROM delivery_plan_quotes WHERE id=?",
      [quoteId],
    );
    if (!quote) throw new Error("Delivery quote not found");
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      quote.plan_id,
    ]);
    await this.requireBuyerOrder(quote.order_id, actor);
    if (!plan || quote.status !== "pending_buyer")
      throw new Error("Delivery quote is not awaiting buyer approval");
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status='rejected',responded_at=?,updated_at=? WHERE id=?",
      [ts, ts, quoteId],
    );
    const remaining = await this.one(
      "SELECT id FROM delivery_plan_quotes WHERE plan_id=? AND status='pending_buyer' LIMIT 1",
      [plan.id],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET status=?,updated_at=? WHERE id=?",
      [remaining ? "pending_buyer" : "collecting_quotes", ts, plan.id],
    );
    await this.audit(
      quote.order_id,
      "delivery_plan_quote",
      quoteId,
      "rejected",
      actor,
      "pending_buyer",
      "rejected",
      {
        providerId: quote.provider_id,
        totalShippingPrice: quote.total_shipping_price,
      },
    );
    return this.one("SELECT * FROM delivery_plan_quotes WHERE id=?", [quoteId]);
  }
  async chooseSeparateDelivery(planId: string, actor: Actor) {
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      planId,
    ]);
    if (!plan) throw new Error("Delivery plan not found");
    await this.requireBuyerOrder(plan.order_id, actor);
    if (["cancelled", "completed", "separate_selected"].includes(plan.status))
      throw new Error("Delivery plan cannot switch to separate delivery");
    if (!plan.fallback_available)
      throw new Error(
        "Separate delivery is unavailable because a seller has no linked delivery provider",
      );
    const shipment = await this.one(
      "SELECT shipment_id FROM delivery_plan_shipments WHERE plan_id=?",
      [planId],
    );
    if (shipment) throw new Error("Delivery plan already has a shipment");
    const payment = await this.one(
      "SELECT id FROM payments WHERE order_id=? AND status IN ('partially_paid','fully_paid') LIMIT 1",
      [plan.order_id],
    );
    if (payment) throw new Error("Paid delivery plan cannot be changed");
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
      [plan.order_id],
    );
    for (const item of items) await this.setOrderItemShipping(item, 0);
    const stops = await this.db.execute(
      "SELECT * FROM delivery_plan_stops WHERE plan_id=? ORDER BY pickup_sequence",
      [planId],
    );
    for (const stop of stops) {
      await this.db.execute(
        "UPDATE seller_orders SET service_provider_id=?,updated_at=? WHERE id=?",
        [stop.original_carrier_id ?? null, now(), stop.seller_order_id],
      );
      const item = await this.one(
        "SELECT * FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC,id ASC LIMIT 1",
        [stop.seller_order_id],
      );
      if (!item) continue;
      await this.db.execute(
        "UPDATE order_items SET shipping_notes=?,updated_at=? WHERE seller_order_id=?",
        [
          stop.original_carrier_id
            ? `carrier:${stop.original_carrier_id}`
            : null,
          now(),
          stop.seller_order_id,
        ],
      );
      await this.setOrderItemShipping(
        item,
        Number(stop.fallback_shipping_price),
      );
      if (stop.requires_location_quote) {
        const existing = await this.one(
          "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
          [stop.seller_order_id],
        );
        if (!existing)
          await this.requestShippingQuote(
            plan.order_id,
            String(stop.seller_order_id),
            Number(stop.fallback_special_vehicle_fee),
            actor,
          );
      }
    }
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plan_quotes SET status=CASE WHEN status='accepted' THEN 'superseded' WHEN status='pending_buyer' THEN 'rejected' ELSE status END,responded_at=CASE WHEN status IN ('accepted','pending_buyer') THEN ? ELSE responded_at END,updated_at=? WHERE plan_id=?",
      [ts, ts, planId],
    );
    await this.db.execute(
      "UPDATE delivery_plans SET strategy='separate',status='separate_selected',selected_quote_id=NULL,updated_at=? WHERE id=?",
      [ts, planId],
    );
    await this.recalculateAll(plan.order_id, actor);
    await this.audit(
      plan.order_id,
      "delivery_plan",
      planId,
      "updated",
      actor,
      plan.status,
      "separate_selected",
      { strategy: "separate" },
    );
    return this.one("SELECT * FROM delivery_plans WHERE id=?", [planId]);
  }
  async createUnifiedDeliveryShipment(planId: string, actor: Actor) {
    this.requireAdmin(actor);
    const plan = await this.one("SELECT * FROM delivery_plans WHERE id=?", [
      planId,
    ]);
    if (!plan) throw new Error("Delivery plan not found");
    if (plan.status !== "accepted")
      throw new Error(
        "Unified delivery quote must be accepted before shipment",
      );
    if (
      await this.one(
        "SELECT shipment_id FROM delivery_plan_shipments WHERE plan_id=?",
        [planId],
      )
    )
      throw new Error("Delivery plan shipment already exists");
    const quotes = await this.db.execute(
      "SELECT * FROM delivery_plan_quotes WHERE plan_id=? AND status='accepted' ORDER BY created_at,id",
      [planId],
    );
    if (quotes.length === 0)
      throw new Error("Accepted delivery quote not found");
    const items = await this.db.execute(
      "SELECT * FROM order_items WHERE order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed')",
      [plan.order_id],
    );
    if (items.length === 0)
      throw new Error("Delivery plan has no active items");
    if (items.some((item) => String(item.status) !== "ready_for_shipping"))
      throw new Error("All seller items must be ready before unified shipment");
    const order = await this.one("SELECT * FROM orders WHERE id=?", [
        plan.order_id,
      ]),
      created: Row[] = [];
    for (const quote of quotes) {
      const scopedItems = await this.db.execute(
        "SELECT oi.* FROM order_items oi JOIN delivery_plan_stops dps ON dps.seller_order_id=oi.seller_order_id JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=? AND oi.status='ready_for_shipping' ORDER BY oi.created_at,oi.id",
        [quote.id],
      );
      if (scopedItems.length === 0) continue;
      const stops = await this.db.execute(
        "SELECT dps.pickup_address_snapshot_json FROM delivery_plan_stops dps JOIN delivery_plan_quote_stops dpqs ON dpqs.stop_id=dps.id WHERE dpqs.quote_id=? AND dps.status<>'cancelled' ORDER BY dps.pickup_sequence",
        [quote.id],
      );
      const shipment = await this.createShipment(
        plan.order_id,
        {
          direction: "outbound",
          carrierId: quote.provider_id,
          shippingMethod:
            quotes.length === 1
              ? "unified_multi_seller_delivery"
              : "hybrid_multi_seller_delivery",
          pickupAddress: {
            stops: stops.map((stop) =>
              JSON.parse(String(stop.pickup_address_snapshot_json || "{}")),
            ),
          },
          deliveryAddress: JSON.parse(
            String(order.delivery_address_snapshot_json || "{}"),
          ),
          base: quote.base_shipping_price,
          specialVehicleFee: quote.special_vehicle_fee,
        },
        actor,
      );
      for (const item of scopedItems)
        await this.assignToShipment(
          String(shipment.id),
          {
            itemType: "order_item",
            orderItemId: String(item.id),
            quantity: Number(item.quantity ?? 1),
          },
          actor,
        );
      await this.db.execute(
        "INSERT INTO delivery_plan_shipments (plan_id,shipment_id,quote_id,created_at) VALUES (?,?,?,?)",
        [planId, shipment.id, quote.id, now()],
      );
      created.push(shipment);
    }
    if (created.length === 0)
      throw new Error("Delivery plan has no shippable quote groups");
    const ts = now();
    await this.db.execute(
      "UPDATE delivery_plans SET status='completed',updated_at=? WHERE id=?",
      [ts, planId],
    );
    await this.audit(
      plan.order_id,
      "delivery_plan",
      planId,
      "status_changed",
      actor,
      "accepted",
      "completed",
      {
        shipmentIds: created.map((shipment) => shipment.id),
        shipmentCount: created.length,
        strategy: plan.strategy,
      },
    );
    return this.one("SELECT * FROM shipments WHERE id=?", [created[0].id]);
  }
  async requestShippingQuote(
    orderId: string,
    sellerOrderId: string,
    specialVehicleFee: number,
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor),
      so = await this.one(
        "SELECT * FROM seller_orders WHERE id=? AND order_id=?",
        [sellerOrderId, orderId],
      );
    if (!so) throw new Error("Seller order not found");
    const existing = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    if (existing) throw new Error("Shipping quote request already exists");
    const fee = Number(specialVehicleFee);
    if (!Number.isSafeInteger(fee) || fee < 0)
      throw new Error("invalid shipping vehicle fee");
    const quoteId = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO shipping_quotes (id,order_id,seller_order_id,seller_id,service_provider_id,buyer_id,version,base_shipping_price,special_vehicle_fee,total_shipping_price,status,created_at,updated_at) VALUES (?,?,?,?,?,?,1,0,?,?,'requested',?,?)",
      [
        quoteId,
        orderId,
        sellerOrderId,
        so.seller_id,
        so.service_provider_id ?? null,
        order.buyer_id,
        fee,
        fee,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "shipping_quote",
      quoteId,
      "created",
      actor,
      null,
      "requested",
      { sellerOrderId, specialVehicleFee: fee },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }
  private async requireAcceptedShippingQuote(sellerOrderId: string) {
    const plan = await this.one(
      "SELECT dp.status FROM delivery_plans dp JOIN delivery_plan_stops dps ON dps.plan_id=dp.id WHERE dps.seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    if (
      plan &&
      ["collecting_quotes", "pending_buyer", "reprice_required"].includes(
        String(plan.status),
      )
    )
      throw new Error(
        "Unified delivery plan must be accepted or changed to separate delivery before processing",
      );
    if (plan && ["accepted", "completed"].includes(String(plan.status))) return;
    const requested = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? LIMIT 1",
      [sellerOrderId],
    );
    if (!requested) return;
    const accepted = await this.one(
      "SELECT id FROM shipping_quotes WHERE seller_order_id=? AND status='accepted' LIMIT 1",
      [sellerOrderId],
    );
    if (!accepted)
      throw new Error("Shipping quote must be accepted before processing");
  }
  private async reconcileShippingQuoteAfterItemCancellation(
    sellerOrderId: string,
    actor: Actor,
  ) {
    const activeItem = await this.one(
      "SELECT id FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC LIMIT 1",
      [sellerOrderId],
    );
    if (!activeItem) {
      await this.db.execute(
        "UPDATE shipping_quotes SET status='cancelled',responded_at=?,updated_at=? WHERE seller_order_id=? AND status IN ('requested','pending_buyer','rejected','expired')",
        [now(), now(), sellerOrderId],
      );
      return;
    }
    const accepted = await this.one(
      "SELECT * FROM shipping_quotes WHERE seller_order_id=? AND status='accepted' LIMIT 1",
      [sellerOrderId],
    );
    if (accepted) await this.applyAcceptedShippingQuote(accepted, actor);
  }
  async proposeShippingQuote(sellerOrderId: string, input: any, actor: Actor) {
    this.sellerActor(actor);
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    if (
      actor.role !== "admin" &&
      actor.id !== so.seller_id &&
      actor.id !== so.service_provider_id
    )
      throw new Error("Forbidden");
    const latest = await this.one(
      "SELECT * FROM shipping_quotes WHERE seller_order_id=? ORDER BY version DESC LIMIT 1",
      [sellerOrderId],
    );
    if (!latest) throw new Error("Shipping quote was not requested");
    if (latest.status === "pending_buyer")
      throw new Error("A shipping quote is already pending buyer approval");
    if (latest.status === "accepted")
      throw new Error("Accepted shipping quote cannot be replaced");
    const base = Number(input.baseShippingPrice);
    if (!Number.isSafeInteger(base) || base < 0)
      throw new Error("invalid shipping quote");
    const notes =
      String(input.notes ?? "")
        .trim()
        .slice(0, 1000) || null;
    const expiresAt = input.expiresAt ? String(input.expiresAt) : null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now())
      throw new Error("Shipping quote expiry must be in the future");
    const ts = now(),
      total = base + Number(latest.special_vehicle_fee ?? 0);
    if (!Number.isSafeInteger(total)) throw new Error("invalid shipping quote");
    const proposerRole =
      actor.role === "admin"
        ? "admin"
        : actor.id === so.service_provider_id
          ? "service_provider"
          : "seller";
    let quoteId = String(latest.id);
    if (latest.status === "requested") {
      await this.db.execute(
        "UPDATE shipping_quotes SET proposed_by=?,proposed_by_role=?,base_shipping_price=?,total_shipping_price=?,status='pending_buyer',notes=?,expires_at=?,updated_at=? WHERE id=?",
        [actor.id, proposerRole, base, total, notes, expiresAt, ts, quoteId],
      );
    } else {
      quoteId = id();
      await this.db.execute(
        "INSERT INTO shipping_quotes (id,order_id,seller_order_id,seller_id,service_provider_id,buyer_id,version,proposed_by,proposed_by_role,base_shipping_price,special_vehicle_fee,total_shipping_price,status,notes,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending_buyer',?,?,?,?)",
        [
          quoteId,
          latest.order_id,
          sellerOrderId,
          so.seller_id,
          so.service_provider_id ?? null,
          latest.buyer_id,
          Number(latest.version) + 1,
          actor.id,
          proposerRole,
          base,
          Number(latest.special_vehicle_fee ?? 0),
          total,
          notes,
          expiresAt,
          ts,
          ts,
        ],
      );
    }
    await this.audit(
      latest.order_id,
      "shipping_quote",
      quoteId,
      "shipping_fee_changed",
      actor,
      latest.status,
      "pending_buyer",
      {
        baseShippingPrice: base,
        specialVehicleFee: Number(latest.special_vehicle_fee ?? 0),
        totalShippingPrice: total,
        version:
          latest.status === "requested"
            ? latest.version
            : Number(latest.version) + 1,
      },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }
  private async applyAcceptedShippingQuote(quote: Row, actor: Actor) {
    const item = await this.one(
      "SELECT * FROM order_items WHERE seller_order_id=? AND status NOT IN ('seller_rejected','buyer_cancelled','admin_cancelled','closed') ORDER BY created_at ASC LIMIT 1",
      [quote.seller_order_id],
    );
    if (!item) throw new Error("Shipping quote has no active product item");
    await this.setOrderItemShipping(item, Number(quote.total_shipping_price));
    await this.recalculateAll(quote.order_id, actor);
  }
  async acceptShippingQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one("SELECT * FROM shipping_quotes WHERE id=?", [
      quoteId,
    ]);
    if (!quote) throw new Error("Shipping quote not found");
    await this.requireBuyerOrder(quote.order_id, actor);
    if (quote.status !== "pending_buyer")
      throw new Error("Shipping quote is not awaiting buyer approval");
    if (quote.expires_at && new Date(quote.expires_at).getTime() <= Date.now())
      throw new Error("Shipping quote expired");
    const ts = now();
    await this.db.execute(
      "UPDATE shipping_quotes SET status='accepted',responded_at=?,updated_at=? WHERE id=? AND status='pending_buyer'",
      [ts, ts, quoteId],
    );
    await this.applyAcceptedShippingQuote(
      { ...quote, status: "accepted" },
      actor,
    );
    await this.audit(
      quote.order_id,
      "shipping_quote",
      quoteId,
      "accepted",
      actor,
      "pending_buyer",
      "accepted",
      {
        totalShippingPrice: quote.total_shipping_price,
        version: quote.version,
      },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }
  async rejectShippingQuote(quoteId: string, actor: Actor) {
    if (actor.role !== "buyer" && actor.role !== "admin")
      throw new Error("Buyer only");
    const quote = await this.one("SELECT * FROM shipping_quotes WHERE id=?", [
      quoteId,
    ]);
    if (!quote) throw new Error("Shipping quote not found");
    await this.requireBuyerOrder(quote.order_id, actor);
    if (quote.status !== "pending_buyer")
      throw new Error("Shipping quote is not awaiting buyer approval");
    const ts = now();
    await this.db.execute(
      "UPDATE shipping_quotes SET status='rejected',responded_at=?,updated_at=? WHERE id=? AND status='pending_buyer'",
      [ts, ts, quoteId],
    );
    await this.audit(
      quote.order_id,
      "shipping_quote",
      quoteId,
      "rejected",
      actor,
      "pending_buyer",
      "rejected",
      {
        totalShippingPrice: quote.total_shipping_price,
        version: quote.version,
      },
    );
    return this.one("SELECT * FROM shipping_quotes WHERE id=?", [quoteId]);
  }
  async createShipment(orderId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const order = await this.one("SELECT id FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    if (input.sellerOrderId)
      await this.requireAcceptedShippingQuote(input.sellerOrderId);
    const sid = id(),
      ts = now(),
      finalPrice = calculateShipmentPricing({
        base: input.base ?? 0,
        handling: input.handling ?? 0,
        specialVehicle: input.specialVehicleFee ?? 0,
        insurance: input.insurance ?? 0,
        discount: input.discount ?? 0,
        tax: input.tax ?? 0,
      });
    await this.db.execute(
      "INSERT INTO shipments (id,order_id,direction,carrier_id,carrier_company_name,tracking_number,shipping_method,pickup_address_snapshot_json,delivery_address_snapshot_json,expected_delivery_at,base_shipping_price,extra_handling_fee,special_vehicle_fee,insurance_fee,shipping_discount_amount,tax_amount,final_shipping_price,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        sid,
        orderId,
        input.direction ?? "outbound",
        input.carrierId ?? null,
        input.carrierCompanyName ?? null,
        input.trackingNumber ?? null,
        input.shippingMethod,
        JSON.stringify(input.pickupAddress ?? {}),
        JSON.stringify(input.deliveryAddress ?? {}),
        input.expectedDeliveryAt ?? null,
        input.base ?? 0,
        input.handling ?? 0,
        input.specialVehicleFee ?? 0,
        input.insurance ?? 0,
        input.discount ?? 0,
        input.tax ?? 0,
        finalPrice,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "shipment",
      sid,
      "created",
      actor,
      null,
      "waiting_for_carrier_pickup",
      { finalShippingPrice: finalPrice },
    );
    return this.one("SELECT * FROM shipments WHERE id=?", [sid]);
  }
  async createSellerOrderShipment(orderId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const so = await this.one(
      "SELECT * FROM seller_orders WHERE id=? AND order_id=?",
      [input.sellerOrderId, orderId],
    );
    if (!so) throw new Error("Seller order not found");
    const deliveryPlan = await this.one(
      "SELECT dp.status FROM delivery_plans dp JOIN delivery_plan_stops dps ON dps.plan_id=dp.id WHERE dps.seller_order_id=? LIMIT 1",
      [so.id],
    );
    if (
      deliveryPlan &&
      !["separate_selected", "cancelled"].includes(String(deliveryPlan.status))
    )
      throw new Error(
        "Use the unified delivery shipment for this seller order",
      );
    const carrierId = input.carrierId ?? so.service_provider_id;
    if (!carrierId) throw new Error("Delivery carrier is required");
    const shipment = await this.createShipment(
      orderId,
      {
        sellerOrderId: so.id,
        direction: "outbound",
        carrierId,
        shippingMethod: input.shippingMethod ?? "cash_on_delivery_delivery",
        pickupAddress: input.pickupAddress ?? {},
        deliveryAddress: input.deliveryAddress ?? {},
        base: input.base ?? so.seller_shipping_total ?? 0,
        specialVehicleFee: input.specialVehicleFee ?? 0,
      },
      actor,
    );
    const items = await this.db.execute(
      "SELECT id,quantity,status FROM order_items WHERE seller_order_id=? AND status IN ('seller_accepted','preparing','ready_for_shipping')",
      [so.id],
    );
    for (const item of items)
      await this.assignToShipment(
        String(shipment.id),
        {
          itemType: "order_item",
          orderItemId: String(item.id),
          quantity: Number(item.quantity ?? 1),
        },
        actor,
      );
    const customItems = await this.db.execute(
      "SELECT id,quantity,requested_quantity,status FROM custom_request_items WHERE seller_order_id=? AND status IN ('buyer_accepted_price','preparing','ready_for_shipping')",
      [so.id],
    );
    for (const item of customItems)
      await this.assignToShipment(
        String(shipment.id),
        {
          itemType: "custom_request_item",
          customRequestItemId: String(item.id),
          quantity: Number(item.quantity ?? item.requested_quantity ?? 1) || 1,
        },
        actor,
      );
    return this.one("SELECT * FROM shipments WHERE id=?", [shipment.id]);
  }
  async assignOrderItemToShipment(
    shipmentId: string,
    itemId: string,
    quantity: number,
    actor: Actor,
  ) {
    return this.assignToShipment(
      shipmentId,
      { itemType: "order_item", orderItemId: itemId, quantity },
      actor,
    );
  }
  async assignCustomRequestItemToShipment(
    shipmentId: string,
    itemId: string,
    quantity: number,
    actor: Actor,
  ) {
    return this.assignToShipment(
      shipmentId,
      {
        itemType: "custom_request_item",
        customRequestItemId: itemId,
        quantity,
      },
      actor,
    );
  }
  private async assignToShipment(
    shipmentId: string,
    ref: ItemRef,
    actor: Actor,
  ) {
    this.requireAdmin(actor);
    validateItemRef(ref);
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
        shipmentId,
      ]),
      table =
        ref.itemType === "order_item" ? "order_items" : "custom_request_items",
      itemId = ref.orderItemId ?? ref.customRequestItemId,
      item = await this.one(`SELECT * FROM ${table} WHERE id=?`, [itemId]);
    if (!shipment || !item || shipment.order_id !== item.order_id)
      throw new Error("Shipment/item mismatch");
    if (NON_SHIPPABLE.has(item.status))
      throw new Error(
        "Rejected, cancelled, fulfilled or closed item cannot be shipped",
      );
    const available = Number(
      item.quantity ?? item.requested_quantity ?? item.available_quantity ?? 0,
    );
    if (available > 0 && ref.quantity > available)
      throw new Error("Shipment quantity exceeds item quantity");
    const si = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO shipment_items (id,shipment_id,order_id,seller_order_id,seller_id,service_provider_id,item_type,order_item_id,custom_request_item_id,quantity,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        si,
        shipmentId,
        item.order_id,
        item.seller_order_id,
        item.seller_id ?? null,
        item.service_provider_id ?? null,
        ref.itemType,
        ref.orderItemId ?? null,
        ref.customRequestItemId ?? null,
        ref.quantity,
        ts,
        ts,
      ],
    );
    await this.db.execute(
      `UPDATE ${table} SET status='assigned_to_shipment',updated_at=? WHERE id=?`,
      [ts, itemId],
    );
    await this.syncShipmentTransport(shipmentId, actor);
    await this.audit(
      item.order_id,
      "shipment_item",
      si,
      "assigned",
      actor,
      null,
      "assigned",
    );
    await this.recalculateAll(item.order_id, actor);
    return this.one("SELECT * FROM shipment_items WHERE id=?", [si]);
  }
  private async syncShipmentTransport(shipmentId: string, actor: Actor) {
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
        shipmentId,
      ]),
      r = await this.one(
        "SELECT MAX(requires_special_vehicle) special, MAX(requires_refrigeration) cold, MAX(requires_special_loading) loading, MAX(required_vehicle_type) vehicle, SUM(weight) weight FROM (SELECT oi.requires_special_vehicle,oi.requires_refrigeration,oi.requires_special_loading,oi.required_vehicle_type,oi.weight FROM shipment_items si JOIN order_items oi ON oi.id=si.order_item_id WHERE si.shipment_id=? UNION ALL SELECT ci.requires_special_vehicle,ci.requires_refrigeration,ci.requires_special_loading,ci.required_vehicle_type,ci.estimated_weight FROM shipment_items si JOIN custom_request_items ci ON ci.id=si.custom_request_item_id WHERE si.shipment_id=?)",
        [shipmentId, shipmentId],
      ),
      next = {
        containsSpecialVehicleItems: r?.special ?? 0,
        requiresRefrigeration: r?.cold ?? 0,
        requiresSpecialLoading: r?.loading ?? 0,
        requiredVehicleType: r?.vehicle ?? null,
        totalWeight: r?.weight ?? null,
      };
    await this.db.execute(
      "UPDATE shipments SET contains_special_vehicle_items=?,requires_refrigeration=?,requires_special_loading=?,required_vehicle_type=?,total_weight=?,updated_at=? WHERE id=?",
      [
        next.containsSpecialVehicleItems,
        next.requiresRefrigeration,
        next.requiresSpecialLoading,
        next.requiredVehicleType,
        next.totalWeight,
        now(),
        shipmentId,
      ],
    );
    if (
      shipment &&
      (shipment.contains_special_vehicle_items !==
        next.containsSpecialVehicleItems ||
        shipment.requires_refrigeration !== next.requiresRefrigeration ||
        shipment.requires_special_loading !== next.requiresSpecialLoading ||
        shipment.total_weight !== next.totalWeight)
    )
      await this.audit(
        shipment.order_id,
        "shipment",
        shipmentId,
        "updated",
        actor,
        shipment.status,
        shipment.status,
        next,
      );
  }
  private async updateShipmentItem(
    itemId: string,
    status: string,
    actor: Actor,
  ) {
    this.requireCarrier(actor);
    const si = await this.one(
      "SELECT si.*,s.carrier_id FROM shipment_items si JOIN shipments s ON s.id=si.shipment_id WHERE si.id=?",
      [itemId],
    );
    if (!si) throw new Error("Shipment item not found");
    if (actor.role !== "admin" && actor.id !== si.carrier_id)
      throw new Error("Forbidden");
    if (
      status === "delivered" &&
      !["in_transit", "at_distribution_center", "out_for_delivery"].includes(
        si.status,
      )
    )
      throw new Error(
        "Item must be in transit or out for delivery before delivery",
      );
    await this.db.execute(
      "UPDATE shipment_items SET status=?,carrier_received_at=CASE WHEN ?='received_by_carrier' THEN ? ELSE carrier_received_at END,delivered_at=CASE WHEN ?='delivered' THEN ? ELSE delivered_at END,updated_at=? WHERE id=?",
      [status, status, now(), status, now(), now(), itemId],
    );
    const table =
        si.item_type === "order_item" ? "order_items" : "custom_request_items",
      itemStatus: Record<string, string> = {
        assigned: "assigned_to_shipment",
        received_by_carrier: "assigned_to_shipment",
        rejected_by_carrier: "ready_for_shipping",
        in_transit: "in_transit",
        at_distribution_center: "in_transit",
        out_for_delivery: "in_transit",
        delivered: "delivered",
        delivery_rejected: "delivery_rejected",
        delivery_failed: "delivery_rejected",
        returned: "returned",
        closed: "closed",
      },
      target = itemStatus[status];
    if (!target) throw new Error("Unsupported shipment item status");
    await this.db.execute(
      `UPDATE ${table} SET status=?,updated_at=? WHERE id=?`,
      [target, now(), si.order_item_id ?? si.custom_request_item_id],
    );
    await this.audit(
      si.order_id,
      "shipment_item",
      itemId,
      status === "delivered"
        ? "delivered"
        : status === "delivery_rejected"
          ? "delivery_rejected"
          : status === "received_by_carrier"
            ? "received"
            : status === "rejected_by_carrier"
              ? "rejected"
              : "status_changed",
      actor,
      si.status,
      status,
    );
    await this.recalculateAll(si.order_id);
    return this.one("SELECT * FROM shipment_items WHERE id=?", [itemId]);
  }
  carrierReceiveShipmentItem = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "received_by_carrier", a);
  carrierRejectShipmentItem = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "rejected_by_carrier", a);
  markShipmentItemDelivered = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "delivered", a);
  markShipmentItemDeliveryRejected = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "delivery_rejected", a);
  markShipmentItemDeliveryFailed = (id: string, a: Actor) =>
    this.updateShipmentItem(id, "delivery_failed", a);
  async updateShipmentTracking(
    shipmentId: string,
    trackingNumber: string,
    actor: Actor,
  ) {
    this.requireCarrier(actor);
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    if (!shipment) throw new Error("Shipment not found");
    if (actor.role !== "admin" && actor.id !== shipment.carrier_id)
      throw new Error("Forbidden");
    await this.db.execute(
      "UPDATE shipments SET tracking_number=?,updated_at=? WHERE id=?",
      [trackingNumber, now(), shipmentId],
    );
    await this.audit(
      shipment.order_id,
      "shipment",
      shipmentId,
      "tracking_updated",
      actor,
      shipment.status,
      shipment.status,
      { trackingNumber },
    );
  }
  async updateShipmentPricing(shipmentId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const shipment = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    if (!shipment) throw new Error("Shipment not found");
    const next = {
        base: input.base ?? shipment.base_shipping_price,
        handling: input.handling ?? shipment.extra_handling_fee,
        specialVehicle: input.specialVehicleFee ?? shipment.special_vehicle_fee,
        insurance: input.insurance ?? shipment.insurance_fee,
        discount: input.discount ?? shipment.shipping_discount_amount,
        tax: input.tax ?? shipment.tax_amount,
      },
      final = calculateShipmentPricing(next);
    await this.db.execute(
      "UPDATE shipments SET base_shipping_price=?,extra_handling_fee=?,special_vehicle_fee=?,insurance_fee=?,shipping_discount_amount=?,tax_amount=?,final_shipping_price=?,updated_at=? WHERE id=?",
      [
        next.base,
        next.handling,
        next.specialVehicle,
        next.insurance,
        next.discount,
        next.tax,
        final,
        now(),
        shipmentId,
      ],
    );
    await this.audit(
      shipment.order_id,
      "shipment",
      shipmentId,
      "shipping_fee_changed",
      actor,
      shipment.status,
      shipment.status,
      { ...next, finalShippingPrice: final },
    );
    await this.recalculateOrderPricing(shipment.order_id, actor);
    return this.one("SELECT * FROM shipments WHERE id=?", [shipmentId]);
  }
  async adminUpdateOrder(
    orderId: string,
    input: {
      notes?: string | null;
      source?: string | null;
      deliveryAddress?: unknown;
    },
    actor: Actor,
  ) {
    this.requireAdmin(actor);
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const next = {
      notes: input.notes === undefined ? order.notes : input.notes,
      source: input.source === undefined ? order.source : input.source,
      address:
        input.deliveryAddress === undefined
          ? order.delivery_address_snapshot_json
          : JSON.stringify(input.deliveryAddress),
    };
    await this.db.execute(
      "UPDATE orders SET notes=?,source=?,delivery_address_snapshot_json=?,updated_at=? WHERE id=?",
      [next.notes, next.source, next.address, now(), orderId],
    );
    await this.audit(
      orderId,
      "order",
      orderId,
      "admin_change",
      actor,
      order.calculated_status,
      order.calculated_status,
      next,
    );
    return this.one("SELECT * FROM orders WHERE id=?", [orderId]);
  }
  async setShipmentItemsStatus(
    shipmentId: string,
    status: string,
    actor: Actor,
  ) {
    this.requireCarrier(actor);
    const shipment = await this.one(
      "SELECT carrier_id FROM shipments WHERE id=?",
      [shipmentId],
    );
    if (!shipment) throw new Error("Shipment not found");
    if (actor.role !== "admin" && actor.id !== shipment.carrier_id)
      throw new Error("Forbidden");
    for (const x of await this.db.execute(
      "SELECT id,status FROM shipment_items WHERE shipment_id=?",
      [shipmentId],
    ))
      if (x.status !== status && x.status !== "closed")
        await this.updateShipmentItem(String(x.id), status, actor);
    return this.one("SELECT * FROM shipments WHERE id=?", [shipmentId]);
  }
  markShipmentInTransit = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "in_transit", a);
  markShipmentArrivedAtDistributionCenter = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "at_distribution_center", a);
  markShipmentOutForDelivery = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "out_for_delivery", a);
  markShipmentPartiallyDelivered = (id: string, a: Actor) =>
    this.recalculateShipmentStatus(id, a);
  markShipmentFullyDelivered = (id: string, a: Actor) =>
    this.setShipmentItemsStatus(id, "delivered", a);
  async registerPayment(
    orderId: string,
    input: {
      buyerId: string;
      method: PaymentMethod;
      amount: number;
      currency: string;
      provider?: string;
      transactionId?: string;
      transactionData?: unknown;
    },
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor),
      deliveryPlan = await this.one(
        "SELECT status FROM delivery_plans WHERE order_id=?",
        [orderId],
      );
    if (
      deliveryPlan &&
      !["accepted", "completed", "separate_selected", "cancelled"].includes(
        String(deliveryPlan.status),
      )
    )
      throw new Error("Delivery plan must be resolved before payment");
    if (
      input.buyerId !== order.buyer_id ||
      input.currency.toUpperCase() !== order.currency
    )
      throw new Error("Payment buyer or currency does not match order");
    validateMoneyAndCurrency(input.amount, input.currency);
    if (input.amount <= 0) throw new Error("Payment amount must be positive");
    if (input.amount > order.remaining_total)
      throw new Error("Payment cannot exceed order remaining amount");
    const status =
        input.amount < order.remaining_total ? "partially_paid" : "fully_paid",
      pid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO payments (id,order_id,buyer_id,payment_method,amount,currency,status,provider,provider_transaction_id,transaction_data_json,paid_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        pid,
        orderId,
        input.buyerId,
        input.method,
        input.amount,
        input.currency,
        status,
        input.provider ?? null,
        input.transactionId ?? null,
        input.transactionData === undefined
          ? null
          : JSON.stringify(input.transactionData),
        ts,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "payment",
      pid,
      "payment_created",
      actor,
      null,
      status,
    );
    await this.recalculateAll(orderId, actor);
    return this.one("SELECT * FROM payments WHERE id=?", [pid]);
  }
  async markPaymentFailed(paymentId: string, actor: Actor) {
    this.requireAdmin(actor);
    const p = await this.one("SELECT * FROM payments WHERE id=?", [paymentId]);
    if (!p) throw new Error("Payment not found");
    await this.db.execute(
      "UPDATE payments SET status='failed',updated_at=? WHERE id=?",
      [now(), paymentId],
    );
    await this.audit(
      p.order_id,
      "payment",
      paymentId,
      "status_changed",
      actor,
      p.status,
      "failed",
    );
    await this.recalculateAll(p.order_id);
  }
  async createRefund(orderId: string, input: any, actor: Actor) {
    this.requireAdmin(actor);
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const paid = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) amount FROM payments WHERE order_id=? AND status IN ('partially_paid','fully_paid','refunded')",
            [orderId],
          )
        )?.amount ?? 0,
      ),
      refunded = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) amount FROM refunds WHERE order_id=? AND status IN ('partially_refunded','fully_refunded')",
            [orderId],
          )
        )?.amount ?? 0,
      );
    validateRefund(input.amount, paid, refunded);
    for (const [table, key] of [
      ["payments", "paymentId"],
      ["order_items", "orderItemId"],
      ["custom_request_items", "customRequestItemId"],
      ["return_requests", "returnRequestId"],
    ] as const) {
      if (input[key]) {
        const linked = await this.one(
          `SELECT order_id FROM ${table} WHERE id=?`,
          [input[key]],
        );
        if (!linked || linked.order_id !== orderId)
          throw new Error("Refund reference does not belong to order");
      }
    }
    const rid = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO refunds (id,order_id,payment_id,order_item_id,custom_request_item_id,return_request_id,amount,currency,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'requested',?,?)",
      [
        rid,
        orderId,
        input.paymentId ?? null,
        input.orderItemId ?? null,
        input.customRequestItemId ?? null,
        input.returnRequestId ?? null,
        input.amount,
        order.currency,
        input.reason,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "refund",
      rid,
      "refund_requested",
      actor,
      null,
      "requested",
    );
    return this.one("SELECT * FROM refunds WHERE id=?", [rid]);
  }
  async executeRefund(refundId: string, actor: Actor) {
    this.requireAdmin(actor);
    const r = await this.one("SELECT * FROM refunds WHERE id=?", [refundId]);
    if (!r) throw new Error("Refund not found");
    if (["partially_refunded", "fully_refunded", "rejected"].includes(r.status))
      throw new Error("Refund is not executable");
    const ts = now();
    await this.db.execute(
      "UPDATE refunds SET status='fully_refunded',executed_at=?,updated_at=? WHERE id=?",
      [ts, ts, refundId],
    );
    if (r.order_item_id)
      await this.db.execute(
        "UPDATE order_items SET refunded_amount=refunded_amount+?,remaining_amount=MAX(0,total_price-paid_amount+refunded_amount+?),updated_at=? WHERE id=?",
        [r.amount, r.amount, ts, r.order_item_id],
      );
    if (r.custom_request_item_id)
      await this.db.execute(
        "UPDATE custom_request_items SET refunded_amount=refunded_amount+?,remaining_amount=MAX(0,total_price-paid_amount+refunded_amount+?),updated_at=? WHERE id=?",
        [r.amount, r.amount, ts, r.custom_request_item_id],
      );
    if (r.return_request_id)
      await this.db.execute(
        "UPDATE return_requests SET refund_id=?,status='refunded',updated_at=? WHERE id=?",
        [refundId, ts, r.return_request_id],
      );
    if (r.payment_id) {
      const payment = await this.one("SELECT * FROM payments WHERE id=?", [
          r.payment_id,
        ]),
        sum = Number(
          (
            await this.one(
              "SELECT COALESCE(SUM(amount),0) n FROM refunds WHERE payment_id=? AND status IN ('partially_refunded','fully_refunded')",
              [r.payment_id],
            )
          )?.n ?? 0,
        );
      if (payment && sum >= payment.amount && payment.status !== "refunded") {
        await this.db.execute(
          "UPDATE payments SET status='refunded',updated_at=? WHERE id=?",
          [ts, r.payment_id],
        );
        await this.audit(
          r.order_id,
          "payment",
          r.payment_id,
          "status_changed",
          actor,
          payment.status,
          "refunded",
        );
      }
    }
    await this.audit(
      r.order_id,
      "refund",
      refundId,
      "refund_executed",
      actor,
      r.status,
      "fully_refunded",
    );
    await this.recalculateAll(r.order_id, actor);
    return this.one("SELECT * FROM refunds WHERE id=?", [refundId]);
  }
  async createReturnRequest(orderId: string, input: any, actor: Actor) {
    return this.createAfterSale("return", orderId, input, actor);
  }
  async createReplacementRequest(orderId: string, input: any, actor: Actor) {
    return this.createAfterSale("replacement", orderId, input, actor);
  }
  private async createAfterSale(
    kind: "return" | "replacement",
    orderId: string,
    input: any,
    actor: Actor,
  ) {
    const order = await this.requireBuyerOrder(orderId, actor);
    if (!Array.isArray(input.items) || input.items.length === 0)
      throw new Error(`${kind} requires at least one item`);
    for (const ref of input.items as ItemRef[]) {
      validateItemRef(ref);
      const itemTable =
          ref.itemType === "order_item"
            ? "order_items"
            : "custom_request_items",
        quantityColumn =
          ref.itemType === "order_item"
            ? "quantity"
            : "COALESCE(quantity,requested_quantity)",
        item = await this.one(
          `SELECT order_id,status,${quantityColumn} available_quantity FROM ${itemTable} WHERE id=?`,
          [ref.orderItemId ?? ref.customRequestItemId],
        );
      if (
        !item ||
        item.order_id !== orderId ||
        !RETURN_ELIGIBLE.has(item.status)
      )
        throw new Error(
          `${kind} requires a delivered eligible item from this order`,
        );
      const available = Number(item.available_quantity ?? 0);
      if (available > 0 && ref.quantity > available)
        throw new Error(`${kind} quantity exceeds item quantity`);
    }
    const request = id(),
      ts = now(),
      table = `${kind}_requests`;
    if (input.sellerOrderId) {
      const so = await this.one(
        "SELECT order_id FROM seller_orders WHERE id=?",
        [input.sellerOrderId],
      );
      if (!so || so.order_id !== orderId)
        throw new Error("Seller order does not belong to order");
    }
    await this.db.execute(
      `INSERT INTO ${table} (id,order_id,buyer_id,seller_order_id,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,'requested',?,?)`,
      [
        request,
        orderId,
        order.buyer_id,
        input.sellerOrderId ?? null,
        input.reason,
        ts,
        ts,
      ],
    );
    for (const ref of input.items as ItemRef[]) {
      if (kind === "return")
        await this.db.execute(
          "INSERT INTO return_request_items (id,return_request_id,item_type,order_item_id,custom_request_item_id,quantity,reason,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
          [
            id(),
            request,
            ref.itemType,
            ref.orderItemId ?? null,
            ref.customRequestItemId ?? null,
            ref.quantity,
            (ref as any).reason ?? null,
            ts,
            ts,
          ],
        );
      else
        await this.db.execute(
          "INSERT INTO replacement_request_items (id,replacement_request_id,old_item_type,old_order_item_id,old_custom_request_item_id,replacement_description,replacement_product_id,replacement_variant_id,quantity,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
          [
            id(),
            request,
            ref.itemType,
            ref.orderItemId ?? null,
            ref.customRequestItemId ?? null,
            (ref as any).replacementDescription ?? null,
            (ref as any).replacementProductId ?? null,
            (ref as any).replacementVariantId ?? null,
            ref.quantity,
            ts,
            ts,
          ],
        );
      const itemTable =
        ref.itemType === "order_item" ? "order_items" : "custom_request_items";
      await this.db.execute(
        `UPDATE ${itemTable} SET status=?,updated_at=? WHERE id=?`,
        [
          kind === "return" ? "return_requested" : "replacement_requested",
          ts,
          ref.orderItemId ?? ref.customRequestItemId,
        ],
      );
    }
    await this.audit(
      orderId,
      `${kind}_request`,
      request,
      kind === "return" ? "return_requested" : "replacement_requested",
      actor,
      null,
      "requested",
    );
    await this.recalculateAll(orderId);
    return this.one(`SELECT * FROM ${table} WHERE id=?`, [request]);
  }
  async decideAfterSale(
    kind: "return" | "replacement",
    requestId: string,
    approved: boolean,
    actor: Actor,
    reason?: string,
  ) {
    await this.requireAfterSaleSeller(kind, requestId, actor);
    const table = `${kind}_requests`,
      r = await this.one(`SELECT * FROM ${table} WHERE id=?`, [requestId]);
    if (!r) throw new Error("Request not found");
    const status =
      kind === "return"
        ? approved
          ? "seller_approved"
          : "seller_rejected"
        : approved
          ? "accepted"
          : "rejected";
    await this.db.execute(
      `UPDATE ${table} SET seller_approved=?,seller_rejection_reason=?,status=?,updated_at=? WHERE id=?`,
      [approved, approved ? null : (reason ?? null), status, now(), requestId],
    );
    await this.audit(
      r.order_id,
      `${kind}_request`,
      requestId,
      approved ? "accepted" : "rejected",
      actor,
      r.status,
      status,
    );
    await this.recalculateAll(r.order_id);
    return this.one(`SELECT * FROM ${table} WHERE id=?`, [requestId]);
  }
  approveReturnRequest = (id: string, a: Actor) =>
    this.decideAfterSale("return", id, true, a);
  rejectReturnRequest = (id: string, a: Actor, r?: string) =>
    this.decideAfterSale("return", id, false, a, r);
  approveReplacementRequest = (id: string, a: Actor) =>
    this.decideAfterSale("replacement", id, true, a);
  rejectReplacementRequest = (id: string, a: Actor, r?: string) =>
    this.decideAfterSale("replacement", id, false, a, r);
  async openDispute(orderId: string, input: any, actor: Actor) {
    const refs = {
      seller_order_id: input.sellerOrderId ?? null,
      order_item_id: input.orderItemId ?? null,
      custom_request_item_id: input.customRequestItemId ?? null,
      shipment_id: input.shipmentId ?? null,
      return_request_id: input.returnRequestId ?? null,
    };
    await this.validateDisputeReferences(orderId, refs);
    await this.requireDisputeAccess(orderId, refs, actor);
    const did = id(),
      ts = now();
    await this.db.execute(
      "INSERT INTO disputes (id,order_id,seller_order_id,order_item_id,custom_request_item_id,shipment_id,return_request_id,opened_by,opened_by_role,reason,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'opened',?,?)",
      [
        did,
        orderId,
        refs.seller_order_id,
        refs.order_item_id,
        refs.custom_request_item_id,
        refs.shipment_id,
        refs.return_request_id,
        actor.id,
        actor.role,
        input.reason,
        ts,
        ts,
      ],
    );
    await this.audit(
      orderId,
      "dispute",
      did,
      "dispute_opened",
      actor,
      null,
      "opened",
    );
    return this.one("SELECT * FROM disputes WHERE id=?", [did]);
  }
  async replyToDispute(disputeId: string, message: string, actor: Actor) {
    const d = await this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
    if (!d) throw new Error("Dispute not found");
    await this.requireDisputeAccess(d.order_id, d, actor);
    if (!message.trim()) throw new Error("Message is required");
    const status =
        actor.role === "buyer"
          ? "buyer_replied"
          : actor.role === "carrier"
            ? "carrier_replied"
            : actor.role === "admin"
              ? "admin_intervened"
              : "seller_replied",
      ts = now();
    await this.db.execute(
      "INSERT INTO dispute_messages (id,dispute_id,sender_id,sender_role,message,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",
      [id(), disputeId, actor.id, actor.role, message, ts, ts],
    );
    await this.db.execute(
      "UPDATE disputes SET status=?,updated_at=? WHERE id=?",
      [status, ts, disputeId],
    );
    await this.audit(
      d.order_id,
      "dispute",
      disputeId,
      "dispute_replied",
      actor,
      d.status,
      status,
    );
    return this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
  }
  async adminResolveDispute(disputeId: string, decision: string, actor: Actor) {
    if (actor.role !== "admin") throw new Error("Admin only");
    const d = await this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
    if (!d) throw new Error("Dispute not found");
    await this.db.execute(
      "UPDATE disputes SET status='admin_decision_issued',admin_decision=?,closed_at=?,updated_at=? WHERE id=?",
      [decision, now(), now(), disputeId],
    );
    await this.audit(
      d.order_id,
      "dispute",
      disputeId,
      "admin_decision",
      actor,
      d.status,
      "admin_decision_issued",
      { decision },
    );
    return this.one("SELECT * FROM disputes WHERE id=?", [disputeId]);
  }
  async recalculateShipmentPricing(
    shipmentId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const s = await this.one("SELECT * FROM shipments WHERE id=?", [
      shipmentId,
    ]);
    if (!s) throw new Error("Shipment not found");
    const total = calculateShipmentPricing({
      base: s.base_shipping_price,
      handling: s.extra_handling_fee,
      specialVehicle: s.special_vehicle_fee,
      insurance: s.insurance_fee,
      discount: s.shipping_discount_amount,
      tax: s.tax_amount,
    });
    if (total !== s.final_shipping_price) {
      await this.db.execute(
        "UPDATE shipments SET final_shipping_price=?,updated_at=? WHERE id=?",
        [total, now(), shipmentId],
      );
      await this.audit(
        s.order_id,
        "shipment",
        shipmentId,
        "shipping_fee_changed",
        actor,
        s.status,
        s.status,
        { finalShippingPrice: total },
      );
    }
    return total;
  }
  async recalculateShipmentStatus(
    shipmentId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const s = await this.one("SELECT * FROM shipments WHERE id=?", [
        shipmentId,
      ]),
      rows = await this.db.execute(
        "SELECT status FROM shipment_items WHERE shipment_id=?",
        [shipmentId],
      ),
      status = calculateShipmentStatus(rows.map((x) => String(x.status)));
    if (s && s.status !== status) {
      await this.db.execute(
        "UPDATE shipments SET status=?,updated_at=? WHERE id=?",
        [status, now(), shipmentId],
      );
      await this.audit(
        s.order_id,
        "shipment",
        shipmentId,
        "status_changed",
        actor,
        s.status,
        status,
      );
    }
    return status;
  }
  async recalculateSellerOrderStatus(
    sellerOrderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const so = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!so) throw new Error("Seller order not found");
    const rows = await this.db.execute(
        "SELECT status FROM order_items WHERE seller_order_id=? UNION ALL SELECT status FROM custom_request_items WHERE seller_order_id=?",
        [sellerOrderId, sellerOrderId],
      ),
      status = calculateSellerOrderStatus(rows.map((x) => String(x.status)));
    if (so.status !== status) {
      await this.db.execute(
        "UPDATE seller_orders SET status=?,updated_at=? WHERE id=?",
        [status, now(), sellerOrderId],
      );
      await this.audit(
        so.order_id,
        "seller_order",
        sellerOrderId,
        "status_changed",
        actor,
        so.status,
        status,
      );
    }
    return status;
  }
  async recalculateSellerOrderPricing(
    sellerOrderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const old = await this.one("SELECT * FROM seller_orders WHERE id=?", [
      sellerOrderId,
    ]);
    if (!old) throw new Error("Seller order not found");
    const r = await this.one(
        "SELECT COALESCE(SUM(subtotal),0) subtotal,COALESCE(SUM(discount),0) discount,COALESCE(SUM(shipping),0) shipping,COALESCE(SUM(tax),0) tax,COALESCE(SUM(commission),0) commission,COALESCE(SUM(total),0) total FROM (SELECT subtotal_price subtotal,item_discount_amount+coupon_discount_amount discount,shipping_price-shipping_discount_amount shipping,tax_amount tax,commission_amount commission,total_price total FROM order_items WHERE seller_order_id=? UNION ALL SELECT subtotal_price,discount_amount,shipping_price-shipping_discount_amount,tax_amount,commission_amount,total_price FROM custom_request_items WHERE seller_order_id=?)",
        [sellerOrderId, sellerOrderId],
      ),
      next = {
        subtotal: Number(r.subtotal),
        discount: Number(r.discount),
        shipping: Number(r.shipping),
        tax: Number(r.tax),
        commission: Number(r.commission),
        total: Number(r.total),
        payout: Math.max(0, Number(r.total) - Number(r.commission)),
      };
    await this.db.execute(
      "UPDATE seller_orders SET seller_subtotal=?,seller_discount_total=?,seller_shipping_total=?,seller_tax_total=?,seller_commission_total=?,seller_grand_total=?,seller_payout_total=?,updated_at=? WHERE id=?",
      [
        next.subtotal,
        next.discount,
        next.shipping,
        next.tax,
        next.commission,
        next.total,
        next.payout,
        now(),
        sellerOrderId,
      ],
    );
    if (
      old.seller_grand_total !== next.total ||
      old.seller_payout_total !== next.payout
    )
      await this.audit(
        old.order_id,
        "seller_order",
        sellerOrderId,
        "price_changed",
        actor,
        old.status,
        old.status,
        next,
      );
    return next;
  }
  async recalculateOrderPricing(
    orderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const rows = (await this.db.execute(
        "SELECT subtotal_price subtotal,item_discount_amount+coupon_discount_amount discount,shipping_price shipping,shipping_discount_amount shippingDiscount,tax_amount tax,service_fee_amount serviceFee,commission_amount platformFee,total_price total,paid_amount paid,refunded_amount refunded FROM order_items WHERE order_id=? UNION ALL SELECT subtotal_price,discount_amount,shipping_price,shipping_discount_amount,tax_amount,service_fee_amount,commission_amount,total_price,paid_amount,refunded_amount FROM custom_request_items WHERE order_id=?",
        [orderId, orderId],
      )) as any[],
      payments = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) n FROM payments WHERE order_id=? AND status IN ('partially_paid','fully_paid','refunded')",
            [orderId],
          )
        )?.n ?? 0,
      ),
      refunds = Number(
        (
          await this.one(
            "SELECT COALESCE(SUM(amount),0) n FROM refunds WHERE order_id=? AND status IN ('partially_refunded','fully_refunded')",
            [orderId],
          )
        )?.n ?? 0,
      ),
      p = calculateOrderPricing(
        rows.map((x) => ({ ...x, paid: 0, refunded: 0 })),
        Number(order.order_discount_total),
      );
    p.paid = payments;
    p.refunded = refunds;
    p.remaining = Math.max(0, p.grandTotal - payments + refunds);
    await this.db.execute(
      "UPDATE orders SET subtotal_price=?,items_discount_total=?,order_discount_total=?,shipping_total=?,shipping_discount_total=?,tax_total=?,service_fee_total=?,platform_fee_total=?,grand_total=?,paid_total=?,refunded_total=?,remaining_total=?,updated_at=? WHERE id=?",
      [
        p.subtotal,
        p.itemsDiscount,
        p.orderDiscount,
        p.shipping,
        p.shippingDiscount,
        p.tax,
        p.serviceFee,
        p.platformFee,
        p.grandTotal,
        p.paid,
        p.refunded,
        p.remaining,
        now(),
        orderId,
      ],
    );
    if (
      order.grand_total !== p.grandTotal ||
      order.paid_total !== p.paid ||
      order.refunded_total !== p.refunded
    )
      await this.audit(
        orderId,
        "order",
        orderId,
        "price_changed",
        actor,
        order.calculated_status,
        order.calculated_status,
        p,
      );
    return p;
  }
  async recalculateOrderStatus(
    orderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    const order = await this.one("SELECT * FROM orders WHERE id=?", [orderId]);
    if (!order) throw new Error("Order not found");
    const vals = async (sql: string, args: unknown[] = [orderId]) =>
        (await this.db.execute(sql, args)).map((x) => String(x.status)),
      aggregate: OrderAggregate = {
        id: order.id,
        buyerId: order.buyer_id,
        calculatedStatus: order.calculated_status,
        archivedAt: order.archived_at,
        closedAt: order.closed_at,
        itemStatuses: await vals(
          "SELECT status FROM order_items WHERE order_id=? UNION ALL SELECT status FROM custom_request_items WHERE order_id=?",
          [orderId, orderId],
        ),
        sellerStatuses: (await vals(
          "SELECT status FROM seller_orders WHERE order_id=?",
        )) as any,
        shipmentStatuses: (await vals(
          "SELECT status FROM shipments WHERE order_id=?",
        )) as any,
        paymentStatuses: (await vals(
          "SELECT status FROM payments WHERE order_id=?",
        )) as any,
        refundStatuses: (await vals(
          "SELECT status FROM refunds WHERE order_id=?",
        )) as any,
        cancellationStatuses: (await vals(
          "SELECT status FROM cancellations WHERE order_id=?",
        )) as any,
        returnStatuses: (await vals(
          "SELECT status FROM return_requests WHERE order_id=?",
        )) as any,
        replacementStatuses: (await vals(
          "SELECT status FROM replacement_requests WHERE order_id=?",
        )) as any,
      },
      status = calculateOrderStatus(aggregate);
    if (order.calculated_status !== status) {
      await this.db.execute(
        "UPDATE orders SET calculated_status=?,updated_at=? WHERE id=?",
        [status, now(), orderId],
      );
      await this.audit(
        orderId,
        "order",
        orderId,
        "status_changed",
        actor,
        order.calculated_status,
        status,
      );
    }
    return status;
  }
  private async recalculateAll(
    orderId: string,
    actor: Actor = { id: "system", role: "system" },
  ) {
    for (const x of await this.db.execute(
      "SELECT id FROM seller_orders WHERE order_id=?",
      [orderId],
    )) {
      await this.recalculateSellerOrderStatus(String(x.id), actor);
      await this.recalculateSellerOrderPricing(String(x.id), actor);
    }
    for (const x of await this.db.execute(
      "SELECT id FROM shipments WHERE order_id=?",
      [orderId],
    ))
      await this.recalculateShipmentStatus(String(x.id), actor);
    await this.recalculateOrderPricing(orderId, actor);
    await this.recalculateOrderStatus(orderId, actor);
  }
}
