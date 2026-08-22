import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Freezes the set of client modules allowed to write page-authored content.
 *
 * Every module listed here reaches its write only from inside a
 * `@asol/page-save-core` handle or staged executor. A new entry appearing in
 * this scan means a page grew a write path of its own, which is exactly the
 * regression this file exists to catch — add the write to the registry, not to
 * the list.
 *
 * Writes owned by other packages (cart, favorites, follow, auth, notifications,
 * specialty chat, order lifecycle, telemetry, preferences) are deliberately
 * outside this surface: page-save-core orchestrates page-authored persistence
 * and does not take over another package's responsibility.
 */

const root = process.cwd();
const scanRoots = ["src"];
const skippedDirectories = new Set(["node_modules", "tests", "__tests__", "api"]);

const CONTENT_WRITES = [
  "productApiService.create",
  "productApiService.update",
  "productApiService.delete",
  "productReviewApiService.create",
  "productReviewApiService.update",
  "productReviewApiService.delete",
  "productReviewApiService.reply",
  "productReviewApiService.deleteReply",
  "profileApiService.createReview",
  "profileApiService.updateReview",
  "profileApiService.deleteReview",
  "profileApiService.replyReview",
  "profileApiService.deleteReplyReview",
  "profileService.saveContacts",
  "profileService.saveStoreImages",
  "profileService.saveStoreDetails",
  "profileService.saveSpecialties",
  "profileService.saveFulfillmentSettings",
  "profileService.saveEditor",
  "homeHeroSliderApiService.save",
  "featuredMarqueeApiService.save",
  "trendingRibbonApiService.save",
  "sellerDiscountApiService.save",
  "pharmacyProfileCatalogApi.createCategory",
  "pharmacyProfileCatalogApi.createSubcategory",
  "pharmacyProfileCatalogApi.updateCategory",
  "pharmacyProfileCatalogApi.updateSubcategory",
  "pharmacyProfileCatalogApi.setCategoryStatus",
  "pharmacyProfileCatalogApi.setSubcategoryStatus",
  "pharmacyProfileCatalogApi.setProductStatus",
  "storeAssetsApiService.save",
  "storeAssetsApiService.uploadImage",
  "storeAssetsApiService.deleteImage",
  "storeAssetsApiService.deleteListing",
  "storeAssetsApiService.restoreBackup",
  "persistentSystemLogApiService.clear",
  "accountDeletionApiService.delete",
];

/** Modules that legitimately perform a content write, and the scope that runs it. */
const ALLOWED = new Map<string, string>([
  ["src/features/auth/components/AccountDeletionPageContent.tsx", "account-deletion"],
  [
    "src/features/pharmacy-profile-catalog/components/PharmacyCatalogManagerPage.tsx",
    "pharmacy-catalog-manager",
  ],
  ["src/features/product/presentation/ProductPageContent.tsx", "product-*"],
  ["src/features/product/presentation/ProductReviews.tsx", "product-reviews:*"],
  ["src/features/profile/hooks/use-profile-contacts.ts", "profile-edit"],
  ["src/features/profile/hooks/use-profile-fulfillment-settings.ts", "profile-edit"],
  ["src/features/profile/hooks/use-profile-store-images.ts", "profile-edit"],
  ["src/features/profile/hooks/use-store-details.ts", "profile-edit"],
  ["src/features/profile/presentation/ProductsCard.tsx", "profile-edit"],
  ["src/features/profile/presentation/use-profile-save.ts", "profile-edit"],
  ["src/features/seller-discounts/hooks/use-seller-discounts.ts", "profile-edit"],
  [
    "src/features/super-admin/presentation/SuperAdminFeaturedMarqueePage.tsx",
    "super-admin-featured-marquee",
  ],
  ["src/features/super-admin/presentation/SuperAdminLogsPage.tsx", "super-admin-logs"],
  [
    "src/features/super-admin/presentation/SuperAdminTrendingRibbonPage.tsx",
    "super-admin-trending-ribbon",
  ],
  [
    "src/features/super-admin/presentation/use-super-admin-hero-slider-save.ts",
    "super-admin-hero-slider",
  ],
  [
    "src/features/system-logs/SuperAdminErrorFloatingButton.tsx",
    "system-logs-floating",
  ],
  [
    "src/modules/google-play-console/hooks/use-store-assets.ts",
    "release-console-store-*",
  ],
]);

function collect(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      if (skippedDirectories.has(entry)) continue;
      collect(entryPath, found);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    if (/\.server\.(ts|tsx)$/.test(entry)) continue;
    found.push(entryPath);
  }
  return found;
}

function isServiceDefinition(relativePath: string): boolean {
  return (
    relativePath.includes("/services/") &&
    (relativePath.endsWith("api-service.ts") || relativePath.endsWith("-api.ts"))
  );
}

function testWriteSurfaceIsFrozen() {
  const found = new Set<string>();
  for (const scanRoot of scanRoots) {
    for (const filePath of collect(path.join(root, scanRoot))) {
      const relativePath = path.relative(root, filePath).replace(/\\/g, "/");
      if (isServiceDefinition(relativePath)) continue;
      const source = readFileSync(filePath, "utf8");
      if (CONTENT_WRITES.some((call) => source.includes(call))) {
        found.add(relativePath);
      }
    }
  }

  const unexpected = [...found].filter((entry) => !ALLOWED.has(entry)).sort();
  assert.deepEqual(
    unexpected,
    [],
    "a page grew its own content write; route it through @asol/page-save-core",
  );

  const stale = [...ALLOWED.keys()].filter((entry) => !found.has(entry)).sort();
  assert.deepEqual(stale, [], "the allowlist names modules that no longer write");
}

/** Every allowed writer must sit behind a page-save handle or staged executor. */
function testEveryWriterIsDrivenByTheRegistry() {
  const registryEntry =
    /usePageSaveRegistration\(|usePageSaveOperationScope\(|usePageSaveOperations\(|@asol\/page-save-core/;
  const drivenIndirectly = new Set([
    // Section mutations invoked through the profile controllers, which the
    // `profile-edit` registration owns.
    "src/features/profile/hooks/use-profile-contacts.ts",
    "src/features/profile/hooks/use-profile-fulfillment-settings.ts",
    "src/features/profile/hooks/use-profile-store-images.ts",
    "src/features/profile/hooks/use-store-details.ts",
    "src/features/profile/presentation/use-profile-save.ts",
    "src/features/seller-discounts/hooks/use-seller-discounts.ts",
    // The hero slider save model is called from the page's registration.
    "src/features/super-admin/presentation/use-super-admin-hero-slider-save.ts",
  ]);

  for (const [relativePath] of ALLOWED) {
    if (drivenIndirectly.has(relativePath)) continue;
    const source = readFileSync(path.join(root, relativePath), "utf8");
    assert.match(
      source,
      registryEntry,
      `${relativePath} writes content and must register a page-save scope`,
    );
  }
}

/**
 * No content write may be launched and forgotten. UI-state persistence owned by
 * other packages (a scroll snapshot, a preference) is not in this surface.
 */
function testNoFireAndForgetContentSaves() {
  const offenders = [...ALLOWED.keys()].filter((relativePath) =>
    /void\s+save(Async)?\s*\(/.test(readFileSync(path.join(root, relativePath), "utf8")),
  );
  assert.deepEqual(
    offenders.sort(),
    [],
    "a content save whose result is discarded cannot report success or failure",
  );
}

function main() {
  testWriteSurfaceIsFrozen();
  testEveryWriterIsDrivenByTheRegistry();
  testNoFireAndForgetContentSaves();
  console.log("page-save write surface tests passed.");
}

main();
