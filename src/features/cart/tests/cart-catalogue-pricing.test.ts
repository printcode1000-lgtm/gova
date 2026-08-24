import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guards the rule that the catalogue — not the request — sets the price.
 *
 * Before this, `/api/orders/from-cart` took `unitPriceMinor` straight from the
 * body. The only check was `moneyMinor`, which asserts a non-negative integer
 * and nothing about *which product* it belongs to, so a modified client could
 * order a 10,000 EGP item for 1 EGP and rely on the seller not noticing.
 *
 * This is a source contract rather than a live call: the route needs a buyer
 * profile, seller fulfilment settings, and a marketplace database, none of which
 * belong in a unit test. What must not regress is the *shape* — that the route
 * overwrites the client's values before anything reads them.
 */

const root = process.cwd();

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

const route = stripComments(
  readFileSync(path.join(root, "src/app/api/orders/from-cart/route.ts"), "utf8"),
);

// ── The route must resolve prices from the catalogue ─────────────────────────

assert.match(
  route,
  /resolveCartPrices\s*\(/,
  "from-cart must resolve prices from the catalogue; without it the client sets its own price.",
);

// ── …and must overwrite the client's values, not merely read them ────────────

for (const field of ["unitPriceMinor", "sellerId", "name", "requiresSpecialVehicle"]) {
  assert.match(
    route,
    new RegExp(`${field}:\\s*authoritative\\.${field}`),
    `from-cart must overwrite ${field} with the catalogue value.`,
  );
}

// ── The overwrite must happen before any total is computed ───────────────────

const resolveAt = route.indexOf("resolveCartPrices");
const discountAt = route.indexOf("quoteCart");
const deliveryAt = route.indexOf("createMultiSellerDeliveryDraft");
assert.ok(
  resolveAt > -1 && resolveAt < discountAt && resolveAt < deliveryAt,
  "Prices must be resolved before discounts and delivery are calculated, or those run on client numbers.",
);

// ── The resolver itself ──────────────────────────────────────────────────────

const resolver = stripComments(
  readFileSync(
    path.join(root, "src/features/cart/server/services/cart-catalogue-pricing.server.ts"),
    "utf8",
  ),
);

assert.match(
  resolver,
  /findById\s*\(/,
  "The resolver must read each product from the database.",
);
assert.match(
  resolver,
  /status\s*===\s*["']archived["']/,
  "An archived product must not be orderable.",
);
assert.match(
  resolver,
  /label\s*\?\s*0/,
  "A price-on-request item must reach the order as 0 plus its label, not as a number.",
);

// The resolver must never take a number from its caller: its only input is ids.
assert.doesNotMatch(
  resolver,
  /unitPriceMinor\s*:\s*(input|item|request)\./,
  "The resolver must not accept a price from the caller.",
);

console.log("Cart catalogue pricing contract passed.");
