import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const cartPage = readFileSync(
  path.join(
    process.cwd(),
    "src/features/cart/presentation/CartPageContent.tsx",
  ),
  "utf8",
);

const checkoutButton = cartPage.match(
  /<button[\s\S]*?data-simulation-target="cart-checkout"[\s\S]*?onClick=\{submitOrder\}[\s\S]*?<\/button>/,
);

assert.ok(
  checkoutButton,
  'The real cart submit button must expose data-simulation-target="cart-checkout" so the registered simulation action can reach it.',
);

console.log("Cart checkout simulation target test passed.");
