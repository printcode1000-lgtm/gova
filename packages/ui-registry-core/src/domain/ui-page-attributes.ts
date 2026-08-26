import type { UiDataAttributes } from "./ui-data-attributes";
import type { UiPageDefinition } from "./ui-page-definition";
import { assertUiToken } from "./ui-token";
import { UI_UID_ATTRIBUTE, assertUiUid } from "./ui-uid";

/** Applies a registered page identity to the page's own surface element. */
export function uiPageAttributes(page: UiPageDefinition): UiDataAttributes {
  const id = assertUiToken(page.id, "UI page id");
  return {
    [UI_UID_ATTRIBUTE]: assertUiUid(page.uid, "UI page uid"),
    "data-ui": "page",
    "data-ui-id": id,
    "data-ui-page": id,
  };
}
