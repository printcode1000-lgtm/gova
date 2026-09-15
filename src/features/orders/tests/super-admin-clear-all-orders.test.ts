import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("src/features/orders/presentation/OrdersPageContent.tsx");
const appRoute = read("src/app/api/super-admin/orders/clear/route.ts");
const controlRoute = read("services/control/src/app/api/super-admin/orders/clear/route.ts");
const command = read("packages/data-core/src/domains/marketplace-orders/commands/delete-all-orders.command.server.ts");

assert.match(page, /admin \? \(/, "Clear-all controls must remain Super Admin-only in the UI.");
assert.match(page, /usePageSaveOperationScope\(/, "Clear-all must be owned by Page Saver.");
assert.match(page, /itemId: "orders-clear-all"/);
assert.match(page, /kind: "delete"/);
assert.match(page, /ASOL_API_ROUTES\.orders\.superAdminClear/);
assert.match(appRoute, /assertSuperAdminRequest\(request\)/, "Dev route must reauthorize Super Admin server-side.");
assert.match(controlRoute, /runControlSuperAdminRoute\(request/, "Control route must reauthorize Super Admin server-side.");
assert.match(command, /ORDER_TABLES_IN_DELETE_ORDER/);
assert.match(command, /"orders",\s*\] as const;/, "Parent orders table must be deleted last.");
console.log("Super Admin clear-all orders contract passed.");
