# Marketplace Order Management System

This documentation describes Gova's isolated marketplace order module. The module supports catalog orders, image-based custom requests, mixed orders, multiple sellers and service providers, independent multi-party shipments, payments, refunds, cancellation, returns, replacements, disputes, calculated statuses, and audit history.

## Documentation map

- [Architecture](./01-architecture.md)
- [Data model and database](./02-data-model-and-database.md)
- [Order creation and item flows](./03-order-and-item-flows.md)
- [Shipment and transport flows](./04-shipments-and-transport.md)
- [Pricing, payments, and refunds](./05-pricing-payments-and-refunds.md)
- [Status calculation and lifecycle](./06-status-and-lifecycle.md)
- [Permissions, validation, and audit](./07-permissions-validation-and-audit.md)
- [Service API reference](./08-service-api-reference.md)
- [Operations, configuration, and testing](./09-operations-and-testing.md)
- [Requirements compliance matrix](./10-requirements-compliance.md)

## Source location

The implementation is isolated under `src/modules/marketplace-orders`. Consumers should import public domain types and calculators from the module barrel, and server code should obtain the service through `api/server.ts`.

## Core invariants

1. A shipment belongs to an order and is never a child of a seller order.
2. A shipment item references exactly one catalog item or one custom request item.
3. The order status is calculated and cannot be patched through the order repository.
4. Monetary values are non-negative safe integers in currency minor units.
5. Every order stores an explicit three-letter currency code.
6. Custom request attachments are images only.
7. Important mutations produce audit records with actor identity and role.

