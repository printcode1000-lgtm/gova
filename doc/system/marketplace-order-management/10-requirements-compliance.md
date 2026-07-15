# Requirements Compliance Matrix

## Scope and architecture

| Requirement group | Implementation evidence |
|---|---|
| Product, custom, and mixed orders | Order type enums, creation services, item services, executable tests |
| Multiple sellers and providers | Seller-order grouping and seller/provider foreign context |
| Independent shipments | `shipments.order_id` plus polymorphic `shipment_items`; no shipment-to-seller parent relationship |
| Mixed and multi-seller shipments | Assignment services and multi-seller mixed shipment test |
| Isolated module | `src/modules/marketplace-orders` owns all order-system runtime code |
| Development and production databases | SQLite and Turso adapters, environment config, shared migration |

## Data and invariants

| Requirement group | Implementation evidence |
|---|---|
| Required entities | Migration creates all core and child tables, including messages and cancellation items |
| Product snapshots | Snapshot name, description, image, product, variant, quantity, and price columns |
| Images only | `StorageProfiles.SpicialOrder`, 500 KB client/server/database limits, storage-key persistence, image validator, and database MIME/profile checks |
| Integer money and currency | Money value object, integer columns, non-negative checks, explicit currency |
| Indexes and constraints | Lookup indexes, foreign keys, exclusive-item checks, status guards, active-assignment indexes |
| Automatic statuses | Dedicated order, seller-order, and shipment calculators invoked after mutations |

## Business capabilities

| Requirement group | Implementation evidence |
|---|---|
| Seller acceptance and pricing | Seller response and custom price-offer methods with buyer approval/expiry validation |
| Partial fulfilment and cancellation | Per-item states and aggregate calculators |
| Transport requirements | Item transport columns and automatic shipment roll-up |
| Payments and partial refunds | Independent payment/refund tables and ceiling validation |
| Returns and replacements | Separate request and request-item aggregates with eligibility checks |
| Disputes | Dispute/messages tables, role replies, admin resolution |
| Audit trail | Audit service called by important mutation paths with old/new state and actor metadata |
| Permissions | Actor role/ownership checks for buyer, seller/provider, carrier, and admin operations |

## Required service surface

Every service named in the source requirements is implemented by `MarketplaceOrderService` or the audit service. Repositories exist for Order, SellerOrder, both item types, images, shipments and shipment items, payments, refunds, cancellations, returns, replacements, disputes, and audit records.

## Verification status

The module passes TypeScript checking, Asol architecture validation, executable SQLite integration tests, the full project test command, and the Next.js production build. The module test emits the number of generated audit events as an additional assertion that important paths are recorded.
