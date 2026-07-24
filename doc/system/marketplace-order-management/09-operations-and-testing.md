# Operations, Configuration, and Testing

## Local setup

No production credentials are needed for development. The first server-side service construction creates the default SQLite file and applies the module migration. To isolate a test or developer database, set `MARKETPLACE_ORDERS_SQLITE_PATH` before starting the server.

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

The executable suites use in-memory SQLite databases with the production migration. They verify the complete table/column/service/enum contract, real foreign keys, integer-money guards, checks, triggers, indexes, service transitions, calculated totals/statuses, location-quote permissions and revisions, unified/hybrid provider ranking and scope isolation, competing offers, buyer-approved exactly-once shipping totals, route repricing, processing/payment gates, grouped shipment creation, both duplicate-assignment paths, image rejection, cross-order isolation, role permissions, and audit creation.

## Operational diagnostics

For an order incident, inspect the order row, its two item collections, seller
groups, active delivery plan and its stop/candidate/quote coverage, shipment
items and shipment states, payment/refund totals, active after-sales records,
then audit history ordered by creation time. Never repair a calculated status
or delivery price directly; use an audited domain operation and run
recalculation.

Back up the dedicated database according to the same recovery policy used for other Asol Turso databases. Audit history and financial records must be included in retention and recovery checks.
