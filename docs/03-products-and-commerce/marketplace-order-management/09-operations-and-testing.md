# Operations, Configuration, and Testing

## Local setup

The order tests need no credentials: they build an in-memory database from the production migrations through the marketplace test client, which is the only place in the repository that still opens a local database and is confined to `tests/`. Running the *application* against orders needs the nine Turso order-shard credentials, in Development as anywhere else.

## Production setup

1. Create a dedicated Turso/libSQL database.
2. Apply the module migration.
3. Configure the marketplace database URL and auth token in the server environment.
4. Run type checking, architecture validation, tests, and a production build.
5. Verify that the application identity can read/write the dedicated database.

## Verification commands

```text
npm run typecheck
npm run test:shipping-pricing
npm run test:delivery-planner
npm run test:marketplace-orders
npm test
npm run architecture:check
npm run build
```

The executable suites use isolated database test doubles with the production migration. They verify the complete table/column/service/enum contract, real foreign keys, integer-money guards, checks, triggers, indexes, service transitions, calculated totals/statuses, location-quote permissions and revisions, unified/hybrid provider ranking and scope isolation, competing offers, buyer-approved exactly-once shipping totals, route repricing, processing/payment gates, grouped shipment creation, both duplicate-assignment paths, image rejection, cross-order isolation, role permissions, and audit creation.

## Operational diagnostics

For an order incident, inspect the order row, its two item collections, seller
groups, active delivery plan and its stop/candidate/quote coverage, shipment
items and shipment states, payment/refund totals, active after-sales records,
then audit history ordered by creation time. Never repair a calculated status
or delivery price directly; use an audited domain operation and run
recalculation.

Back up the dedicated database according to the same recovery policy used for other Asol Turso databases. Audit history and financial records must be included in retention and recovery checks.

## Super-admin clear-all orders

The `/orders` page exposes `Clear all orders` only to the Super Admin. The button stages one `delete` operation in Page Save; it must never delete immediately. The header Page Save action executes `DELETE /api/super-admin/orders/clear`, and only a successful save empties the visible list. Discarding the staged operation leaves persistence unchanged.

The server command `deleteAllMarketplaceOrders()` owns the destructive database work. It deletes child tables before parent tables across the marketplace order shards, ending with `seller_orders` and `orders`, so no order-owned items, fulfillment, delivery-plan, payment/refund, after-sales, dispute, or audit rows remain. `delete-all-orders.test.ts` creates a real order in the isolated test database, executes the command, and asserts every table in the deletion contract is empty.
