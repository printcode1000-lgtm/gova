# Data Model and Database

## Aggregate tables

The migration creates `orders`, `seller_orders`, `order_items`, `custom_request_items`, `custom_request_images`, `shipments`, `shipment_items`, `payments`, `refunds`, `cancellations`, `cancellation_items`, `return_requests`, `return_request_items`, `replacement_requests`, `replacement_request_items`, `disputes`, `dispute_messages`, and `audit_trail`.

Foreign keys use cascading deletion only where the child has no independent meaning outside its parent. The migration enables SQLite foreign keys explicitly. Lookup indexes cover order number, buyer, seller, provider, carrier, status, product, tracking number, entity references, and creation time.

## Money and currency

All monetary columns use integer minor units. For EGP, `1250` represents EGP 12.50 when two minor digits are used. Application calculations reject negative values, unsafe integers, invalid quantities, over-deduction, and refunds larger than the unrefunded paid amount. Currency is stored on the order, payment, refund, and cancellation records.

## Referential constraints

`shipment_items` has a database check requiring exactly one matching item reference. Partial unique indexes prevent the same item from being assigned to two active shipments. Completed, rejected, failed, returned, or closed assignments no longer block a later return or replacement movement.

Custom image rows require a MIME type beginning with `image/`; the service applies a stricter supported-image allowlist. Status guard triggers reject unsupported status values on insert and update. Money checks reject negative persisted values.

## Development database

The default development file is `public/sync_data/sync_sqlite/marketplace_orders.db`. It is created lazily and receives the idempotent migration when the server database adapter starts. `MARKETPLACE_ORDERS_SQLITE_PATH` may select another local file.

## Production database

Production uses a dedicated libSQL/Turso connection:

```env
MARKETPLACE_ORDERS_DATABASE_URL=libsql://...
MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN=...
```

Apply `src/modules/marketplace-orders/db/migrations/0000_marketplace_orders.sql` to the production database during provisioning. Never place credentials in source files or client-visible environment values.

