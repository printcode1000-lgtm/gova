/**
 * The notification module's boundary, as data.
 *
 * `scripts/architecture-check` reads these rules and fails the build when one is
 * broken, so the module cannot quietly lose its shape between reviews. The rules
 * live here, beside the other architecture contracts, rather than inside the
 * check script — the contract is a fact about the codebase, and the script is
 * only one reader of it. `tests/notification-module-boundary.test.ts` is the
 * other, so a boundary regression fails `npm test` as well as the build.
 *
 * Four rules, in the order they matter:
 *
 * 1. Outside the module, only the entry points may be imported — from `src` and
 *    from `services/notifications` alike.
 * 2. Inside the module, a layer may only import the layers beneath it.
 * 3. A transport — Capacitor, Firebase, APNs, Web Push, IndexedDB, the service
 *    worker — is reachable only from the adapter that owns it.
 * 4. The module never imports a feature that may import it back.
 */

export const NOTIFICATION_MODULE_ROOT = "src/features/notifications/";

/** Trees that must not reach into the module's internals. */
export const NOTIFICATION_GUARDED_TREES = ["src/", "services/notifications/src/"] as const;

/**
 * The only import paths anything outside the module may use.
 *
 * Five, and each exists because it cannot be merged into another:
 *
 * | Entry point | Why it is separate |
 * |---|---|
 * | `index.ts` | The behaviour. Exports exactly one runtime object. |
 * | `ui.ts` | React components and hooks. In `index.ts` they would pull the presentation tree — and React — into every route that wants a type. |
 * | `server.ts` | Everything behind it imports `server-only`, which is a build error inside a client component. |
 *
 * `contracts.ts` and `service-runtime.ts` are no longer here. They moved into
 * `@asol/notifications-core`, whose two doors replace them: `.` carries the domain
 * vocabulary that persistence code needs without the behaviour, and `./server` is the
 * microservice's only path — its import surface *is* that deployment's file surface.
 */
export const NOTIFICATION_PUBLIC_ENTRY_POINTS = [
  "src/features/notifications/index.ts",
  "src/features/notifications/ui.ts",
  "src/features/notifications/server.ts",
] as const;

/** The importable specifiers that resolve to those entry points. */
export const NOTIFICATION_PUBLIC_SPECIFIERS = [
  "@asol/notifications-core",
  "@asol/notifications-core/server",
  "@/features/notifications",
  "@/features/notifications/ui",
  "@/features/notifications/server",
  "@asol/notifications-core",
  "@asol/notifications-core/server",
] as const;

/**
 * Which entry points each tree may use.
 *
 * The microservice is restricted to one: reaching `server.ts` there would put
 * the users repository on an account that must never hold it, and the build's
 * import mirror would carry it there silently.
 */
export const NOTIFICATION_ENTRY_POINTS_BY_TREE: Readonly<
  Record<string, readonly string[]>
> = {
  "src/": [
    "@/features/notifications",
    "@/features/notifications/ui",
    "@/features/notifications/server",
    "@asol/notifications-core",
  ],
  "services/notifications/src/": ["@asol/notifications-core/server"],
};

/** Internal folders no outside file may reach into. */
export const NOTIFICATION_INTERNAL_SEGMENTS = [
  "domain",
  "application",
  "infrastructure",
  "services",
  "presentation",
  "public",
  "shared",
  "config",
  "tests",
] as const;

/**
 * Files outside the module that may still name an internal path.
 *
 * These read files as strings — they do not import them — and the mirror
 * generator has to name the microservice's entry point explicitly.
 */
export const NOTIFICATION_INTERNAL_IMPORT_EXEMPT = new Set<string>([
  "scripts/sync-notifications-service-sources.ts",
  "scripts/validate-ios-push-policy.ts",
  "packages/native-core/scripts/validate-ios-push-policy.ts",
  "scripts/test-ota-native-compatibility.ts",
  "src/features/auth/tests/registration-success-flow.test.ts",
]);

/** Which layer a file inside the module belongs to. */
export type NotificationLayer =
  | "domain"
  | "application"
  | "infrastructure"
  | "services"
  | "presentation"
  | "public"
  | "shared"
  | "config"
  | "entry";

/**
 * What each layer may import from inside the module.
 *
 * Read it as "may depend on". Two directions are deliberate and worth naming,
 * because both look wrong at a glance:
 *
 * - **infrastructure → services.** The Web Push adapter calls the device-token
 *   API client, which lives in `services/`. That folder is not "application
 *   services": it holds the module's *outbound transports* — the browser API
 *   client and the server-side provider implementations. One adapter calling
 *   another is sideways, not upward.
 * - **application → infrastructure.** Use cases drive adapters. That is the
 *   normal direction; the inversion would only be needed if the domain had to
 *   name an adapter, and it never does.
 *
 * The direction that is genuinely forbidden — and was the layer cycle this
 * matrix was written to close — is `services → application`. The server send
 * service needed the notification builder, so the builder moved to `domain`
 * where both sides can reach it.
 */
export const NOTIFICATION_LAYER_DEPENDENCIES: Record<
  NotificationLayer,
  readonly NotificationLayer[]
> = {
  // Static template data. A leaf: it imports nothing and is read by the template
  // loader, which is why domain is allowed to reach it.
  config: [],
  domain: ["config"],
  shared: ["domain", "config"],
  services: ["domain", "shared", "config"],
  infrastructure: ["domain", "shared", "config", "services"],
  application: ["domain", "shared", "config", "services", "infrastructure"],
  public: ["domain", "shared", "config", "services", "infrastructure", "application"],
  presentation: ["domain", "shared", "config", "application", "public"],
  entry: [
    "domain",
    "shared",
    "config",
    "services",
    "infrastructure",
    "application",
    "public",
    "presentation",
  ],
};

/**
 * Transports, and the only files allowed to touch each one.
 *
 * Patterns match by *capability*, not by one exact import string: a new Web Push
 * call, a second IndexedDB helper, or a differently-named Firebase package must
 * all be caught, otherwise the guard only enforces the imports that existed the
 * day it was written. A path prefix in `owners` matches every file beneath it.
 */
export const NOTIFICATION_TRANSPORT_RULES: ReadonlyArray<{
  /** What is being reached for. */
  readonly transport: string;
  /** Matched against the file's source, after comments are stripped. */
  readonly pattern: RegExp;
  /** File paths or path prefixes permitted to match. */
  readonly owners: readonly string[];
  /** What everyone else should use instead. */
  readonly use: string;
}> = [
  {
    transport: "notification storage (IndexedDB / AsolDB)",
    pattern:
      /from\s+['"][^'"]*data-access\/browser\/asol-db['"]|\bindexedDB\b|\basolDb(?:Get|Set|Delete)\s*\(/,
    owners: ["src/features/notifications/infrastructure/"],
    use: "the repository and stores in infrastructure/",
  },
  {
    transport: "Web Push browser APIs",
    pattern:
      /\bnavigator\s*\.\s*serviceWorker\b|\bPushManager\b|\bpushManager\b|\bServiceWorkerRegistration\b|\.\s*showNotification\s*\(/,
    owners: [
      "src/features/notifications/infrastructure/web-push/",
      "src/features/notifications/presentation/WebPushController.tsx",
    ],
    use: "the Web Push adapter in infrastructure/web-push/",
  },
  {
    transport: "the service worker registration",
    pattern: /asol-push-sw\.js/,
    owners: ["src/features/notifications/infrastructure/web-push/"],
    use: "the Web Push adapter, which owns registration",
  },
  {
    transport: "Capacitor plugins",
    pattern: /from\s+['"]@(?:capacitor|capacitor-mlkit|capawesome|capgo)\//,
    owners: [],
    use: "the Native Core package (@asol/native-core), through infrastructure/native/",
  },
  {
    transport: "the Native Core notification module",
    pattern: /from\s+['"]@asol\/native-core['"]/,
    owners: [
      "src/features/notifications/infrastructure/native/",
      "src/features/notifications/presentation/NativePushController.tsx",
      "src/features/notifications/tests/",
    ],
    use: "the native services in infrastructure/native/",
  },
  {
    transport: "the Web Push server library",
    pattern: /from\s+['"]web-push['"]|\bwebpush\s*\./,
    owners: ["packages/notifications-core/src/services/providers/"],
    use: "the provider registry in services/providers/",
  },
  {
    transport: "Firebase / FCM credentials",
    pattern:
      /from\s+['"]google-auth-library['"]|from\s+['"]firebase(?:-admin)?['"]|\bFIREBASE_ADMIN_SERVICE_ACCOUNT|\bfcm\.googleapis\.com\b/,
    owners: ["packages/notifications-core/src/services/providers/"],
    use: "the FCM provider in services/providers/",
  },
  {
    transport: "APNs credentials or endpoints",
    pattern: /\bAPNS_(?:TEAM_ID|KEY_ID|PRIVATE_KEY)\b|\bapi\.push\.apple\.com\b/,
    owners: ["packages/notifications-core/src/services/providers/"],
    use: "the APNs provider in services/providers/",
  },
  {
    transport: "the Web Push VAPID key material",
    pattern: /\bWEB_PUSH_VAPID_PRIVATE_KEY\b/,
    owners: ["packages/notifications-core/src/services/providers/"],
    use: "the Web Push provider in services/providers/",
  },
  {
    transport: "raw console logging",
    pattern: /\bconsole\s*\.\s*(?:log|warn|error|info|debug)\s*\(/,
    owners: [
      // The redactor is the logger; it is the one file allowed to call console.
      "src/features/notifications/domain/notification-redaction.ts",
    ],
    use: "notificationLog from domain/notification-redaction.ts, which redacts secrets",
  },
];
