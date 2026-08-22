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
const deleteDialog = source("src/features/super-admin/components/SuperAdminUserDeleteDialog.tsx");
const deleteRoute = source("src/app/api/super-admin/users/delete/route.ts");
const userService = source("src/features/super-admin/services/super-admin-user-service.server.ts");

// Verify UI components and route wiring
assert.match(usersPage, /SuperAdminUserDeleteDialog/);
assert.match(usersPage, /\/api\/super-admin\/users\/delete/);
assert.match(usersPage, /deleteUser/);
assert.match(usersPage, /userToDelete/);
assert.match(usersPage, /حذف الحساب/);
assert.match(deleteRoute, /runSuperAdminJsonRoute/);
assert.match(deleteRoute, /deleteUser/);
assert.match(userService, /deleteUser/);
assert.match(userService, /accountDeletionService\.deleteBySuperAdmin/);
assert.match(userService, /persistentSystemLogService\.add/);

// Touch-only UI policy compliance
for (const [name, content] of [
  ["SuperAdminUsersPage", usersPage],
  ["SuperAdminUserDeleteDialog", deleteDialog],
]) {
  assert.equal(
    content.includes("cursor-pointer") || content.includes("cursor: pointer"),
    false,
    `${name} must not contain cursor-pointer`,
  );
  assert.equal(
    content.includes("hover:"),
    false,
    `${name} must not contain hover: variant`,
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
