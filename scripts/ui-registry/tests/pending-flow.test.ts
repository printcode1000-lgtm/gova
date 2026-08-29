import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  findUiRegistrySourceMatches,
  generateUiUid,
  isUiRegistryPendingOpen,
  renderUiDescriptorProp,
  validateUiRegistryPendingRequest,
  type UiRegistryPendingRequest,
} from "@asol/ui-registry-core";

import {
  applyPendingRequest,
  applyPendingRequests,
  type PendingQueuePort,
} from "../apply-pending-runner";
import { resolvePendingSource } from "../pending-source-resolver";

const VALID_UID = "pending.home.button-a8K3xP";

function request(overrides: Partial<UiRegistryPendingRequest> = {}): UiRegistryPendingRequest {
  return {
    id: "request-1",
    uid: VALID_UID,
    descriptor: { uid: VALID_UID, id: "pending.home.button", kind: "action", action: "open-thing" },
    locator: { component: "button", route: "/home", anchor: "home-thing-button" },
    status: "pending",
    reason: null,
    createdAt: "2026-08-26T00:00:00.000Z",
    createdBy: "super-admin-uid",
    resolvedAt: null,
    ...overrides,
  };
}

/** A repository stand-in: the runner must not need a database to be provable. */
class FakeQueue implements PendingQueuePort {
  resolved: string[] = [];
  blocked: Array<{ id: string; reason: string }> = [];
  constructor(private requests: UiRegistryPendingRequest[]) {}
  async listOpen(): Promise<UiRegistryPendingRequest[]> {
    return this.requests.filter(isUiRegistryPendingOpen);
  }
  async markResolved(id: string): Promise<void> {
    this.resolved.push(id);
    this.requests = this.requests.map((entry) =>
      entry.id === id ? { ...entry, status: "resolved", resolvedAt: "now" } : entry,
    );
  }
  async markBlocked(id: string, reason: string): Promise<void> {
    this.blocked.push({ id, reason });
    this.requests = this.requests.map((entry) =>
      entry.id === id ? { ...entry, status: "blocked", reason } : entry,
    );
  }
}

function fixtureRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "asol-ui-registry-pending-"));
  for (const [name, body] of Object.entries(files)) {
    const full = join(root, name);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body, "utf8");
  }
  mkdirSync(join(root, "packages"), { recursive: true });
  return root;
}

// ── Validation and redaction ───────────────────────────────────────────────
const accepted = validateUiRegistryPendingRequest({
  uid: VALID_UID,
  descriptor: {
    uid: VALID_UID,
    id: "pending.home.button",
    kind: "action",
    action: "open-thing",
    part: "toolbar",
    state: "loading",
    simulation: { kind: "event", id: "home-thing" },
  },
  locator: { component: "button", route: "/orders/[orderId]", anchor: "home-thing-button" },
});
assert.ok(accepted.ok, "a safe request must be accepted");
if (accepted.ok) {
  assert.equal(accepted.request.descriptor.action, "open-thing", "action must survive round-trip");
  assert.equal(accepted.request.descriptor.part, "toolbar", "part must survive round-trip");
  assert.deepEqual(
    accepted.request.descriptor.simulation,
    { kind: "event", id: "home-thing" },
    "simulation must survive round-trip",
  );
}

// interaction and instance must round-trip too — not silently dropped.
const withInteractionAndInstance = validateUiRegistryPendingRequest({
  uid: VALID_UID,
  descriptor: {
    uid: VALID_UID,
    id: "pending.home.button",
    kind: "item",
    interaction: { type: "tap" },
    instance: "order-8f21",
  },
  locator: { component: "button", route: "/orders/[orderId]", anchor: "home-thing-button" },
});
assert.ok(withInteractionAndInstance.ok, "a request with interaction and instance must be accepted");
if (withInteractionAndInstance.ok) {
  assert.deepEqual(
    withInteractionAndInstance.request.descriptor.interaction,
    { type: "tap" },
    "interaction must survive round-trip",
  );
  assert.equal(
    withInteractionAndInstance.request.descriptor.instance,
    "order-8f21",
    "instance must survive round-trip",
  );
  const rendered = renderUiDescriptorProp(withInteractionAndInstance.request.descriptor as Record<string, unknown>);
  assert.match(rendered, /interaction: \{ type: "tap" \}/, "rendered source must carry interaction");
  assert.match(rendered, /instance: "order-8f21"/, "rendered source must carry instance");
}

// An instance value that fails content validation (a phone number) is
// rejected outright, not silently accepted because it merely fits the shape.
assert.equal(
  validateUiRegistryPendingRequest({
    uid: VALID_UID,
    descriptor: { uid: VALID_UID, id: "pending.home.button", instance: "5551234567" },
    locator: { component: "button", route: "/home", anchor: "home-thing-button" },
  }).ok,
  false,
  "a phone-number-shaped instance must be rejected",
);
// An unknown interaction type is rejected, not silently coerced.
assert.equal(
  validateUiRegistryPendingRequest({
    uid: VALID_UID,
    descriptor: { uid: VALID_UID, id: "pending.home.button", interaction: { type: "hover" } },
    locator: { component: "button", route: "/home", anchor: "home-thing-button" },
  }).ok,
  false,
  "an unregistered interaction type must be rejected",
);

// Everything outside the known safe fields is dropped by reconstruction.
const redacted = validateUiRegistryPendingRequest({
  uid: VALID_UID,
  descriptor: {
    uid: VALID_UID,
    id: "pending.home.button",
    label: "اشترِ الآن",
    value: "01000000000",
    html: "<div>secret</div>",
    token: "session-abc",
  },
  locator: {
    component: "button",
    route: "/home",
    anchor: "home-thing-button",
    file: "C:/Users/dev/gova/src/app/page.tsx",
  },
});
assert.ok(redacted.ok);
assert.deepEqual(Object.keys(redacted.request.descriptor).sort(), ["id", "uid"]);
assert.deepEqual(Object.keys(redacted.request.locator).sort(), ["anchor", "component", "route"]);
const serialized = JSON.stringify(redacted.request);
for (const leak of ["اشترِ الآن", "01000000000", "secret", "session-abc", "C:/Users"]) {
  assert.ok(!serialized.includes(leak), `redaction must drop ${leak}`);
}

// A resolved URL is not a route template: it could carry an order id.
for (const unsafe of [
  { field: "route", body: { route: "/orders/8f21-private", component: "button", anchor: null } },
  { field: "component", body: { route: "/home", component: "Button", anchor: null } },
  { field: "anchor", body: { route: "/home", component: "button", anchor: "Order 42" } },
]) {
  const result = validateUiRegistryPendingRequest({
    uid: VALID_UID,
    descriptor: { uid: VALID_UID, id: "pending.home.button" },
    locator: unsafe.body,
  });
  assert.equal(result.ok, false, `${unsafe.field} must be rejected`);
}
assert.equal(
  validateUiRegistryPendingRequest({
    uid: "not-a-uid",
    descriptor: { uid: "not-a-uid", id: "pending.home.button" },
    locator: { component: "button", route: "/home", anchor: null },
  }).ok,
  false,
);

// ── Source matching ────────────────────────────────────────────────────────
const page = `export const Page = () => (
  <div>
    <Button id="home-thing-button" onClick={go}>go</Button>
    <Button id="other-button">other</Button>
    <Button ui={{ uid: "x-A1b2c3", id: "x" }} id="home-thing-button">already</Button>
  </div>
);
`;
const matches = findUiRegistrySourceMatches(page, request().locator);
assert.equal(matches.length, 1, "an already-registered twin must not match");
assert.equal(matches[0]!.component, "Button");

// ── Exact one-source application ───────────────────────────────────────────
const singleRoot = fixtureRoot({ "src/pages/Thing.tsx": page });
const outcome = applyPendingRequest(request(), new Set<string>(), singleRoot);
assert.ok(outcome.applied, `expected an applied edit, got: ${outcome.detail}`);
const written = readFileSync(join(singleRoot, "src/pages/Thing.tsx"), "utf8");
assert.match(written, /<Button ui=\{\{ uid: "pending\.home\.button-a8K3xP", id: "pending\.home\.button", kind: "action", action: "open-thing" \}\} id="home-thing-button"/);
assert.equal(written.match(/ui=\{\{ uid: "pending\.home\.button-a8K3xP"/g)?.length, 1);
rmSync(singleRoot, { recursive: true, force: true });

// ── Ambiguity is refused, never guessed ────────────────────────────────────
const twinPage = `export const A = () => <Button id="home-thing-button">a</Button>;\n`;
const ambiguousRoot = fixtureRoot({
  "src/pages/One.tsx": twinPage,
  "src/pages/Two.tsx": twinPage,
});
const ambiguous = applyPendingRequest(request(), new Set<string>(), ambiguousRoot);
assert.equal(ambiguous.applied, false);
assert.match(ambiguous.detail, /ambiguous source: 2 usage sites/);
assert.equal(readFileSync(join(ambiguousRoot, "src/pages/One.tsx"), "utf8"), twinPage);
assert.equal(readFileSync(join(ambiguousRoot, "src/pages/Two.tsx"), "utf8"), twinPage);

// An anchorless request can never prove a unique site, so it is refused too.
const anchorless = applyPendingRequest(
  request({ locator: { component: "button", route: "/home", anchor: null } }),
  new Set<string>(),
  ambiguousRoot,
);
assert.equal(anchorless.applied, false);
assert.match(anchorless.detail, /published no stable DOM id/);

// A uid that already exists in source is refused before any edit.
const duplicate = applyPendingRequest(request(), new Set([VALID_UID]), ambiguousRoot);
assert.equal(duplicate.applied, false);
assert.match(duplicate.detail, /already used in source/);

async function queueScenarios(): Promise<void> {
  // ── A failed application keeps the request open ────────────────────────────
  const queue = new FakeQueue([request()]);
  const failed = await applyPendingRequests(queue, ambiguousRoot);
  assert.equal(failed.applied, 0);
  assert.equal(failed.blocked, 1);
  assert.deepEqual(queue.resolved, []);
  assert.equal(queue.blocked[0]?.id, "request-1");
  assert.match(queue.blocked[0]?.reason ?? "", /ambiguous source/);
  assert.equal((await queue.listOpen()).length, 1, "a blocked request stays open for the deploy gate");
  rmSync(ambiguousRoot, { recursive: true, force: true });

  // ── A successful application resolves exactly that request ─────────────────
  const successRoot = fixtureRoot({ "src/pages/Thing.tsx": page });
  const successQueue = new FakeQueue([request()]);
  const succeeded = await applyPendingRequests(successQueue, successRoot);
  assert.equal(succeeded.applied, 1);
  assert.equal(succeeded.blocked, 0);
  assert.deepEqual(successQueue.resolved, ["request-1"]);
  assert.deepEqual(successQueue.blocked, []);
  assert.deepEqual(await successQueue.listOpen(), [], "the deploy gate sees an empty queue");
  rmSync(successRoot, { recursive: true, force: true });
}

// ── Locator resolution reports what it could not prove ─────────────────────
const emptyRoot = fixtureRoot({ "src/pages/Empty.tsx": "export const E = () => <div />;\n" });
const missing = resolvePendingSource(request(), emptyRoot);
assert.equal(missing.ok, false);
assert.match(missing.ok ? "" : missing.reason, /no unregistered <Button> with id "home-thing-button"/);
const unknownComponent = resolvePendingSource(
  request({ locator: { component: "unmapped", route: "/home", anchor: "x" } }),
  emptyRoot,
);
assert.equal(unknownComponent.ok, false);
assert.match(unknownComponent.ok ? "" : unknownComponent.reason, /no JSX component is mapped/);
rmSync(emptyRoot, { recursive: true, force: true });

// ── The rendered prop is a complete, ordered descriptor ─────────────────────
assert.equal(
  renderUiDescriptorProp({
    uid: VALID_UID,
    id: "pending.home.button",
    kind: "action",
    action: "open-thing",
    part: "toolbar",
    state: "loading",
    simulation: { kind: "event", id: "home-thing" },
  }),
  ` ui={{ uid: "${VALID_UID}", id: "pending.home.button", kind: "action", action: "open-thing", part: "toolbar", state: "loading", simulation: { kind: "event", id: "home-thing" } }}`,
);

// Generated UIDs stay unique across submissions of the same element.
const first = generateUiUid("pending.home.button", Math.random);
const second = generateUiUid("pending.home.button", Math.random);
assert.notEqual(first, second);

void queueScenarios().then(() => {
  console.log("UiRegistry pending-flow tests passed.");
});
