import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  pickRandomSimulationImage,
  resolveSimulationRuntime,
  SIMULATION_SCENARIOS,
  SIMULATION_USERS,
  USER_PAGE_REGISTRY,
} from "../index";

const manifest = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports), [".", "./discovery"]);

assert.equal(SIMULATION_USERS.length, 9);
assert.equal(new Set(SIMULATION_USERS.map((user) => user.phone)).size, 9);
assert.deepEqual(
  SIMULATION_USERS.map((user) => user.password),
  ["1111", "2222", "3333", "1111", "2222", "3333", "1111", "2222", "3333"],
);
assert.deepEqual(
  SIMULATION_USERS.map((user) => user.storeName),
  ["مشتري 1", "مشتري 2", "مشتري 3", "بائع 1", "بائع 2", "بائع 3", "خدمة توصيل 1", "خدمة توصيل 2", "خدمة توصيل 3"],
);

assert.equal(SIMULATION_SCENARIOS.length, 0, "Version one scenarios must remain empty.");
assert.equal(new Set(USER_PAGE_REGISTRY.map((page) => page.route)).size, USER_PAGE_REGISTRY.length);
assert.ok(USER_PAGE_REGISTRY.length > 20);
for (const page of USER_PAGE_REGISTRY) {
  assert.ok(page.interactions.length > 0, `${page.route} must expose at least page loading.`);
  assert.equal(new Set(page.interactions.map((event) => event.id)).size, page.interactions.length);
  for (const interaction of page.interactions) {
    for (const action of interaction.actions) {
      assert.ok(!("selector" in action), `${page.id}:${interaction.id} must use typed simulation targets.`);
    }
  }
}

const registrySource = readFileSync(new URL("../registries/user-page-registry.ts", import.meta.url), "utf8");
assert.doesNotMatch(registrySource, /\bselector\b/, "Simulation registry must not use CSS selectors.");
assert.doesNotMatch(registrySource, /data-simulation-event/, "Simulation registry must use typed targets.");

const repositoryRoot = process.cwd();
const instrumentedSourceFiles = [
  "packages/storage-image-manager-core/src/components/StorageImageManager.tsx",
  "src/app/favorites/page.tsx",
  "src/app/privacy-policy/page.tsx",
  "src/features/advertisements/presentation/HeroSliderSlide.tsx",
  "src/features/auth/presentation/AccountDeletionPageContent.tsx",
  "src/features/auth/presentation/LoginPageContent.tsx",
  "src/features/auth/presentation/RegistrationPageContent.tsx",
  "src/features/cart/presentation/CartPageContent.tsx",
  "src/features/cart/presentation/ProductAddToCartButton.tsx",
  "src/features/categories/presentation/CategorySubcategoriesPage.tsx",
  "src/features/categories/presentation/CollectionSubcategoriesPage.tsx",
  "src/features/categories/presentation/DoctorAppointmentSellersPageContent.tsx",
  "src/features/categories/presentation/SellersPageContent.tsx",
  "src/features/contact/presentation/ContactPageContent.tsx",
  "src/features/favorites/presentation/FavoriteButton.tsx",
  "src/features/follow/presentation/FollowButton.tsx",
  "src/features/home/presentation/CategoriesGrid.tsx",
  "src/features/notifications/presentation/NotificationsPageContent.tsx",
  "src/features/orders/presentation/OrderActionButton.tsx",
  "src/features/orders/presentation/OrdersPageContent.tsx",
  "src/features/page-save/presentation/PageSaveHeaderButton.tsx",
  "src/features/password-recovery/presentation/PasswordRecoveryPageContent.tsx",
  "src/features/pharmacy-profile-catalog/presentation/PharmacyCatalogManagerPage.tsx",
  "src/features/pharmacy-profile-catalog/presentation/catalog-manager/PharmacyCatalogManagerPage.dialogs.tsx",
  "src/features/product-card/presentation/ProductCard.tsx",
  "src/features/product-search/presentation/panel/ProductSearchPanel.tsx",
  "src/features/product-search/presentation/panel/ProductSearchResults.tsx",
  "src/features/product/presentation/ProductComponentsRenderer.tsx",
  "src/features/product/presentation/ProductPageContent.tsx",
  "src/features/product/presentation/product-reviews/ProductReviewsSummary.tsx",
  "src/features/profile/presentation/CustomRequestPageContent.tsx",
  "src/features/profile/presentation/ProfilePreviewContent.tsx",
  "src/features/seller-card/presentation/SellerCard.tsx",
  "src/features/settings/presentation/AccountDevicesSection.tsx",
  "src/features/settings/presentation/NotificationDeviceToggleSection.tsx",
  "src/features/settings/presentation/SelfTestNotificationButton.tsx",
  "src/features/settings/presentation/SettingsPageContent.tsx",
  "src/features/settings/presentation/SettingsToggleRow.tsx",
  "src/features/specialty-chat/presentation/ChatThreadPageContent.tsx",
  "src/features/specialty-chat/presentation/SpecialtyRequestPageContent.tsx",
  "src/shared/layouts/AppHeader.tsx",
  "src/shared/ui/toggle-switch.tsx",
];
const sourceFiles = instrumentedSourceFiles
  .map((file) => readFileSync(join(repositoryRoot, file), "utf8"))
  .join("\n");

assert.doesNotMatch(sourceFiles, /data-simulation-event/, "Simulation DOM instrumentation must use typed attributes.");
for (const page of USER_PAGE_REGISTRY) {
  for (const interaction of page.interactions) {
    for (const action of interaction.actions) {
      if (action.type === "wait") continue;
      const attribute =
        action.target.kind === "event"
          ? "data-simulation-target"
          : action.target.kind === "field"
            ? "data-simulation-field"
            : action.target.kind === "list-item"
              ? "data-simulation-list-item"
              : "data-simulation-file";
      assert.ok(sourceFiles.includes(attribute), `${attribute} must exist in source instrumentation.`);
      assert.ok(
        sourceFiles.includes(`"${action.target.id}"`) || sourceFiles.includes(`'${action.target.id}'`),
        `${page.id}:${interaction.id} target ${action.target.kind}:${action.target.id} must have source instrumentation.`,
      );
    }
  }
}

assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "web" }), "static-out");
assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "android" }), "android");
assert.equal(resolveSimulationRuntime({ deployment: "static-export", platform: "ios" }), "ios");
assert.equal(resolveSimulationRuntime({ deployment: "local-development", platform: "web" }), "development");
assert.equal(resolveSimulationRuntime({ deployment: "web-production", platform: "web" }), "production");

const selected = pickRandomSimulationImage(["/catalog/a.webp"]);
assert.equal(selected, "/catalog/a.webp");
assert.throws(() => pickRandomSimulationImage([]), /simulationImagePoolEmpty/);

console.log(
  `@asol/simulation-core contract: ${USER_PAGE_REGISTRY.length} user pages, ` +
    `${USER_PAGE_REGISTRY.reduce((total, page) => total + page.interactions.length, 0)} events, 9 users, 0 scenarios.`,
);
