# Architecture

## Module boundaries

The module is organized into database, domain, repository, service, validator, calculator, audit, permission, API, test, and example areas. It owns a dedicated database and does not add order tables to the user, profile, product, or advertisement databases.

```text
Order
|- SellerOrder
|  |- OrderItem
|  `- CustomRequestItem
|     `- CustomRequestImage
|- Shipment
|  `- ShipmentItem -> OrderItem | CustomRequestItem
|- Payment
|- Refund
|- Cancellation
|- ReturnRequest
|- ReplacementRequest
|- Dispute
`- AuditTrail
```

`OrderItem` is the immutable commercial snapshot of a catalog selection. `CustomRequestItem` is the source of truth for a request described by the buyer and illustrated with images. `SellerOrder` groups commercial responsibility, while `Shipment` independently groups physical movement.

## Layer responsibilities

- `domain`: enums, entity contracts, shared types, and the minor-unit money value object.
- `db`: environment configuration, SQLite/Turso adapters, schema inventory, migration, and test adapter.
- `repositories`: CRUD access for every aggregate table and protected order-status updates.
- `services`: transactional business operations and lifecycle orchestration.
- `validators`: attachment, money, item-reference, eligibility, expiry, and ownership guards.
- `calculators`: pricing and derived order, seller-order, and shipment statuses.
- `permissions`: reusable buyer, seller/provider, carrier, and admin boundaries.
- `audit`: append operations for actor-aware audit records.
- `api`: server-only service composition for authenticated Gova server routes or actions.

## Integration rule

UI code must not instantiate a database client or import the server service. A Gova business route or server action authenticates the caller, constructs an `Actor`, obtains `getMarketplaceOrderService()`, invokes one business operation, and maps domain errors to an appropriate response. The server facade runs each public operation inside a database transaction so the domain mutation, derived totals/statuses, and audit records commit or roll back together.
