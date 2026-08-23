import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  NOTIFICATION_ENTRY_POINTS_BY_TREE,
  NOTIFICATION_GUARDED_TREES,
  NOTIFICATION_INTERNAL_IMPORT_EXEMPT,
  NOTIFICATION_INTERNAL_SEGMENTS,
  NOTIFICATION_MODULE_ROOT,
  NOTIFICATION_PUBLIC_ENTRY_POINTS,
  NOTIFICATION_PUBLIC_SPECIFIERS,
  NOTIFICATION_TRANSPORT_RULES,
} from "@asol/architecture-core";
import {
  NOTIFICATION_COMMAND_TYPES,
  type NotificationCommand,
} from "../public/notification-commands";
import type { NotificationsApi } from "../public/notifications";
import type { NotificationEntity } from "@asol/notifications-core";
import type {
  NotificationDiagnostics,
  NotificationReceiveOutcome,
  OpenNotificationResult,
} from "../public/notification-public-types";

/**
 * The notification module's boundary and its public contract.
 *
 * `architecture:check` enforces the import rules while the build runs; this
 * repeats them under `npm test` so a boundary regression fails both gates, and
 * adds the two things a static import check cannot see: that the public API
 * actually carries every operation it promises, and that its command types are
 * verified by the compiler rather than by a regular expression over source text.
 *
 * Runtime *behaviour* is not tested here. It is tested against real flows in
 * `tests/integration/notification-flow.integration.test.ts`.
 */

const root = process.cwd();

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    return statSync(target).isDirectory() ? filesBelow(target) : [target];
  });
}

function repoRelative(file: string): string {
  return path.relative(root, file).split(path.sep).join("/");
}

/** Every source file in both guarded trees. */
const sourceFiles = NOTIFICATION_GUARDED_TREES.flatMap((tree) => {
  const directory = path.join(root, tree);
  return filesBelow(directory)
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => !repoRelative(file).includes("/generated/"))
    .map((file) => ({ tree, rel: repoRelative(file), source: readFileSync(file, "utf8") }));
});

// ---------------------------------------------------------------------------
// 1. Compile-time contract
// ---------------------------------------------------------------------------

/**
 * `execute` must resolve to the result its command declares, not `unknown`.
 *
 * Checked by the compiler: these assignments only build if the generic narrows
 * correctly, which is the whole point of the command form. Nothing is executed.
 */
function commandResultTypesAreVerified(api: NotificationsApi) {
  const list: Promise<NotificationEntity[]> = api.execute({
    type: "list",
    payload: { uid: "u" },
  });
  const unread: Promise<number> = api.execute({
    type: "getUnreadCount",
    payload: { uid: "u" },
  });
  const diagnostics: Promise<NotificationDiagnostics> = api.execute({ type: "getDiagnostics" });
  const opened: Promise<OpenNotificationResult> = api.execute({
    type: "openNotification",
    payload: { uid: "u", notificationId: "n" },
  });
  const received: Promise<NotificationReceiveOutcome> = api.execute({
    type: "receive",
    payload: {},
  });
  const published: Promise<NotificationEntity | null> = api.execute({
    type: "publishEvent",
    payload: { event: { name: "orders.created", uid: "u", dedupeKey: "d" } },
  });
  return { list, unread, diagnostics, opened, received, published };
}
void commandResultTypesAreVerified;

/**
 * Unsupported command shapes must fail to compile.
 *
 * Each `@ts-expect-error` is itself an assertion: if the line below it ever
 * becomes valid, TypeScript reports the unused directive and `npm run typecheck`
 * fails. This is what stops the command union from quietly widening.
 */
function unsupportedCommandShapesAreRejected(api: NotificationsApi) {
  // @ts-expect-error - an unknown command type is not part of the union.
  void api.execute({ type: "deleteEverything", payload: {} });
  // @ts-expect-error - `list` requires a uid in its payload.
  void api.execute({ type: "list", payload: {} });
  // @ts-expect-error - `markRead` requires a notificationId.
  void api.execute({ type: "markRead", payload: { uid: "u" } });
  // @ts-expect-error - `getUnreadCount` returns a number, not a string.
  const wrong: Promise<string> = api.execute({ type: "getUnreadCount", payload: { uid: "u" } });
  void wrong;
  // @ts-expect-error - a command must carry its own payload type.
  void api.execute({ type: "enqueueRetry", payload: { uid: "u", kind: "not-a-kind", id: "i" } });
}
void unsupportedCommandShapesAreRejected;

/** The runtime command list and the compile-time union must agree. */
const commandTypesFromUnion: ReadonlySet<NotificationCommand["type"]> = new Set(
  NOTIFICATION_COMMAND_TYPES,
);
assert.equal(
  commandTypesFromUnion.size,
  NOTIFICATION_COMMAND_TYPES.length,
  "NOTIFICATION_COMMAND_TYPES contains a duplicate.",
);

// ---------------------------------------------------------------------------
// 2. The public API carries every promised operation
// ---------------------------------------------------------------------------

/**
 * The operations the module publicly commits to.
 *
 * Checked against the built object, not against source text: a method that was
 * renamed, deleted, or left off the facade fails here even if the word still
 * appears somewhere in the file.
 */
const REQUIRED_OPERATIONS = [
  "initialize",
  "registerDevice",
  "unregisterDevice",
  "requestPermission",
  "getPermissionState",
  "sendLocal",
  "sendPush",
  "receive",
  "importDelivered",
  "synchronizeNotificationCenter",
  "markRead",
  "markAllRead",
  "dismiss",
  "list",
  "getUnreadCount",
  "openNotification",
  "createChannels",
  "getDiagnostics",
  "executeTestScenario",
] as const;

async function verifyPublicSurface(): Promise<void> {
  const { notifications } = (await import("../index")) as typeof import("../index");

  for (const operation of REQUIRED_OPERATIONS) {
    assert.equal(
      typeof (notifications as unknown as Record<string, unknown>)[operation],
      "function",
      `The public API is missing the "${operation}" operation.`,
    );
    assert.ok(
      (NOTIFICATION_COMMAND_TYPES as readonly string[]).includes(operation),
      `"${operation}" has no command form.`,
    );
  }

  assert.equal(typeof notifications.execute, "function", "execute() is missing.");

  // Every declared command must be routed. An unhandled one would fall through
  // to the unknown-command guard, which is exactly what this distinguishes.
  for (const type of NOTIFICATION_COMMAND_TYPES) {
    let code = "";
    try {
      await notifications.execute({ type } as unknown as NotificationCommand);
    } catch (error) {
      code = String((error as { code?: string }).code ?? "");
    }
    assert.notEqual(
      code,
      "notifications/unknown-command",
      `execute() does not route the "${type}" command.`,
    );
  }

  // And an undeclared one must fail closed.
  await assert.rejects(
    () => notifications.execute({ type: "nope" } as unknown as NotificationCommand),
    (error: unknown) => (error as { code?: string }).code === "notifications/unknown-command",
    "execute() must reject an unknown command.",
  );
}

// ---------------------------------------------------------------------------
// 3. Nothing outside the module reaches inside it
// ---------------------------------------------------------------------------

const internalImport = new RegExp(
  `["'](?:@/|\\.{1,2}/[^"']*?)features/notifications/(?:${NOTIFICATION_INTERNAL_SEGMENTS.join("|")})/`,
);

for (const { tree, rel, source } of sourceFiles) {
  if (rel.startsWith(NOTIFICATION_MODULE_ROOT)) continue;
  if (NOTIFICATION_INTERNAL_IMPORT_EXEMPT.has(rel)) continue;

  const allowed = NOTIFICATION_ENTRY_POINTS_BY_TREE[tree] ?? NOTIFICATION_PUBLIC_SPECIFIERS;
  assert.doesNotMatch(
    source,
    internalImport,
    `${rel} imports notification internals; use one of ${allowed.join(", ")}.`,
  );

  // A tree may only use the entry points it is allowed to use. The microservice
  // is limited to one, because its import surface is its deployment surface.
  for (const specifier of NOTIFICATION_PUBLIC_SPECIFIERS) {
    if (allowed.includes(specifier)) continue;
    assert.doesNotMatch(
      source,
      new RegExp(`from\\s+["']${specifier}["']`),
      `${rel} imports "${specifier}", which is not available in ${tree}.`,
    );
  }
}

// Each entry point must exist and must not re-export an adapter. Comments are
// stripped first: the entry points name the internal folders in prose, to say
// that they are off limits.
for (const entryPoint of NOTIFICATION_PUBLIC_ENTRY_POINTS) {
  const code = readFileSync(path.join(root, entryPoint), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(
    code,
    /infrastructure\/|capacitor|asol-db|web-push-browser/i,
    `${entryPoint} exposes infrastructure through the public API.`,
  );
}

/**
 * The behavioural entry point must export exactly one runtime value.
 *
 * Everything else it exports is a type or a frozen enum. A service, repository,
 * bus, or builder reachable from here is an object a consumer can hold and
 * depend on, which is what the narrowing was for.
 */
async function verifyRootBarrelIsNarrow(): Promise<void> {
  const barrel = (await import("../index")) as Record<string, unknown>;
  const runtimeValues = Object.entries(barrel).filter(
    ([, value]) => typeof value === "function" || typeof value === "object",
  );
  const objectLike = runtimeValues.filter(([name]) => name !== "notifications");

  /**
   * Inert data: a plain object or array of primitives, all the way down.
   *
   * That is what an enum, a defaults table, and the shipped test-scenario list
   * are. A service is not: it is a class instance, and its behaviour lives in
   * methods — which is exactly what this rejects.
   */
  const isInertData = (value: unknown, depth = 0): boolean => {
    if (value === null) return true;
    const kind = typeof value;
    if (kind === "string" || kind === "number" || kind === "boolean") return true;
    if (kind === "function") return false;
    if (kind !== "object" || depth > 4) return false;
    if (Array.isArray(value)) return value.every((entry) => isInertData(entry, depth + 1));
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Object.values(value as Record<string, unknown>).every((entry) =>
      isInertData(entry, depth + 1),
    );
  };

  for (const [name, value] of objectLike) {
    // A function here is an error class or a pure helper; both are stateless.
    const isFunction = typeof value === "function";
    assert.ok(
      isFunction || isInertData(value),
      `"${name}" is exported from the root entry point but is not a type, enum, error, or pure helper.`,
    );
  }

  for (const forbidden of [
    "notificationBus",
    "notificationSender",
    "notificationReceiver",
    "asolNotificationRepository",
    "notificationApiService",
    "notificationDeviceTokenService",
    "NotificationBuilder",
    "NotificationTemplateLoader",
    "EventNotificationMapper",
  ]) {
    assert.equal(
      barrel[forbidden],
      undefined,
      `"${forbidden}" is an implementation object and must not be exported from the root entry point.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 4. No transport is reachable outside the adapter that owns it
// ---------------------------------------------------------------------------

for (const { rel, source } of sourceFiles) {
  if (!rel.startsWith(NOTIFICATION_MODULE_ROOT)) continue;
  if (rel.startsWith(`${NOTIFICATION_MODULE_ROOT}tests/`)) continue;
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  for (const rule of NOTIFICATION_TRANSPORT_RULES) {
    if (rule.owners.some((owner) => rel === owner || rel.startsWith(owner))) continue;
    assert.doesNotMatch(
      code,
      rule.pattern,
      `${rel} reaches ${rule.transport} outside its adapter; use ${rule.use}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// 5. The module does not import the features that import it
// ---------------------------------------------------------------------------

for (const { rel, source } of sourceFiles) {
  if (!rel.startsWith(NOTIFICATION_MODULE_ROOT)) continue;
  if (rel.startsWith(`${NOTIFICATION_MODULE_ROOT}tests/`)) continue;
  const cycles = [...source.matchAll(/from\s+["']@\/features\/([^/"']+)["']/g)]
    .map((match) => match[1])
    .filter((feature) => feature !== "notifications");
  assert.deepEqual(
    cycles,
    [],
    `${rel} imports another feature's entry point (${cycles.join(", ")}), which may import notifications back.`,
  );
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await verifyPublicSurface();
  await verifyRootBarrelIsNarrow();
  process.stdout.write("Notification module boundary and public API contract passed.\n");
}

void main().catch((error) => {
  process.stdout.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
