# Unified Multi-Seller Delivery

## Goal

Multi-seller carts should not charge the buyer an unrelated delivery fee for
every seller when one delivery provider can collect the items in a single
route. The order system therefore creates a delivery plan for carts containing
more than one seller whenever at least one eligible delivery provider exists.

The feature supports three strategies:

- `unified`: one accepted quote covers every active seller pickup stop.
- `hybrid`: multiple non-overlapping accepted quotes together cover every
  active pickup stop.
- `separate`: the buyer explicitly returns to each seller's original delivery
  arrangement.

Single-seller carts and carts with no eligible delivery provider retain the
existing seller-by-seller shipping flow.

## Provider discovery and ranking

Eligible providers must have the delivery-provider specialty pair:

- main category `46`
- subcategory `132`

The planner invites at most 12 providers. Providers explicitly linked by a
seller are ranked first and may quote only the stops belonging to sellers who
linked them. Qualified network providers that are not linked to a participating
seller may quote the whole route. Each candidate and its allowed stop set is
snapshotted on the delivery plan so a later profile change cannot silently
expand an invitation.

## Plan and quote lifecycle

Order creation snapshots one pickup stop for each seller group, the original
seller delivery provider, and its already-confirmed fallback shipping price.
Candidates receive a deduplicated, high-priority notification linking to the
order.

Each invited provider can keep one pending quote at a time. Sending a new
revision supersedes the provider's earlier non-accepted quote. A quote contains
base delivery, optional handling, optional special-vehicle fee, its total, and
the exact stops it covers.

The buyer may:

- accept a complete route quote;
- accept non-overlapping partial quotes until their union covers all active
  stops;
- reject a pending quote; or
- select separate seller delivery when the fallback remains available.

Accepted quotes cannot overlap on a pickup stop. If accepted partial quotes do
not yet cover all active stops, the plan remains unresolved and no shipping
amount is charged.

## Pricing invariants

Shipping remains provisional at zero while the plan is collecting quotes,
waiting for the buyer, or waiting for repricing. The system applies shipping
only after accepted quote coverage equals all active pickup stops.

Each accepted quote group is charged exactly once, on one active item in its
covered scope. A unified plan therefore has one delivery charge; a hybrid plan
has one charge per accepted route group, not one charge per seller. A
special-vehicle fee may be included only when at least one item covered by that
quote requires a special vehicle, and it is charged once for that route group.

The cart may show the confirmed separate-delivery sum as a comparison, but this
reference value is not added to the payable order. A complete unified offer may
show its saving against that fallback. Location-based fallback fees that are
still unknown are never presented as confirmed savings.

Payment registration and seller processing are blocked while the plan is
unresolved.

## Fulfilment and route changes

An admin can create delivery-plan shipments only after every active item in the
covered order is `ready_for_shipping`.

- A unified plan creates one shipment for its accepted quote.
- A hybrid plan creates one shipment per accepted quote group.

Every group contains only the items whose seller pickup stop belongs to that
quote, and the accepted provider becomes the carrier for that shipment.
Seller-by-seller shipment creation is disabled while an active unified or
hybrid plan owns fulfilment.

If cancellation changes the active pickup route, existing pending or accepted
quotes are superseded, applied shipping is removed, and the plan becomes
`reprice_required`. The buyer cannot pay and sellers cannot continue processing
until the remaining route is quoted and accepted again. If every stop is
cancelled, the plan is cancelled.

## Privacy and access

The buyer and admins can inspect the full comparison. An invited provider sees
only:

- its own candidate record;
- pickup stops it is allowed to cover;
- seller groups and items for those stops;
- its own quotes.

A provider never receives competing providers, competing quote amounts, other
pickup stops, or the buyer's separate-delivery fallback price. Buyer decisions
and quote transitions remain audited.

## Persistence and notifications

Plans, stops, candidates, candidate-stop scope, quotes, quote-stop scope, and
plan shipment links are stored in the dedicated marketplace-orders database.
Push delivery is only a notification channel; the database remains the
authoritative order state. Client notification-center copies continue to use
AsolDB/IndexedDB according to the notification system's local-only retention
policy.

## Verification

`npm run test:delivery-planner` verifies candidate eligibility, ranking,
coverage, and fallback calculation. `npm run test:marketplace-orders` verifies
permissions, provider isolation, revisions, competing quotes, unified and
hybrid acceptance, exactly-once delivery fees, payment and processing gates,
special-vehicle rules, grouped shipments, separate fallback, cancellation, and
route repricing.
