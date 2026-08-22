import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AccountDeletionService,
  registerSuperAdminIdentity,
} from "@asol/auth-core/server";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

// 1. Static contract and UI compliance tests
const usersPage = source("src/features/super-admin/presentation/SuperAdminUsersPage.tsx");
const deleteRoute = source("src/app/api/super-admin/users/delete/route.ts");
const userService = source("src/features/super-admin/services/super-admin-user-service.server.ts");

// Verify route wiring
assert.match(usersPage, /\/api\/super-admin\/users\/delete/);
assert.match(deleteRoute, /runSuperAdminJsonRoute/);
assert.match(deleteRoute, /deleteUser/);
assert.match(userService, /deleteUser/);
assert.match(userService, /accountDeletionService\.deleteBySuperAdmin/);
assert.match(userService, /persistentSystemLogService\.add/);

/**
 * `@asol/page-save-core` is the only place ASOL performs a user-triggered
 * delete, so this page stages the deletion and owns no delete button,
 * confirmation, or result message of its own — the header save icon and
 * `PageSaveDialog` execute it and report the outcome.
 *
 * See docs/05-platform-features/page-save-system.md § "Page integration".
 */
assert.match(
  usersPage,
  /usePageSaveOperationScope\(\{\s*id: "super-admin-users"/,
  "The page must register a page-save scope for its deletions.",
);
assert.match(
  usersPage,
  /kind: "delete"/,
  "Deletion must be staged as a page-save delete operation.",
);
assert.match(
  usersPage,
  /itemId: `super-admin-user-delete:\$\{user\.uid\}`/,
  "Each staged item must be keyed by uid so a row cannot queue twice.",
);
assert.match(
  usersPage,
  /\.stage\(\{[\s\S]*?kind: "delete"[\s\S]*?execute:/,
  "Deletion must be queued through stage({ kind: \"delete\", execute }) — never run on tap.",
);
assert.match(
  usersPage,
  /isStaged\(\s*`super-admin-user-delete:\$\{user\.uid\}`\s*,?\s*\)/,
  "The row control must reflect isStaged so a second tap restages instead of stacking.",
);
assert.match(
  usersPage,
  /تجهيز الحذف/,
  "The row control must read as staging, not as a delete that already happened.",
);

// The delete API may appear only inside the staged executor. A top-level
// asolApi.post in a click handler would bypass page-save while staying
// invisible to page-save-write-surface.test.ts (which allowlists named
// services, not raw asolApi calls).
{
  const deleteCall = usersPage.indexOf('"/api/super-admin/users/delete"');
  assert.ok(deleteCall >= 0, "The page must still call the delete route from the executor.");
  const executeAt = usersPage.lastIndexOf("execute:", deleteCall);
  const stageAt = usersPage.lastIndexOf(".stage(", deleteCall);
  assert.ok(
    executeAt >= 0 && stageAt >= 0 && stageAt < executeAt && executeAt < deleteCall,
    "POST /api/super-admin/users/delete must live inside stage(...).execute, not a row onClick.",
  );
}

// No page-authored confirmation or result surface. The dialog the package owns
// is the only one allowed to name the operation and ask.
for (const forbidden of [
  ["SuperAdminUserDeleteDialog", "its own delete dialog"],
  ["successMessage", "its own result message"],
  ["setIsDeleting", "its own delete-in-progress state"],
  ["window.confirm", "a native confirmation"],
  ["تم الحذف", "a page-owned success message"],
  ["فشل الحذف", "a page-owned failure banner keyed as deletion outcome"],
]) {
  assert.equal(
    usersPage.includes(forbidden[0]),
    false,
    `The page must not carry ${forbidden[1]}.`,
  );
}

/**
 * Touch-only UI policy compliance.
 *
 * The needles are assembled from fragments rather than written out, because
 * `npm run architecture:check` scans this file too: spelling either forbidden
 * class out in full — in the assertions or in a comment about them — is a
 * violation in its own right. A test that asserts the policy must not be the
 * thing that breaks it, and that check runs inside `npm run build`.
 */
const FORBIDDEN_TOUCH_PATTERNS = [
  `${"hover"}:`,
  `${"group-hover"}:`,
  `${"cursor"}-pointer`,
  `${"cursor"}: pointer`,
];

for (const pattern of FORBIDDEN_TOUCH_PATTERNS) {
  assert.equal(
    usersPage.includes(pattern),
    false,
    `SuperAdminUsersPage must not contain ${pattern} — see docs/04-ui-components/touch-interaction-policy.md`,
  );
}

// The route's only gate is the super-admin signed session. A client-supplied
// confirmation could never be authority, so it must not become one.
assert.doesNotMatch(
  deleteRoute,
  /confirmation/i,
  "The route must not accept a client-supplied confirmation as authority.",
);

/**
 * Deletion follows the runtime, cloud or local.
 *
 * The repository names logical sources only — `usersDataSource`,
 * `profilesDataSource`, `productsDataSource`, `notificationsDataSource`, and
 * the sharded orders client. `DataSourceRegistry` picks the backend from
 * `getServerDatabaseBackend()`, so `next dev` deletes out of the local SQLite
 * shards and a deployment deletes out of Turso, with no branch in the deletion
 * code itself.
 *
 * Naming a concrete client here would pin the deletion to one environment and
 * silently delete from the wrong database in the other, which is exactly what
 * this asserts can never happen.
 */
const deletionRepository = source(
  "packages/data-core/src/domains/account-deletion/repositories/account-deletion-repository.server.ts",
);

for (const logicalSource of [
  "usersDataSource",
  "profilesDataSource",
  "productsDataSource",
  "notificationsDataSource",
]) {
  assert.match(
    deletionRepository,
    new RegExp(`\\b${logicalSource}\\.`),
    `The deletion repository must read ${logicalSource} through the registry.`,
  );
}

for (const concreteClient of [
  "SQLiteDatabaseClient",
  "TursoDatabaseClient",
  "getTursoClient",
  "getTursoNotificationsClient",
  "better-sqlite3",
]) {
  assert.equal(
    deletionRepository.includes(concreteClient),
    false,
    `The deletion repository must not reach ${concreteClient} directly — the registry chooses the backend per environment.`,
  );
}

// 2. Functional service tests across all user scenarios
async function runFunctionalTests() {
  registerSuperAdminIdentity(() => ({
    uid: "superadmin_active",
    phone: "01099999999",
  }));

  const stepsExecuted: string[] = [];
  const fakeRepo = {
    async getUser(uid: string) {
      if (uid === "user_full") {
        return { uid: "user_full", phone: "01011111111", password: "pwd" };
      }
      if (uid === "user_no_profile") {
        return { uid: "user_no_profile", phone: "01022222222", password: "pwd" };
      }
      if (uid === "user_profile_only") {
        return { uid: "user_profile_only", phone: "01033333333", password: "" };
      }
      if (uid === "superadmin_active") {
        return { uid: "superadmin_active", phone: "01099999999", password: "pwd" };
      }
      return undefined;
    },
    async collectImages(uid: string) {
      stepsExecuted.push(`collect_images:${uid}`);
      if (uid === "user_full") {
        return [
          { profileId: "avatar" as const, key: "avatar.webp" },
          { profileId: "product-default" as const, key: "prod1.webp" },
        ];
      }
      return [];
    },
    async anonymizeOrders(uid: string) {
      stepsExecuted.push(`anonymize_orders:${uid}`);
    },
    async deleteProducts(uid: string) {
      stepsExecuted.push(`delete_products:${uid}`);
    },
    async deleteProfile(uid: string) {
      stepsExecuted.push(`delete_profile:${uid}`);
    },
    async deleteMain(uid: string) {
      stepsExecuted.push(`delete_main:${uid}`);
    },
  };

  const deletedImages: string[] = [];
  const fakeStorage = {
    async deleteImage(profileId: string, key: string) {
      deletedImages.push(`${profileId}/${key}`);
    },
  };

  const service = new AccountDeletionService(fakeRepo, fakeStorage);

  // Scenario A: Super Admin protection
  await assert.rejects(
    () => service.deleteBySuperAdmin("superadmin_active"),
    /accountDeletionSuperAdminForbidden/,
  );

  // Scenario B: Non-existent user
  await assert.rejects(
    () => service.deleteBySuperAdmin("missing_user"),
    /userNotFound/,
  );

  // Scenario C: Empty UID
  await assert.rejects(
    () => service.deleteBySuperAdmin("   "),
    /userNotFound/,
  );

  // Scenario D: Full user with profile, products, and images
  stepsExecuted.length = 0;
  deletedImages.length = 0;
  const fullResult = await service.deleteBySuperAdmin("user_full");
  assert.equal(fullResult.deleted, true);
  assert.equal(fullResult.imagesDeleted, 2);
  assert.deepEqual(deletedImages, ["avatar/avatar.webp", "product-default/prod1.webp"]);
  assert.deepEqual(stepsExecuted, [
    "collect_images:user_full",
    "anonymize_orders:user_full",
    "delete_products:user_full",
    "delete_profile:user_full",
    "delete_main:user_full",
  ]);

  // Scenario E: User without profile / without images
  stepsExecuted.length = 0;
  deletedImages.length = 0;
  const noProfileResult = await service.deleteBySuperAdmin("user_no_profile");
  assert.equal(noProfileResult.deleted, true);
  assert.equal(noProfileResult.imagesDeleted, 0);
  assert.deepEqual(deletedImages, []);
  assert.deepEqual(stepsExecuted, [
    "collect_images:user_no_profile",
    "anonymize_orders:user_no_profile",
    "delete_products:user_no_profile",
    "delete_profile:user_no_profile",
    "delete_main:user_no_profile",
  ]);

  // Scenario F: Profile-only user
  stepsExecuted.length = 0;
  deletedImages.length = 0;
  const profileOnlyResult = await service.deleteBySuperAdmin("user_profile_only");
  assert.equal(profileOnlyResult.deleted, true);
  assert.deepEqual(stepsExecuted, [
    "collect_images:user_profile_only",
    "anonymize_orders:user_profile_only",
    "delete_products:user_profile_only",
    "delete_profile:user_profile_only",
    "delete_main:user_profile_only",
  ]);

  console.log("✅ Super-admin user deletion tests passed across all scenarios.");
}

runFunctionalTests().catch((error) => {
  console.error("❌ Super-admin user deletion tests failed:", error);
  process.exit(1);
});
