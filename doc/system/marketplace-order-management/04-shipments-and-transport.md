# Shipments and Transport

## Independent shipment design

A shipment references an order, not a seller order. Each shipment item keeps seller and provider context for reporting, but the shipment may contain items from one seller, several sellers, catalog items, custom request items, or any valid combination. One seller may contribute different items to multiple shipments.

Shipment directions are `outbound`, `return`, and `replacement`.

## Assignment

Create a shipment with `createShipment`, then call `assignOrderItemToShipment` or `assignCustomRequestItemToShipment`. Assignment validates order consistency, positive quantity, exact item type/reference matching, eligibility, and active duplicate assignment.

Rejected, cancelled, delivered, returned, refunded, or closed items cannot enter a new normal outbound assignment. Database uniqueness also protects against concurrent duplicate assignment attempts.

## Transport roll-up

After each assignment, the service recalculates shipment transport requirements from all assigned items:

- any special-vehicle item sets `contains_special_vehicle_items`;
- any refrigerated item sets `requires_refrigeration`;
- any special-loading item sets `requires_special_loading`;
- weight is summed when available;
- a required vehicle type is propagated;
- special-vehicle and handling fees remain part of shipment pricing.

## Carrier lifecycle

Only the assigned carrier or an admin may perform carrier updates. The supported operations receive or reject shipment items, move items through transit, distribution-center, and out-for-delivery states, and record delivery, delivery rejection, or delivery failure. Tracking changes are audited. Delivery is rejected unless the item has entered the delivery lifecycle. Shipment status is derived from all shipment-item statuses, enabling partial receipt and partial delivery.
