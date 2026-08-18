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
