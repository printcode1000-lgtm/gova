/**
 * Tooling-only UiRegistry exports.
 *
 * Source-location inventories are intentionally kept out of the package's
 * browser/runtime door. Build, audit and migration scripts may import this
 * subpath explicitly when they need the generated catalog.
 */
export type { UiUidCatalogEntry } from "./registry/ui-uid-catalog-entry";
export { UI_UID_INVENTORY } from "./registry/generated/ui-uid-inventory";
