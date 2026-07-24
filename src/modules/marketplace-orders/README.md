# Marketplace Order Management

An isolated server-side marketplace order domain for catalog, image-only custom, and mixed orders. It supports multiple sellers/service providers, unified and hybrid multi-seller delivery plans, independent shipments, buyer-approved location shipping quotes, minor-unit pricing, payments/refunds, partial cancellation and fulfilment, returns, replacements, disputes, permissions, and append-only audit history.

## Model

`Order` owns seller groupings and the two item sources of truth. `Shipment` belongs directly to the order—not a seller—and `ShipmentItem` references exactly one `OrderItem` or `CustomRequestItem`. This permits one seller across several shipments and one shipment across several sellers and item types. Partial unique indexes prevent an item from entering two active outbound assignments.

Custom requests require a description and at least one image uploaded through `StorageProfiles.SpicialOrder`. The dedicated profile stores processed WebP objects under `images/spicialOrder` in local development and R2 production storage, with a 500 KB maximum. Marketplace image records require the returned profile ID and image key. Catalog items retain name, description, image, variant and price snapshots. All money is an integer in the currency's minor unit and every order stores an explicit ISO currency.

Location-based shipping creates a versioned quote per seller order. The assigned seller or service provider proposes the base value, the buyer accepts or rejects it, and only acceptance writes the total quote into order pricing. Special-vehicle fees are included only when an item requires that transport, and remain independent from free base-shipping rules.

For a cart containing multiple sellers, the module can instead invite ranked
delivery providers to quote a single route or non-overlapping route groups.
Shipping remains zero until buyer-accepted quotes cover every active seller
stop. A unified route is charged once; a hybrid route is charged once per
accepted group. Cancellation that changes the route requires repricing, and the
buyer may return to the original separate-delivery arrangements.

## Database

Development lazily creates and migrates `public/sync_data/sync_sqlite/marketplace_orders.db`. `MARKETPLACE_ORDERS_SQLITE_PATH` can override it. Production uses a dedicated libSQL/Turso database through `MARKETPLACE_ORDERS_DATABASE_URL` and `MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN`; apply `db/migrations/0000_marketplace_orders.sql` during provisioning. Credentials are never embedded.

## Status, pricing, audit, and access

The service derives order, seller-order, and shipment statuses from their children. Repository callers cannot patch `orders.calculated_status`; only recalculation writes it. Pricing calculators use safe integers and reject negative/unsafe values. Transport flags roll up automatically from assigned items. Every service mutation emits actor-aware audit data, including old/new status or changed value. Buyers are scoped to their orders, sellers/providers to assigned items, carriers to assigned shipments, and admins can intervene with mandatory auditing.

Use `getMarketplaceOrderService()` from `api/server.ts` in authenticated server routes and pass the authenticated `{id, role}` actor. The server facade wraps every public operation in a database transaction. The exported service can instead receive a test database. `examples/flows.ts` demonstrates a mixed shipment; `npm run test:marketplace-orders` executes database-backed coverage of multi-seller/mixed/custom image orders, pricing offers, transport roll-up, duplicate-assignment rejection, partial/full delivery, payment, partial refund, return, dispute, permissions and audit creation.
