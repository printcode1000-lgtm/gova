import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  UI_INSTANCE_ATTRIBUTE,
  UI_PAGE_REGISTRY,
  UI_UID_ATTRIBUTE,
  UI_UID_SUFFIX_LENGTH,
  createUiInstanceId,
  createUiUid,
  generateUiUid,
  isUiInstanceId,
  isUiUid,
  isUiUidPrefix,
  isUiUidSuffix,
  parseUiUid,
  resolveUiPage,
  uiAttributes,
  uiComponentAttributes,
  uiPageAttributes,
  uiUidSuffix,
  type UiDescriptor,
  type UiPageDefinition,
} from "../index";

const root = process.cwd();
const appRoot = join(root, "src", "app");
const packageSrc = join(root, "packages", "ui-registry-core", "src");
const SAMPLE_UID = "orders.cancel-a8K3xP";

function pageRoutes(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) return pageRoutes(fullPath);
    if (entry !== "page.tsx") return [];
    const route = relative(appRoot, directory).replace(/\\/g, "/");
    return [route ? `/${route}` : "/"];
  });
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      return entry === "tests" ? [] : sourceFiles(fullPath);
    }
    return entry.endsWith(".ts") ? [fullPath] : [];
  });
}

/** Comment prose may name a global the code itself must never touch. */
function stripComments(source: string): string {
  const withoutBlocks = source
    .split("/*")
    .map((part, index) => (index === 0 ? part : part.split("*/").slice(1).join("*/")))
    .join("");
  return withoutBlocks
    .split("\n")
    .map((line) => (line.trimStart().startsWith("//") ? "" : line))
    .join("\n");
}

/** Deterministic random source so generated UIDs are reproducible here. */
function sequenceRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

// ── UID syntax ─────────────────────────────────────────────────────────────
assert.equal(UI_UID_ATTRIBUTE, "data-ui-uid");
assert.equal(UI_UID_SUFFIX_LENGTH, 6);
assert.deepEqual(parseUiUid("product-data-a8K3xP"), { prefix: "product-data", suffix: "a8K3xP" });
assert.ok(isUiUid("product-data-a8K3xP"));
assert.ok(isUiUid("app.header.search-C0Ynx3"));
assert.ok(isUiUidPrefix("app.header.search"));
assert.equal(isUiUidPrefix("App.Header"), false);

// A suffix must be Base62 and carry both an uppercase letter and a digit, so a
// lowercase word can never pass as a generated suffix.
assert.ok(isUiUidSuffix("a8K3xP"));
assert.equal(isUiUidSuffix("abcdef"), false);
assert.equal(isUiUidSuffix("ABCDEF"), false);
assert.equal(isUiUidSuffix("123456"), false);
assert.equal(isUiUidSuffix("a8K3x"), false);
assert.equal(isUiUidSuffix("a8K3xPQ"), false);
assert.equal(isUiUidSuffix("a8K3x-"), false);

// Deterministic id-derived values are rejected: they have no generated suffix.
for (const deterministic of [
  "orders.cancel",
  "ui.orders.cancel",
  "page.orders",
  "orders-cancel",
  "orders.cancel-static",
  "",
  "Orders.Cancel-a8K3xP",
  "orders cancel-a8K3xP",
  "orders.cancel-550e8400",
]) {
  assert.equal(isUiUid(deterministic), false, `${JSON.stringify(deterministic)} must not be a uid.`);
  assert.throws(() => uiAttributes({ uid: deterministic, id: "orders.cancel" }));
}
assert.throws(() => uiAttributes({ id: "orders.cancel" } as unknown as UiDescriptor));
assert.throws(() =>
  uiPageAttributes({ route: "/x", id: "page", uid: "page" } as unknown as UiPageDefinition),
);

// ── UID generation ─────────────────────────────────────────────────────────
const random = sequenceRandom(20260826);
for (let attempt = 0; attempt < 500; attempt += 1) {
  const suffix = uiUidSuffix(random);
  assert.ok(isUiUidSuffix(suffix), `Generated suffix ${suffix} must be a valid Base62 suffix.`);
  assert.ok(isUiUid(generateUiUid("product-data", random)));
}
assert.equal(createUiUid("product-data", "a8K3xP"), "product-data-a8K3xP");
assert.throws(() => createUiUid("Product Data", "a8K3xP"));
assert.throws(() => createUiUid("product-data", "abcdef"));

// ── Page registry ──────────────────────────────────────────────────────────
assert.deepEqual(
  new Set(UI_PAGE_REGISTRY.map((page) => page.route)),
  new Set(pageRoutes(appRoot)),
  "Every App Router page must be covered by UI_PAGE_REGISTRY.",
);
assert.equal(
  new Set(UI_PAGE_REGISTRY.map((page) => page.route)).size,
  UI_PAGE_REGISTRY.length,
  "UI_PAGE_REGISTRY must not contain duplicate route templates.",
);
assert.equal(
  new Set(UI_PAGE_REGISTRY.map((page) => page.id)).size,
  UI_PAGE_REGISTRY.length,
  "UI_PAGE_REGISTRY must not contain duplicate page identities.",
);
assert.equal(
  new Set(UI_PAGE_REGISTRY.map((page) => page.uid)).size,
  UI_PAGE_REGISTRY.length,
  "UI_PAGE_REGISTRY must not contain duplicate page uids.",
);
for (const page of UI_PAGE_REGISTRY) {
  assert.ok(isUiUid(page.uid), `Page uid ${page.uid} must be a generated registry address.`);
  assert.notEqual(page.uid, page.id, "A page uid must not be a deterministic copy of its id.");
}
const notFound = resolveUiPage("/missing-route");
assert.equal(notFound.id, "not-found");
assert.ok(isUiUid(notFound.uid), "The not-found fallback must carry a uid.");

// UIDs are unique across the page registry and every application descriptor.
const applicationUids = [
  ...readFileSync(join(root, "src", "shared", "layouts", "AppHeader.tsx"), "utf8").matchAll(/uid: ['"]([^'"]+)['"]/g),
  ...readFileSync(join(root, "src", "shared", "layouts", "AppSidebar.tsx"), "utf8").matchAll(/uid: ['"]([^'"]+)['"]/g),
  ...readFileSync(join(root, "src", "shared", "layouts", "BottomNavBar.tsx"), "utf8").matchAll(/uid: ['"]([^'"]+)['"]/g),
].map((match) => match[1]!);
assert.ok(applicationUids.length >= 10, "Shell descriptors must declare UIDs.");
const everyUid = [...UI_PAGE_REGISTRY.map((page) => page.uid), notFound.uid, ...applicationUids];
assert.equal(new Set(everyUid).size, everyUid.length, "UIDs must be globally unique.");
for (const uid of applicationUids) assert.ok(isUiUid(uid), `${uid} must be a generated uid.`);

// ── Route resolution ───────────────────────────────────────────────────────
// Static routes win over dynamic templates, and values are matched but never emitted.
assert.equal(resolveUiPage("/orders/private-order-id").id, "orders.details");
assert.equal(resolveUiPage("/orders/private-order-id/").id, "orders.details");
assert.equal(resolveUiPage("/orders/details").id, "orders.details-static");
assert.equal(resolveUiPage(null).id, "splash");
const ordersPage = resolveUiPage("/orders/private-order-id");
assert.deepEqual(uiPageAttributes(ordersPage), {
  "data-ui-uid": ordersPage.uid,
  "data-ui": "page",
  "data-ui-id": "orders.details",
  "data-ui-page": "orders.details",
});
assert.equal(Object.keys(uiPageAttributes(ordersPage))[0], UI_UID_ATTRIBUTE);

// ── Attribute emission ─────────────────────────────────────────────────────
const orderCancel = uiAttributes({
  uid: SAMPLE_UID,
  id: "orders.cancel",
  kind: "action",
  state: "loading",
  simulation: { kind: "event", id: "order-cancel" },
});
assert.equal(Object.keys(orderCancel)[0], UI_UID_ATTRIBUTE);
assert.deepEqual(orderCancel, {
  "data-ui-uid": SAMPLE_UID,
  "data-ui": "action",
  "data-ui-id": "orders.cancel",
  "data-ui-state": "loading",
  "data-simulation-target": "order-cancel",
});
assert.deepEqual(
  uiAttributes({ uid: "app.header-D7X3uK", id: "app.header", kind: "region", part: "top" }),
  {
    "data-ui-uid": "app.header-D7X3uK",
    "data-ui": "region",
    "data-ui-id": "app.header",
    "data-ui-part": "top",
  },
);
assert.deepEqual(
  uiAttributes({
    uid: "profile.name-Q4mz7B",
    id: "profile.name",
    kind: "field",
    state: ["idle", "empty"],
    action: "edit",
  }),
  {
    "data-ui-uid": "profile.name-Q4mz7B",
    "data-ui": "field",
    "data-ui-id": "profile.name",
    "data-ui-state": "idle empty",
    "data-ui-action": "edit",
  },
);

// All five simulation marker kinds are unchanged by the uid contract.
for (const [kind, attribute] of [
  ["event", "data-simulation-target"],
  ["field", "data-simulation-field"],
  ["list-item", "data-simulation-list-item"],
  ["file", "data-simulation-file"],
  ["state", "data-simulation-state"],
] as const) {
  assert.equal(
    uiAttributes({
      uid: "sample.control-Zt4Km9",
      id: "sample.control",
      simulation: { kind, id: "sample-id" },
    })[attribute],
    "sample-id",
    `Simulation kind ${kind} must emit ${attribute}.`,
  );
}

// ── data-ui-instance: one source uid, many runtime instances ───────────────
assert.equal(UI_INSTANCE_ATTRIBUTE, "data-ui-instance");
assert.equal(isUiInstanceId("order-8f21"), true);
assert.equal(isUiInstanceId(""), false);
assert.equal(isUiInstanceId("a".repeat(65)), false);
assert.equal(isUiInstanceId("has space"), false);
assert.equal(isUiInstanceId("user@example.com"), false);

// createUiInstanceId is the only door: content, not just shape, is checked.
assert.equal(createUiInstanceId("order-8f21"), "order-8f21");
assert.throws(() => createUiInstanceId("user@example.com"), /email/);
assert.throws(() => createUiInstanceId("+15551234567"), /phone number/);
assert.throws(() => createUiInstanceId("5551234567"), /phone number/);
assert.throws(() => createUiInstanceId("https://example.com/x"), /resolved URL/);
assert.throws(() => createUiInstanceId("sk_live_abc123"), /token or secret/);
assert.throws(
  () => createUiInstanceId("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.dQw4w9WgXcQ"),
  /token or secret/,
);
assert.throws(() => createUiInstanceId("550e8400-e29b-41d4-a716-446655440000"), /UUID/);
assert.equal(
  createUiInstanceId("550e8400-e29b-41d4-a716-446655440000", { allowUuid: true }),
  "550e8400-e29b-41d4-a716-446655440000",
);
assert.throws(() => createUiInstanceId(""), /must not be empty/);
assert.throws(() => createUiInstanceId("a".repeat(65)), /at most 64 characters/);

const rowDescriptor: UiDescriptor = {
  uid: "orders.item-row-A8K3xP",
  id: "orders.item-row",
  kind: "item",
  instance: createUiInstanceId("order-8f21"),
};
assert.deepEqual(uiAttributes(rowDescriptor), {
  "data-ui-uid": "orders.item-row-A8K3xP",
  "data-ui": "item",
  "data-ui-id": "orders.item-row",
  "data-ui-instance": "order-8f21",
});
// Two runtime rows from the same usage site share the source uid and differ
// only by instance — that sharing is intentional, not a duplicate.
assert.deepEqual(
  uiAttributes({ ...rowDescriptor, instance: createUiInstanceId("order-51z0") })["data-ui-uid"],
  rowDescriptor.uid,
);
// A usage site that renders once has no instance field, and none is emitted.
assert.equal(UI_INSTANCE_ATTRIBUTE in uiAttributes({ uid: "orders.title-Zt4Km9", id: "orders.title" }), false);

// Generic shared primitives are an intentional unregistered fallback: no uid.
assert.deepEqual(uiComponentAttributes("button", "disabled"), {
  "data-ui": "component",
  "data-ui-component": "button",
  "data-ui-state": "disabled",
});
assert.deepEqual(uiComponentAttributes("input"), {
  "data-ui": "component",
  "data-ui-component": "input",
});
assert.equal(UI_UID_ATTRIBUTE in uiComponentAttributes("input"), false);

// Token validation still rejects anything that could leak a value into the DOM.
assert.throws(() => uiAttributes({ uid: SAMPLE_UID, id: "Order Private 42" }));
assert.throws(() => uiAttributes({ uid: SAMPLE_UID, id: "orders.cancel", action: "Cancel Order" }));
assert.throws(() => uiAttributes({ uid: SAMPLE_UID, id: "orders.cancel", part: "TOP" }));
assert.throws(() =>
  uiAttributes({
    uid: SAMPLE_UID,
    id: "orders.cancel",
    simulation: { kind: "event", id: "Order Cancel" },
  }),
);
assert.throws(() => uiComponentAttributes("Button"));
assert.throws(() => uiPageAttributes({ route: "/x", id: "Page Id", uid: "page.x-a8K3xP" }));

// ── Package seal ───────────────────────────────────────────────────────────
// No framework, application, or platform dependency may enter production code.
for (const file of sourceFiles(packageSrc)) {
  const source = stripComments(readFileSync(file, "utf8"));
  const label = relative(root, file).replace(/\\/g, "/");
  for (const specifier of source.matchAll(/from\s+"([^"]+)"/g)) {
    assert.ok(
      specifier[1]!.startsWith("."),
      `${label} may only import inside the package; found "${specifier[1]}".`,
    );
  }
  // Generated data catalogs are arrays of string literals (uids, ids, file
  // paths) with no executable logic; a semantic id like "document-upload" or
  // a source path containing "process" would otherwise false-positive here.
  // The import-specifier check above still runs unconditionally.
  if (!label.includes("/generated/")) {
    assert.doesNotMatch(
      source,
      /\b(?:window|document|navigator|localStorage|process|require|Math\.random|crypto)\b/,
      `${label} must not touch platform globals or runtime randomness.`,
    );
  }
}

console.log("UI registry core contract tests passed.");
