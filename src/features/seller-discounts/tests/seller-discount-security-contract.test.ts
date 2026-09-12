import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");

const discountsRoute = read("src/app/api/profile/discounts/route.ts");
assert.match(discountsRoute, /assertSignedInRequest\(request\)/);
assert.match(discountsRoute, /claims\.uid !== sellerUid/);
assert.match(discountsRoute, /saveSellerDiscounts\(\s*claims\.uid/);
assert.match(discountsRoute, /resolveCartPrices\(referencedProductIds\)/);
assert.match(discountsRoute, /product\.sellerId !== claims\.uid/);

const quoteRoute = read("src/app/api/profile/discounts/quote/route.ts");
assert.match(quoteRoute, /resolveCartPrices\(/);
assert.match(quoteRoute, /mainCategoryId:\s*authoritative\.mainCategoryId/);
assert.match(quoteRoute, /hasBuyerOrders\(claims\.uid\)/);
assert.match(quoteRoute, /followService\.getStatus/);
assert.match(quoteRoute, /isFirstOrder:\s*!hasPreviousOrders/);
assert.match(quoteRoute, /isFollowerBySeller/);
assert.doesNotMatch(quoteRoute, /isFirstOrder:\s*body\.context/);
assert.doesNotMatch(quoteRoute, /isFollower:\s*body\.context/);

const orderRoute = read("src/app/api/orders/from-cart/route.ts");
assert.match(orderRoute, /const session = assertSignedInRequest\(request\)/);
assert.match(orderRoute, /const buyerUid = session\.uid/);
assert.doesNotMatch(orderRoute, /body\.uid/);
assert.doesNotMatch(orderRoute, /body\.phone/);
assert.match(orderRoute, /mainCategoryId:\s*authoritative\.mainCategoryId/);
assert.match(orderRoute, /hasBuyerOrders\(buyerUid\)/);
assert.match(orderRoute, /followService\.getStatus/);
assert.match(orderRoute, /isFirstOrder:\s*!hasPreviousOrders/);
assert.match(orderRoute, /isApp:\s*isNativeRequest\(request\)/);

const submit = read("src/features/cart/presentation/cart-order-submit.ts");
assert.match(submit, /x-asol-session-token/);
const requestStart = submit.indexOf("ASOL_API_ROUTES.orders.fromCart");
const requestEnd = submit.indexOf("headers:", requestStart);
const orderRequest = submit.slice(requestStart, requestEnd);
assert.doesNotMatch(orderRequest, /uid:\s*session\.uid/);
assert.doesNotMatch(orderRequest, /phone:\s*session\.phone/);

const ownership = read("packages/account-bridge/src/routes.ts");
const protectedRoute = ownership.indexOf("pattern: '/api/profile/discounts', methods: ALL");
const genericWrite = ownership.indexOf("pattern: '/api/profile/**', methods: WRITE");
assert.ok(protectedRoute >= 0 && protectedRoute < genericWrite);
assert.match(ownership.slice(Math.max(0, protectedRoute - 120), protectedRoute + 120), /owner: 'sub2main'/);

const sub2mainMirror = read("services/sub2main/src/app/api/profile/discounts/route.ts");
assert.match(sub2mainMirror, /GET as getDiscounts/);
assert.match(sub2mainMirror, /PUT as saveDiscounts/);

console.log("seller-discount-security: signed identity, authoritative catalogue and server-derived eligibility contracts passed");
