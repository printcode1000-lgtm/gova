import { readFileSync, writeFileSync } from "node:fs";

function replaceExact(file, before, after, expected = 1) {
  const source = readFileSync(file, "utf8");
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${file}: expected ${expected} exact match(es), found ${count}`);
  writeFileSync(file, source.split(before).join(after), "utf8");
}

function removeBlock(file, before) {
  replaceExact(file, before, "");
}

// Product favorite: preserve the original simulation UID/metadata at its only source usage site.
{
  const file = "src/features/product/presentation/ProductPageContent.tsx";
  replaceExact(file, 'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";', 'import { uiAttributes } from "@asol/ui-registry-core";');
  removeBlock(file, '\nconst PRODUCT_FAVORITE_UI: UiDescriptor = { uid: "product-favorite-6pOZr6", id: "product-favorite", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "product-favorite" } };');
  replaceExact(
    file,
    '<FavoriteButton ui={{ uid: "product.product-page-content.favorite-button-9EFxY9", id: "product.product-page-content.favorite-button" }}\n        item={favoriteFromProductCard(createProductCardViewModel(product))}\n        label={locale === "ar" ? "المفضلة" : "Favorite"}\n        className="h-10 w-auto gap-2 rounded-xl px-4"\n        ui={PRODUCT_FAVORITE_UI}',
    '<FavoriteButton ui={{ uid: "product-favorite-6pOZr6", id: "product-favorite", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "product-favorite" } }}\n        item={favoriteFromProductCard(createProductCardViewModel(product))}\n        label={locale === "ar" ? "المفضلة" : "Favorite"}\n        className="h-10 w-auto gap-2 rounded-xl px-4"',
  );
}

// Add-to-cart: preserve the original target UID/metadata at the only order-control source site.
{
  const file = "src/features/product/presentation/ProductComponentsRenderer.tsx";
  replaceExact(file, 'import type { UiDescriptor } from "@asol/ui-registry-core";\n', '');
  removeBlock(file, '\nconst PRODUCT_ADD_CART_UI: UiDescriptor = { uid: "product-add-cart-IC6TTn", id: "product-add-cart", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "product-add-cart" } };');
  replaceExact(
    file,
    '<ProductAddToCartButton ui={{ uid: "product.product-components-renderer.product-add-to-cart-button-tZF3xB", id: "product.product-components-renderer.product-add-to-cart-button" }}\n                    productId={productId}\n                    sellerId={ownerUid}\n                    product={product}\n                    mainCategoryId={mainCategoryId}\n                    ui={PRODUCT_ADD_CART_UI}',
    '<ProductAddToCartButton ui={{ uid: "product-add-cart-IC6TTn", id: "product-add-cart", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "product-add-cart" } }}\n                    productId={productId}\n                    sellerId={ownerUid}\n                    product={product}\n                    mainCategoryId={mainCategoryId}',
  );
}

// Notification permission: the scenario means the explicit permission recheck button.
// The device enabled row is a different source site and therefore keeps its own UID.
{
  const file = "src/features/settings/presentation/NotificationDeviceToggleSection.tsx";
  replaceExact(file, 'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";', 'import { uiAttributes } from "@asol/ui-registry-core";');
  removeBlock(file, '\nconst NOTIFICATIONS_PERMISSION_UI: UiDescriptor = { uid: "notifications-permission-2Bg0Jo", id: "notifications-permission", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "notifications-permission" } };');
  replaceExact(
    file,
    '<button {...uiAttributes({ uid: "settings.notification-device-toggle-section.button.3-SX5hGt", id: "settings.notification-device-toggle-section.button.3" })} {...uiAttributes(NOTIFICATIONS_PERMISSION_UI)}',
    '<button {...uiAttributes({ uid: "notifications-permission-2Bg0Jo", id: "notifications-permission", kind: "action", action: "recheck-permission", part: "permission", interaction: { type: "tap" }, simulation: { kind: "event", id: "notifications-permission" } })}',
  );
  replaceExact(
    file,
    '<SettingsToggleRow ui={{ uid: "settings.notification-device-toggle-section.settings-toggle-row.2-kPpF7v", id: "settings.notification-device-toggle-section.settings-toggle-row.2" }} id="settings.notification-device-toggle-section.settings-toggle-row"\n          ui={NOTIFICATIONS_PERMISSION_UI}',
    '<SettingsToggleRow ui={{ uid: "settings.notification-device-toggle-section.settings-toggle-row.2-kPpF7v", id: "settings.notification-device-toggle-section.settings-toggle-row.2", kind: "action", action: "toggle-device-notifications", part: "device" }} id="settings.notification-device-toggle-section.settings-toggle-row"',
  );
}

function migrateIntervalPresets(file, oldTypeImport, sourceUid, sourceId) {
  replaceExact(file, oldTypeImport, '');
  replaceExact(file, 'import { uiAttributes } from "@asol/ui-registry-core";', 'import { createUiInstanceId, uiAttributes } from "@asol/ui-registry-core";');
  const source = readFileSync(file, "utf8");
  const startMarker = '/** One descriptor per preset value; the identity is the interval itself. */\nconst INTERVAL_PRESETS = [5, 15, 30, 60] as const;\n\nconst INTERVAL_PRESET_UI:';
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${file}: preset map start not found`);
  const mapEnd = source.indexOf('};\n\nexport function', start);
  if (mapEnd < 0) throw new Error(`${file}: preset map end not found`);
  const replacement = '/** Stable authored preset values; one source UID is distinguished by runtime instance. */\nconst INTERVAL_PRESETS = [5, 15, 30, 60] as const;\n\n';
  writeFileSync(file, `${source.slice(0, start)}${replacement}${source.slice(mapEnd + 3)}`, "utf8");
  replaceExact(
    file,
    'ui={INTERVAL_PRESET_UI[interval]}\n              key={interval} ui={{ uid: "' + sourceUid + '", id: "' + sourceId + '" }}',
    'key={interval} ui={{ uid: "' + sourceUid + '", id: "' + sourceId + '", kind: "action", action: "set-check-interval", part: "settings", instance: createUiInstanceId(String(interval)) }}',
  );
}

migrateIntervalPresets(
  "src/features/super-admin/presentation/SuperAdminFeaturedMarqueePage.tsx",
  'import type { UiDescriptor } from "@asol/ui-registry-core";\n',
  "super-admin.super-admin-featured-marquee-page.button.5-bYj3oC",
  "super-admin.super-admin-featured-marquee-page.button.5",
);
migrateIntervalPresets(
  "src/features/super-admin/presentation/SuperAdminHeroSliderPage.tsx",
  'import type { UiDescriptor } from "@asol/ui-registry-core";\n',
  "super-admin.super-admin-hero-slider-page.button.2-C5IFNH",
  "super-admin.super-admin-hero-slider-page.button.2",
);
migrateIntervalPresets(
  "src/features/super-admin/presentation/SuperAdminTrendingRibbonPage.tsx",
  'import type { UiDescriptor } from "@asol/ui-registry-core";\n',
  "super-admin.super-admin-trending-ribbon-page.button.5-8V7GNP",
  "super-admin.super-admin-trending-ribbon-page.button.5",
);

console.log("Simple computed UI cleanup applied.");
