You are working inside the **Gova** project.

Create a complete, production-ready, independent **Marketplace Order Management Module** inside the project.

The module must be implemented as **one isolated module only**, with its own database schema, domain layer, repositories, services, validators, status calculators, audit logging, tests/examples, and README.

Do not modify unrelated existing features. Do not create temporary architecture. Do not partially implement the module. Build it as a real internal system that can support normal product orders, custom image-based orders, mixed orders, multi-seller marketplace flows, independent shipments, payments, refunds, cancellations, returns, replacements, disputes, and audit tracking.

---

# 1. Main Goal

Implement a full marketplace order system that supports:

1. Normal product orders.
2. Custom request orders without catalog products.
3. Mixed orders containing both catalog products and custom request items.
4. Multiple sellers in one order.
5. Multiple service providers in one order.
6. Independent shipments that are not tied to sellers.
7. One shipment containing items from one seller or many sellers.
8. One seller using one or many shipments.
9. One shipment containing normal product items and custom request items together.
10. Products or custom requests that may require a special transport vehicle.
11. Complete pricing support: product price, custom request price, discounts, shipping, shipping discounts, special vehicle fee, handling fee, insurance, taxes, service fees, platform commission, seller payout, grand total, paid amount, refunded amount, and remaining amount.
12. Partial seller acceptance.
13. Partial cancellation.
14. Partial shipping.
15. Partial delivery.
16. Partial refund.
17. Return requests.
18. Replacement requests.
19. Disputes.
20. Full audit trail for every important change.

---

# 2. Critical Design Rules

These rules are mandatory:

1. `Shipment` must be independent from `SellerOrder`.
2. Do not make shipments children of sellers.
3. `OrderItem` is the source of truth for normal catalog product items.
4. `CustomRequestItem` is the source of truth for custom image-based order items.
5. `ShipmentItem` must link a shipment to either:

   * an `OrderItem`, or
   * a `CustomRequestItem`.
6. The main `OrderStatus` must be calculated automatically.
7. The main order status must not be manually edited by users or admins.
8. Every important status change, price change, shipment change, admin change, cancellation, refund, return, replacement, or dispute action must be recorded in `AuditTrail`.
9. Monetary values must never use floating point numbers. Use integer minor units such as cents/piasters, or a safe decimal strategy already used in the project.
10. Currency must be stored explicitly.
11. Product snapshot data must be stored inside `OrderItem` so future catalog edits do not affect old orders.
12. Custom request orders must support images only. Do not support videos, PDFs, documents, or any other file types for custom request attachments.
13. The module must support both development and production database configuration.
14. The module must be isolated in one dedicated folder/module and must not be scattered randomly across the project.

---

# 3. Required Module Structure

Create a dedicated module folder similar to:

```text
src/modules/marketplace-orders/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   ├── dev/
│   ├── production/
│   └── indexes/
│
├── domain/
│   ├── entities/
│   ├── enums/
│   ├── value-objects/
│   └── types/
│
├── repositories/
│
├── services/
│
├── validators/
│
├── calculators/
│   ├── order-status-calculator
│   ├── seller-order-status-calculator
│   ├── shipment-status-calculator
│   └── pricing-calculator
│
├── audit/
│
├── permissions/
│
├── api/
│   └── server-actions-or-routes-based-on-current-project-style
│
├── tests/
│
├── examples/
│
├── README.md
└── index.ts
```

Adapt the exact paths to the existing Gova project structure, but keep the module isolated under one clear module.

---

# 4. Database Environments

Implement database support for both development and production.

Development:

```text
Use the existing local development database approach used by Gova.
If the project uses local SQLite for development, create or extend a dedicated local marketplace orders database/schema under the module.
Example:
public/sync_data/sync_sqlite/marketplace_orders.db
```

Production:

```text
Use the production database approach already used by Gova.
If the project uses Turso or environment variables, create a dedicated production database configuration for this module.

Required environment variables, if compatible with the current project style:

MARKETPLACE_ORDERS_DATABASE_URL
MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN

or equivalent names following the existing Gova naming style.
```

Do not hardcode production credentials.

Create the schema and migrations for both development and production usage.

---

# 5. Supported Order Types

Implement `OrderType` enum:

```text
product_order
custom_request_order
mixed_order
```

Meaning:

```text
product_order:
- contains normal catalog products only.
- uses OrderItem.

custom_request_order:
- contains no required catalog product.
- buyer sends a written description and one or more images only.
- examples: pharmacy request, supermarket request, service request, custom purchase request.
- uses CustomRequestItem.

mixed_order:
- contains both OrderItem and CustomRequestItem.
```

---

# 6. Core Entities / Tables

Create all required tables, columns, relationships, indexes, constraints, and migrations for the following entities.

## 6.1 Order

```text
orders
│
├── id
├── order_number
├── buyer_id
├── order_type
│   ├── product_order
│   ├── custom_request_order
│   └── mixed_order
│
├── delivery_address_id or delivery_address_snapshot_json
├── currency
├── notes
├── source
├── calculated_status
│
├── subtotal_price
├── items_discount_total
├── order_discount_total
├── shipping_total
├── shipping_discount_total
├── tax_total
├── service_fee_total
├── platform_fee_total
├── grand_total
├── paid_total
├── refunded_total
├── remaining_total
│
├── created_at
├── updated_at
├── closed_at
└── archived_at
```

Order status must be calculated, not manually edited.

Required calculated order statuses:

```text
new
waiting_for_seller_response
waiting_for_pricing
processing
partially_fulfilled
fully_fulfilled
partially_cancelled
fully_cancelled
waiting_for_return
waiting_for_replacement
closed
archived
```

---

## 6.2 SellerOrder

```text
seller_orders
│
├── id
├── order_id
├── seller_id
├── service_provider_id nullable
├── seller_order_type
│   ├── product_items
│   ├── custom_request
│   └── mixed
│
├── status
│
├── seller_subtotal
├── seller_discount_total
├── seller_shipping_total
├── seller_tax_total
├── seller_commission_total
├── seller_grand_total
├── seller_payout_total
│
├── created_at
├── updated_at
└── closed_at
```

Required seller order statuses:

```text
waiting_for_response
waiting_for_pricing
price_offer_sent
buyer_accepted_price
buyer_rejected_price
fully_accepted
partially_accepted
fully_rejected
preparing
ready_for_shipping
handed_to_shipping
partially_fulfilled
fully_fulfilled
cancelled
closed
```

---

## 6.3 OrderItem

This represents a normal catalog product inside an order.

```text
order_items
│
├── id
├── order_id
├── seller_order_id
├── seller_id
├── product_id
├── variant_id nullable
│
├── product_name_snapshot
├── product_description_snapshot
├── product_image_snapshot
├── quantity
│
├── requires_special_vehicle
├── required_vehicle_type nullable
├── weight nullable
├── dimensions_json nullable
├── fragile
├── requires_refrigeration
├── requires_special_loading
├── shipping_notes nullable
│
├── unit_price
├── subtotal_price
├── item_discount_amount
├── coupon_discount_amount
├── shipping_price
├── shipping_discount_amount
├── tax_amount
├── service_fee_amount
├── commission_amount
├── total_price
├── paid_amount
├── refunded_amount
├── remaining_amount
│
├── status
├── created_at
├── updated_at
└── closed_at
```

Required order item statuses:

```text
new
seller_accepted
seller_rejected
buyer_cancelled
admin_cancelled
preparing
ready_for_shipping
assigned_to_shipment
in_transit
delivered
delivery_rejected
return_requested
replacement_requested
returned
refunded
replaced
closed
```

---

## 6.4 CustomRequestItem

This represents a custom buyer request without a catalog product.

Examples:

```text
- pharmacy request
- supermarket request
- service request
- custom purchase request
- other image-based request
```

Important:

```text
Custom request attachments must be images only.
No videos.
No PDFs.
No documents.
No generic files.
```

Table:

```text
custom_request_items
│
├── id
├── order_id
├── seller_order_id
├── seller_id nullable
├── service_provider_id nullable
│
├── title
├── buyer_description
├── buyer_notes nullable
├── requested_quantity nullable
│
├── request_type
│   ├── pharmacy
│   ├── supermarket
│   ├── service
│   ├── custom_purchase
│   └── other
│
├── requires_seller_review_before_pricing
│
├── seller_accepted nullable
├── seller_notes nullable
├── seller_provided_description nullable
├── available_quantity nullable
├── suggested_alternatives_json nullable
├── requires_buyer_price_approval
├── price_offer_expires_at nullable
│
├── requires_special_vehicle
├── required_vehicle_type nullable
├── estimated_weight nullable
├── estimated_dimensions_json nullable
├── fragile
├── requires_refrigeration
├── requires_special_loading
├── shipping_notes nullable
│
├── estimated_price nullable
├── final_unit_price nullable
├── quantity nullable
├── subtotal_price
├── discount_amount
├── shipping_price
├── shipping_discount_amount
├── special_vehicle_fee
├── handling_fee
├── tax_amount
├── service_fee_amount
├── commission_amount
├── total_price
├── paid_amount
├── refunded_amount
├── remaining_amount
│
├── status
├── created_at
├── updated_at
└── closed_at
```

Required custom request item statuses:

```text
new
waiting_for_seller_response
waiting_for_pricing
price_offer_sent
buyer_accepted_price
buyer_rejected_price
seller_accepted
seller_rejected
buyer_cancelled
admin_cancelled
preparing
ready_for_shipping
assigned_to_shipment
in_transit
delivered
delivery_rejected
return_requested
replacement_requested
returned
refunded
replaced
closed
```

---

## 6.5 CustomRequestImage

Custom requests support images only.

```text
custom_request_images
│
├── id
├── custom_request_item_id
├── order_id
├── uploaded_by
├── image_url
├── image_key nullable
├── file_name nullable
├── file_size
├── mime_type
├── width nullable
├── height nullable
├── image_description nullable
├── created_at
└── updated_at
```

Validation requirements:

```text
Allowed MIME types only:
- image/jpeg
- image/png
- image/webp
- image/heic if supported by the project
- image/heif if supported by the project

Reject:
- video/*
- application/pdf
- application/msword
- application/vnd.*
- text/*
- application/zip
- any non-image type
```

---

## 6.6 Shipment

Shipment is independent from sellers.

```text
shipments
│
├── id
├── order_id
├── carrier_id nullable
├── carrier_company_name nullable
├── tracking_number nullable
├── shipping_method
├── pickup_address_snapshot_json
├── delivery_address_snapshot_json
├── expected_delivery_at nullable
│
├── contains_special_vehicle_items
├── required_vehicle_type nullable
├── total_weight nullable
├── dimensions_json nullable
├── requires_refrigeration
├── requires_special_loading
├── carrier_notes nullable
│
├── base_shipping_price
├── extra_handling_fee
├── special_vehicle_fee
├── insurance_fee
├── shipping_discount_amount
├── tax_amount
├── final_shipping_price
│
├── status
├── created_at
├── updated_at
└── closed_at
```

Required shipment statuses:

```text
waiting_for_carrier_pickup
partially_received_by_carrier
partially_rejected_by_carrier
fully_received_by_carrier
in_transit
arrived_at_distribution_center
out_for_delivery
partially_delivered
fully_delivered
customer_rejected_delivery
delivery_failed
returned
closed
```

---

## 6.7 ShipmentItem

This links shipments to either normal product items or custom request items.

```text
shipment_items
│
├── id
├── shipment_id
├── order_id
├── seller_order_id
├── seller_id nullable
├── service_provider_id nullable
│
├── item_type
│   ├── order_item
│   └── custom_request_item
│
├── order_item_id nullable
├── custom_request_item_id nullable
├── quantity
├── status
├── carrier_received_at nullable
├── delivered_at nullable
├── notes nullable
├── created_at
└── updated_at
```

Rules:

```text
- If item_type = order_item, order_item_id is required and custom_request_item_id must be null.
- If item_type = custom_request_item, custom_request_item_id is required and order_item_id must be null.
- An item cannot be assigned to more than one active outbound shipment at the same time.
- An item may later appear in a return shipment or replacement shipment if such shipment direction/type is added.
```

Add a constraint or service-level validation to prevent the same active item from being assigned to multiple active outbound shipments.

---

## 6.8 Payment

```text
payments
│
├── id
├── order_id
├── buyer_id
├── payment_method
│   ├── electronic_payment
│   ├── cash_on_delivery
│   ├── wallet
│   └── bank_transfer
│
├── amount
├── currency
├── status
├── provider nullable
├── provider_transaction_id nullable
├── transaction_data_json nullable
├── paid_at nullable
├── created_at
└── updated_at
```

Required payment statuses:

```text
pending
partially_paid
fully_paid
failed
cancelled
refunded
```

---

## 6.9 Refund

Refund must be an independent entity.

```text
refunds
│
├── id
├── order_id
├── payment_id nullable
├── order_item_id nullable
├── custom_request_item_id nullable
├── return_request_id nullable
├── amount
├── currency
├── reason
├── status
├── executed_at nullable
├── created_at
└── updated_at
```

Required refund statuses:

```text
requested
under_review
accepted
rejected
partially_refunded
fully_refunded
```

---

## 6.10 Cancellation

Cancellation must be an independent entity.

```text
cancellations
│
├── id
├── order_id
├── seller_order_id nullable
├── order_item_id nullable
├── custom_request_item_id nullable
├── cancelled_by
├── cancelled_by_role
├── reason
├── affected_amount
├── currency
├── requires_refund
├── status
├── created_at
└── updated_at
```

Cancellation must support:

```text
- full order cancellation
- full seller order cancellation
- single normal item cancellation
- single custom request item cancellation
- multiple item cancellation through related cancellation items table if needed
```

Required cancellation statuses:

```text
requested
accepted
rejected
executed
```

If needed, create:

```text
cancellation_items
│
├── id
├── cancellation_id
├── order_item_id nullable
├── custom_request_item_id nullable
├── amount
└── created_at
```

---

## 6.11 ReturnRequest

Return request must support both normal product items and custom request items.

```text
return_requests
│
├── id
├── order_id
├── buyer_id
├── seller_order_id nullable
├── reason
├── seller_approved nullable
├── seller_rejection_reason nullable
├── carrier_id nullable
├── return_shipment_id nullable
├── inspection_status nullable
├── inspection_notes nullable
├── refund_id nullable
├── status
├── created_at
├── updated_at
└── closed_at
```

Create return request items table:

```text
return_request_items
│
├── id
├── return_request_id
├── item_type
│   ├── order_item
│   └── custom_request_item
│
├── order_item_id nullable
├── custom_request_item_id nullable
├── quantity
├── reason nullable
├── created_at
└── updated_at
```

Required return statuses:

```text
requested
seller_approved
seller_rejected
waiting_for_pickup
picked_up
received
under_inspection
inspection_accepted
inspection_rejected
refund_pending
refunded
closed
```

---

## 6.12 ReplacementRequest

Replacement request must be separate from return request.

```text
replacement_requests
│
├── id
├── order_id
├── buyer_id
├── seller_order_id nullable
├── reason
├── seller_approved nullable
├── seller_rejection_reason nullable
├── return_shipment_id nullable
├── replacement_shipment_id nullable
├── status
├── created_at
├── updated_at
└── closed_at
```

Create replacement request items table:

```text
replacement_request_items
│
├── id
├── replacement_request_id
├── old_item_type
│   ├── order_item
│   └── custom_request_item
│
├── old_order_item_id nullable
├── old_custom_request_item_id nullable
├── replacement_description nullable
├── replacement_product_id nullable
├── replacement_variant_id nullable
├── quantity
├── created_at
└── updated_at
```

Required replacement statuses:

```text
requested
accepted
rejected
waiting_for_return
return_in_transit
replacement_preparing
replacement_in_transit
replaced
closed
```

---

## 6.13 Dispute

```text
disputes
│
├── id
├── order_id
├── seller_order_id nullable
├── order_item_id nullable
├── custom_request_item_id nullable
├── shipment_id nullable
├── return_request_id nullable
├── opened_by
├── opened_by_role
├── reason
├── status
├── admin_decision nullable
├── closed_at nullable
├── created_at
└── updated_at
```

Required dispute statuses:

```text
opened
buyer_replied
seller_replied
carrier_replied
admin_intervened
admin_decision_issued
closed
```

Optional but recommended:

```text
dispute_messages
│
├── id
├── dispute_id
├── sender_id
├── sender_role
├── message
├── created_at
└── updated_at
```

---

## 6.14 AuditTrail

Audit trail is mandatory.

```text
audit_trail
│
├── id
├── order_id
├── entity_type
├── entity_id
├── action
├── old_status nullable
├── new_status nullable
├── old_value_json nullable
├── new_value_json nullable
├── performed_by
├── performed_by_role
├── reason nullable
├── source nullable
├── ip_address nullable
├── notes nullable
├── created_at
└── updated_at
```

Audit must record at least:

```text
- order created
- product item added
- custom request item created
- custom request image uploaded
- seller response
- seller acceptance
- seller rejection
- seller price offer sent
- buyer price approval
- buyer price rejection
- buyer cancellation
- admin cancellation
- shipment created
- item assigned to shipment
- carrier received item
- carrier rejected item
- tracking update
- delivery
- delivery rejection
- payment created
- payment status changed
- refund requested
- refund executed
- return requested
- replacement requested
- dispute opened
- dispute replied
- admin decision
- admin change
- price changed
- shipping fee changed
- any status transition
```

---

# 7. Required Enums

Implement separate enums. Do not use one generic status enum.

Required enums:

```text
OrderType
SellerOrderType
CustomRequestType
OrderStatus
SellerOrderStatus
OrderItemStatus
CustomRequestItemStatus
ShipmentStatus
ShipmentItemStatus
PaymentMethod
PaymentStatus
RefundStatus
CancellationStatus
ReturnStatus
ReplacementStatus
DisputeStatus
ActorRole
AuditAction
ShipmentItemType
```

---

# 8. Pricing Requirements

Implement pricing support at all relevant levels:

## Order level

```text
subtotal_price
items_discount_total
order_discount_total
shipping_total
shipping_discount_total
tax_total
service_fee_total
platform_fee_total
grand_total
paid_total
refunded_total
remaining_total
```

## SellerOrder level

```text
seller_subtotal
seller_discount_total
seller_shipping_total
seller_tax_total
seller_commission_total
seller_grand_total
seller_payout_total
```

## OrderItem level

```text
unit_price
quantity
subtotal_price
item_discount_amount
coupon_discount_amount
shipping_price
shipping_discount_amount
tax_amount
service_fee_amount
commission_amount
total_price
paid_amount
refunded_amount
remaining_amount
```

## CustomRequestItem level

```text
estimated_price
final_unit_price
quantity
subtotal_price
discount_amount
shipping_price
shipping_discount_amount
special_vehicle_fee
handling_fee
tax_amount
service_fee_amount
commission_amount
total_price
paid_amount
refunded_amount
remaining_amount
```

## Shipment level

```text
base_shipping_price
extra_handling_fee
special_vehicle_fee
insurance_fee
shipping_discount_amount
tax_amount
final_shipping_price
```

All money fields must be safe for currency. Do not use JavaScript floating point calculations for money.

---

# 9. Transport Requirements

Both `OrderItem` and `CustomRequestItem` must support:

```text
requires_special_vehicle
required_vehicle_type
weight or estimated_weight
dimensions_json or estimated_dimensions_json
fragile
requires_refrigeration
requires_special_loading
shipping_notes
```

`Shipment` must support:

```text
contains_special_vehicle_items
required_vehicle_type
total_weight
dimensions_json
requires_refrigeration
requires_special_loading
carrier_notes
```

Rules:

```text
- If any assigned item requires a special vehicle, shipment.contains_special_vehicle_items must become true.
- If any assigned item requires refrigeration, shipment.requires_refrigeration must become true.
- If any assigned item requires special loading, shipment.requires_special_loading must become true.
- Special vehicle fee must be supported in shipment pricing.
```

---

# 10. Services To Implement

Create service functions for at least:

```text
createProductOrder
createCustomRequestOrder
createMixedOrder
addOrderItem
addCustomRequestItem
addCustomRequestImage
sellerAcceptItem
sellerRejectItem
sellerAcceptCustomRequest
sellerRejectCustomRequest
sellerSendPriceOfferForCustomRequest
buyerAcceptCustomRequestPrice
buyerRejectCustomRequestPrice
cancelFullOrder
cancelSellerOrder
cancelOrderItem
cancelCustomRequestItem
createShipment
assignOrderItemToShipment
assignCustomRequestItemToShipment
carrierReceiveShipmentItem
carrierRejectShipmentItem
markShipmentInTransit
markShipmentOutForDelivery
markShipmentItemDelivered
markShipmentPartiallyDelivered
markShipmentFullyDelivered
registerPayment
markPaymentFailed
createRefund
executeRefund
createReturnRequest
approveReturnRequest
rejectReturnRequest
createReplacementRequest
approveReplacementRequest
rejectReplacementRequest
openDispute
replyToDispute
adminResolveDispute
writeAuditLog
recalculateOrderPricing
recalculateSellerOrderPricing
recalculateShipmentPricing
recalculateOrderStatus
recalculateSellerOrderStatus
```

---

# 11. Validators

Create validators to prevent invalid actions.

Required validations:

```text
- Cannot manually edit calculated order status.
- Cannot assign the same active OrderItem to more than one active outbound shipment.
- Cannot assign the same active CustomRequestItem to more than one active outbound shipment.
- Cannot ship rejected items.
- Cannot ship cancelled items.
- Cannot deliver items that are not in transit or out for delivery.
- Cannot refund more than paid amount.
- Cannot cancel already delivered closed items unless return flow is used.
- Cannot create replacement for an item that is not delivered or eligible.
- Cannot create return for an item that is not delivered or eligible.
- Cannot accept a custom request price after price_offer_expires_at.
- Cannot attach non-image files to custom request items.
- Cannot attach video/PDF/document/archive/text files to custom request items.
- Cannot let seller access another seller's items.
- Cannot let carrier access unassigned shipments.
- Cannot let buyer access another buyer's order.
- Admin changes must always create audit trail entries.
```

---

# 12. Status Calculators

Implement status calculators for:

```text
OrderStatus
SellerOrderStatus
ShipmentStatus
```

Order status must be derived from:

```text
- OrderItem statuses
- CustomRequestItem statuses
- SellerOrder statuses
- Shipment statuses
- Payment statuses
- Refund statuses
- Cancellation statuses
- ReturnRequest statuses
- ReplacementRequest statuses
```

Seller order status must be derived from:

```text
- OrderItem statuses for that seller
- CustomRequestItem statuses for that seller/service provider
- shipment progress of that seller's items
- cancellation/refund/return/replacement state
```

Shipment status must be derived from:

```text
- ShipmentItem statuses
- carrier receiving progress
- delivery progress
```

---

# 13. Repositories

Create repository functions for CRUD and queries for:

```text
OrderRepository
SellerOrderRepository
OrderItemRepository
CustomRequestItemRepository
CustomRequestImageRepository
ShipmentRepository
ShipmentItemRepository
PaymentRepository
RefundRepository
CancellationRepository
ReturnRequestRepository
ReplacementRequestRepository
DisputeRepository
AuditTrailRepository
```

Each repository should follow the current Gova coding style.

---

# 14. Permissions

Implement permission boundaries:

```text
buyer:
- can see only their own orders
- can create product/custom/mixed orders
- can cancel eligible orders/items
- can approve or reject custom request price offers
- can request return/replacement
- can open disputes

seller:
- can see only their own SellerOrders, OrderItems, and CustomRequestItems
- can accept/reject their own items
- can send price offers for their custom requests
- can prepare items
- cannot see unrelated sellers' data

service_provider:
- can see only custom request items assigned to them
- can accept/reject custom requests
- can send price offers

carrier:
- can see only assigned shipments
- can update shipment receiving, transit, delivery, rejection, and failure statuses

admin:
- can see everything
- can intervene in disputes
- can perform administrative changes
- every admin change must be audited
```

---

# 15. Indexes And Constraints

Add indexes for:

```text
orders.order_number
orders.buyer_id
orders.order_type
orders.calculated_status
orders.created_at

seller_orders.order_id
seller_orders.seller_id
seller_orders.service_provider_id
seller_orders.status

order_items.order_id
order_items.seller_order_id
order_items.seller_id
order_items.product_id
order_items.status
order_items.created_at

custom_request_items.order_id
custom_request_items.seller_order_id
custom_request_items.seller_id
custom_request_items.service_provider_id
custom_request_items.request_type
custom_request_items.status
custom_request_items.created_at

custom_request_images.custom_request_item_id
custom_request_images.order_id

shipments.order_id
shipments.carrier_id
shipments.status
shipments.tracking_number
shipments.created_at

shipment_items.shipment_id
shipment_items.order_id
shipment_items.seller_order_id
shipment_items.order_item_id
shipment_items.custom_request_item_id
shipment_items.item_type
shipment_items.status

payments.order_id
payments.buyer_id
payments.status

refunds.order_id
refunds.payment_id
refunds.status

cancellations.order_id
cancellations.seller_order_id
cancellations.status

return_requests.order_id
return_requests.buyer_id
return_requests.status

replacement_requests.order_id
replacement_requests.buyer_id
replacement_requests.status

disputes.order_id
disputes.status

audit_trail.order_id
audit_trail.entity_type
audit_trail.entity_id
audit_trail.performed_by
audit_trail.created_at
```

Constraints:

```text
- foreign keys where applicable
- valid enum values
- required currency for money fields
- non-negative money values unless a field explicitly allows negative adjustment
- shipment_items must reference exactly one item type
- custom_request_images must allow image MIME types only
- prevent duplicate active shipment assignment for the same item
```

---

# 16. Tests / Examples

Add tests or executable examples that cover:

```text
1. Product order with one seller.
2. Product order with multiple sellers.
3. Custom request order for pharmacy using buyer description and images only.
4. Custom request order for supermarket using buyer description and images only.
5. Custom request order for service provider using buyer description and images only.
6. Mixed order containing normal products and custom request items.
7. One shipment containing items from multiple sellers.
8. One shipment containing normal OrderItem and CustomRequestItem together.
9. One seller using multiple shipments.
10. Custom request price offer sent by seller.
11. Buyer accepts custom request price offer.
12. Buyer rejects custom request price offer.
13. Item requiring special vehicle.
14. Shipment automatically marked as containing special vehicle items.
15. Partial seller acceptance.
16. Partial seller rejection.
17. Partial cancellation.
18. Partial delivery.
19. Payment registration.
20. Partial refund.
21. Return request.
22. Replacement request.
23. Dispute opened and resolved by admin.
24. Audit trail entries for every important action.
25. Validation rejects non-image custom request attachment.
26. Validation rejects assigning one active item to two active outbound shipments.
```

---

# 17. README

Create a concise README inside the module explaining:

```text
- module purpose
- supported order types
- entity relationships
- database setup for development
- database setup for production
- how shipments work independently from sellers
- how custom image-based requests work
- pricing model
- status calculation model
- audit trail model
- permission model
- example flows
```

---

# 18. Final Expected Architecture Summary

The final system must match this structure:

```text
Order
│
├── SellerOrder
│   │
│   ├── OrderItem
│   │   └── normal catalog product snapshot
│   │
│   └── CustomRequestItem
│       └── CustomRequestImage only
│
├── Shipment
│   └── ShipmentItem
│       ├── OrderItem
│       └── CustomRequestItem
│
├── Payment
├── Refund
├── Cancellation
├── ReturnRequest
├── ReplacementRequest
├── Dispute
└── AuditTrail
```

The module must support:

```text
- normal product orders
- custom image-based orders
- mixed orders
- pharmacy requests
- supermarket requests
- service provider requests
- custom purchase requests
- multiple sellers
- multiple service providers
- multiple carriers
- independent shipments
- shipment from one or many sellers
- item-level pricing
- custom request pricing after seller review
- buyer approval or rejection of custom request price
- product discounts
- order discounts
- shipping fees
- shipping discounts
- special vehicle fees
- handling fees
- insurance fees
- taxes
- service fees
- platform commission
- seller payout
- paid/refunded/remaining totals
- cancellation
- return
- replacement
- refund
- dispute
- full audit trail
```

Important final instruction:

Implement this as a complete and isolated module inside Gova. Do not remove unrelated code. Do not rewrite unrelated architecture. Do not leave TODO-only stubs. Add real schema, real migrations, real types, real repositories, real services, real validators, real calculators, real audit logging, and tests or executable examples.
