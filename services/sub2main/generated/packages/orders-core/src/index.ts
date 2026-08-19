/**
 * `@asol/orders-core` — the order domain, held once.
 *
 * One door. Everything here is pure logic with no database, no filesystem, no network and no
 * node builtin: status derivation, minor-unit pricing, validators, permissions, the actor model,
 * and the snapshot rules. Persistence lives behind `@asol/data-core/marketplace-orders`, and the
 * two are deliberately separate — this package is what both the main app and the orders
 * deployment agree an order *means*, independent of where its rows are stored.
 */
export * from "./domain/enums";
export * from "./domain/types";
export * from "./domain/entities";
export * from "./domain/value-objects/money";
export * from "./domain/actor-from-input";
export * from "./domain/fulfillment-snapshot";
export * from "./domain/order-details-visibility";
export * from "./validators";
export * from "./permissions";
export * from "./calculators/pricing-calculator";
export * from "./calculators/status-calculators";
export * from "./calculators/seller-shipping-calculator";

export {
  configureOrdersCore,
  ordersIdentity,
  resetOrdersCorePorts,
  type OrdersIdentityPort,
} from "./ports";
