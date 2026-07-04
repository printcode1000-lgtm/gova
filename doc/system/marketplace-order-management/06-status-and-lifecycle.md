# Status and Lifecycle

## Derived order status

The service calculates order status from catalog/custom items, seller orders, shipments, payments, refunds, cancellations, return requests, and replacement requests. Users and admins do not patch it directly. The repository rejects a `calculated_status` patch, and recalculation is the only supported write path.

Priority rules are:

1. archived or closed markers;
2. active return flow;
3. active replacement flow;
4. full or partial cancellation;
5. full or partial fulfilment;
6. waiting for pricing or seller response;
7. processing or new.

## Seller-order status

Seller status is derived from all items assigned to that seller/provider. Mixed acceptance produces `partially_accepted`; full terminal fulfilment produces `fully_fulfilled`; mixed terminal progress produces `partially_fulfilled`. Pricing and preparation phases are also derived.

## Shipment status

Shipment status is calculated from shipment items. It distinguishes waiting, partial/full carrier receipt, carrier rejection, transit, out-for-delivery, partial/full delivery, return, and terminal states.

## After-sales lifecycle

Returns and replacements are separate aggregates with their own item tables. Only delivered or delivery-rejected eligible items can start either flow. Seller approval/rejection is recorded independently. An active return or replacement influences the main calculated order status.

Disputes may reference an order, seller group, item, shipment, or return. Buyer, seller/provider, carrier, and admin replies produce role-specific statuses. Only an admin may issue the final administrative decision.

