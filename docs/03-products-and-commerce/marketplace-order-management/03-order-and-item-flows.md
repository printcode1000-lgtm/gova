# Order and Item Flows

## Supported order types

- `product_order`: catalog items only.
- `custom_request_order`: custom image-based request items only.
- `mixed_order`: both item types.

The service prevents adding an incompatible item type to a product-only or custom-only order.

## Cart submission buyer contact

`POST /api/orders/from-cart` and `POST /api/orders/custom-request-from-profile`
require a buyer phone but not a saved delivery address.

Phone resolution order:

1. First profile contact phone.
2. Session phone from the request body.
3. Auth account phone from the users database.

When the buyer has no saved location, the delivery snapshot stores an empty
address and null coordinates. Location-based shipping quotes can still be
requested later from the order details page.

Cart submission does not require the seller to have a linked delivery carrier.
When a carrier exists in fulfillment settings it is assigned automatically;
otherwise `service_provider_id` stays null until delivery is arranged later
(same behaviour as profile-origin custom requests).

On successful submission, the route issues signed `order.received` notification
grants for every seller in the cart. The buyer's client delivers those grants
through the notification bridge so each seller is notified on their own devices.

When a seller order has no `service_provider_id`, the seller sees a link to
`/profile?mode=edit&tab=fulfillment` (with `returnTo` back to the order) and can
call `seller_assign_delivery_carrier` after linking a provider in profile
fulfillment settings. The action copies the chosen carrier onto the seller order
and its items.

While the seller order is still open, the seller order card also shows links to
`/profile?mode=edit&tab=fulfillment&section=shipping` and
`section=returns` (each with `returnTo` back to the order) so shipping pricing
and return policy can be edited in place. Saving fulfillment settings from
profile propagates those changes to active orders and re-runs the same shipping
reprice path used at order creation when the seller order is not yet locked.

## Natural-path snapshots

Late changes (buyer address, carrier link, fulfillment edits) must behave as if
the data existed at order creation — not as a one-off patch on top of stale UI.

| Data | Snapshot column | Natural-path rule |
|------|-----------------|-------------------|
| Buyer delivery | `orders.delivery_address_snapshot_json` | Written on create when available; `buyer_apply_delivery_address` overwrites the snapshot and re-bootstraps location quotes. UI reads the snapshot, not the live buyer profile. |
| Seller shipping/returns | `seller_orders.fulfillment_snapshot_json` | Stamped on cart/custom-request create and on profile fulfillment save (`syncSellerFulfillmentToOpenOrders`). Order cards display this snapshot; profile edits update open orders then reprice. |
| Carrier | `seller_orders.service_provider_id` + item `shipping_notes` | Assigned at create when configured; `seller_assign_delivery_carrier` copies the chosen provider and may request location quotes when an address snapshot exists. |

Order-related notifications dispatch `asol:orders:data-refresh` so open order
list and detail pages reload party-visible data after any notified change.

Every order mutation route issues signed notification grants to the other
parties (never the actor). Recipient lists are built from the full order party
set — buyer, every seller, every linked service provider, shipment carriers, and
delivery-plan candidates — then filtered with `excludeActorFromPartyUids` so the
user who performed the action does not receive a duplicate notification on their
own device. Dedicated shipping-quote and delivery-plan grants use the same
party resolution. Templates live in
`packages/notifications-core/src/config/templates/` with expressive emoji
prefixes in titles. Coverage includes item accept/reject, custom pricing,
cancellations, returns, shipment progress, shipping quotes, delivery plans,
address/carrier linking, fulfillment sync, and order creation acknowledgements.

## Catalog order flow

1. Call `createProductOrder` with currency, delivery snapshot, and the authenticated buyer actor.
2. Call `addOrderItem` for each catalog selection.
3. Supply the product ID, optional variant ID, seller ID, quantity, unit price, and product name/description/image snapshots.
4. The service creates or reuses the seller grouping, calculates item totals, writes the item, audits creation, and recalculates aggregate pricing and statuses.
5. The owning seller calls `sellerAcceptItem` or `sellerRejectItem`.

## Custom request flow

1. Call `createCustomRequestOrder` or create a mixed order.
2. Call `addCustomRequestItem` with a title, buyer description, request type, and assigned seller or service provider.
3. Optionally upload up to the UI-defined image limit through `StorageImageManager` using `StorageProfiles.SpicialOrder`, then register the returned `imageKey`, URL, MIME type, and processed byte size with `addCustomRequestImage`. Video, PDF, document, archive, text, wrong-profile, missing-key, and over-500-KB inputs are rejected. A profile-origin custom request may be sent with description text only.
4. A profile-origin custom request does not require the seller to have a delivery carrier configured. When a carrier exists it is assigned automatically; otherwise `service_provider_id` remains null until delivery is arranged later.
5. The assigned seller/provider accepts or rejects the request.
6. For an accepted request, the seller sends a priced offer with quantity, unit price, fees, and optional expiry.
7. The buyer accepts or rejects the offer. Acceptance after expiry is rejected.

Request types are `pharmacy`, `supermarket`, `service`, `custom_purchase`, and `other`. The same flow serves each type; catalog products are not required.

## Partial acceptance and cancellation

Item status is independent. A seller may accept some items and reject others, producing a calculated partially accepted seller order. Buyers or admins may cancel an eligible item, seller group, or full order. Delivered or closed items must use return or replacement flows instead of cancellation.

## Multi-seller delivery planning

When cart submission creates more than one seller group and finds an eligible
delivery provider, it snapshots seller pickup stops and opens one delivery plan.
The buyer can choose one full-route offer, combine non-overlapping partial
offers, or return to separate seller delivery. Item cancellation that changes
the active stop set invalidates the previous route price and requires a new
buyer-approved quote.
