# Data Model and Database

## Aggregate tables

The migration creates `orders`, `seller_orders`, `order_items`, `custom_request_items`, `custom_request_images`, `shipments`, `shipment_items`, `shipping_quotes`, `delivery_plans`, `delivery_plan_stops`, `delivery_plan_candidates`, `delivery_plan_candidate_stops`, `delivery_plan_quotes`, `delivery_plan_quote_stops`, `delivery_plan_shipments`, `payments`, `refunds`, `cancellations`, `cancellation_items`, `return_requests`, `return_request_items`, `replacement_requests`, `replacement_request_items`, `disputes`, `dispute_messages`, and `audit_trail`.

Foreign keys use cascading deletion only where the child has no independent meaning outside its parent. The migration enables SQLite foreign keys explicitly. Lookup indexes cover order number, buyer, seller, provider, carrier, status, product, tracking number, entity references, and creation time.

## Money and currency

All monetary columns use integer minor units. For EGP, `1250` represents EGP 12.50 when two minor digits are used. Application calculations reject negative values, unsafe integers, invalid quantities, over-deduction, and refunds larger than the unrefunded paid amount. Currency is stored on the order, payment, refund, and cancellation records.

## Referential constraints

`shipment_items` has a database check requiring exactly one matching item reference. Partial unique indexes prevent the same item from being assigned to two active shipments. Completed, rejected, failed, returned, or closed assignments no longer block a later return or replacement movement.

Custom image rows require the dedicated `spicialOrder` storage profile, a non-empty storage key, an allowed image MIME type, and a processed size no greater than 500 KB. The stored profile ID and key keep deletion and URL resolution tied to the same local/R2 object. Status guard triggers reject unsupported status values on insert and update. Money checks reject negative or non-integer persisted values.

`shipping_quotes` keeps a versioned history per seller order. Partial unique indexes permit only one `pending_buyer` row and one `accepted` row. Base, special-vehicle, and total values use integer minor units and are guarded by database triggers.

`delivery_plans` coordinates unified, hybrid, or separate delivery for a
multi-seller order. Stop-scope join tables prevent a candidate or quote from
silently covering unauthorized sellers. A partial unique index permits one
pending quote per provider and plan; accepted partial quotes may coexist only
when service validation confirms their stop sets do not overlap. Plan shipment
links may contain one unified shipment or several hybrid group shipments.

## Development database

The default development file is `public/sync_data/sync_sqlite/marketplace_orders.db`. It is created lazily and receives the idempotent migration when the server database adapter starts. `MARKETPLACE_ORDERS_SQLITE_PATH` may select another local file.

## Production database

Production uses a dedicated libSQL/Turso connection:

```env
MARKETPLACE_ORDERS_DATABASE_URL=libsql://...
MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN=...
```

Apply `src/modules/marketplace-orders/db/migrations/0000_marketplace_orders.sql` to the production database during provisioning. Never place credentials in source files or client-visible environment values.
