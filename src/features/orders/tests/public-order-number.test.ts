import assert from "node:assert/strict";

import { formatPublicOrderNumber } from "../application/public-order-number";

assert.equal(formatPublicOrderNumber("ASOL-123"), "Pbook-123");
assert.equal(formatPublicOrderNumber("asol-123"), "Pbook-123");
assert.equal(formatPublicOrderNumber("GOVA-123"), "Pbook-123");
assert.equal(formatPublicOrderNumber("Pbook-123"), "Pbook-123");
assert.equal(formatPublicOrderNumber(undefined, "ord_1"), "ord_1");

console.log("Public order number tests passed.");
