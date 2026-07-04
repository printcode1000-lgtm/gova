# Permissions, Validation, and Audit

## Actor model

Every mutation receives an authenticated actor containing an ID and role. Roles are `buyer`, `seller`, `service_provider`, `carrier`, `admin`, and `system`. Optional source and IP address values are copied to audit records.

## Permission boundaries

- Buyers create and access their own orders, decide custom prices, cancel eligible items, request returns/replacements, and open disputes.
- Sellers access only their seller groups and items and may respond or price their own work.
- Service providers access only assigned custom requests.
- Carriers update only shipments assigned to their carrier ID.
- Admins may access and intervene across the system, but their mutations remain audited.

Server routes must authenticate before constructing an actor. Never accept role or actor ID directly from an untrusted request body.

## Validation rules

The module validates safe money and currency, positive quantities, custom image MIME types, the `spicialOrder` storage profile and key, the 500 KB image limit, price expiry, exact shipment item references, shipment eligibility, duplicate active assignment, delivery sequence, refund ceilings, cancellation eligibility, return/replacement eligibility, and actor ownership.

The database repeats critical structural protections with foreign keys, checks, partial unique indexes, and status guard triggers. This protects data even when concurrent operations race.

## Audit model

Audit records include order, entity type and ID, action, old/new status, old/new serialized values, actor ID and role, reason, source, IP address, notes, and timestamps. Creation, response, pricing, approval/rejection, cancellation, shipment assignment/progress, payment, refund, return, replacement, dispute reply, and admin decision operations are audited.

Audit history should be treated as append-only operational evidence. Application code must not update or delete historical audit rows.
