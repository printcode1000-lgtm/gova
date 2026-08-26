/**
 * `@asol/ui-registry-core` — the single public door of the UiRegistry.
 *
 * UI attributes are browser-safe diagnostic metadata only. They never contain
 * resource values, user input, tokens, phone numbers, or any other sensitive
 * data, and this package depends on no runtime, framework, or platform global.
 */
export type { UiState } from "./domain/ui-state";
export type { UiElementKind } from "./domain/ui-element-kind";
export type {
  UiSimulationTarget,
  UiSimulationTargetKind,
} from "./domain/ui-simulation-target";
export type { UiDescriptor } from "./domain/ui-descriptor";
export type { UiPageDefinition } from "./domain/ui-page-definition";
export type { UiDataAttributes } from "./domain/ui-data-attributes";
export type { UiUid } from "./domain/ui-uid";
export {
  UI_UID_ATTRIBUTE,
  UI_UID_SUFFIX_LENGTH,
  assertUiUid,
  isUiUid,
  isUiUidPrefix,
  isUiUidSuffix,
  parseUiUid,
} from "./domain/ui-uid";
export type { UiUidRandom } from "./domain/ui-uid-generator";
export { createUiUid, generateUiUid, uiUidSuffix } from "./domain/ui-uid-generator";
export { uiAttributes } from "./domain/ui-attributes";
export { uiComponentAttributes } from "./domain/ui-component-attributes";
export { uiPageAttributes } from "./domain/ui-page-attributes";
export { UI_PAGE_REGISTRY } from "./registry/ui-page-registry";
export { resolveUiPage } from "./registry/resolve-ui-page";
