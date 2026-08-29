import type { UiPageDefinition } from "./ui-page-definition";
import { assertUiToken } from "./ui-token";
import { assertUiUid } from "./ui-uid";

export type UiPageContextDataAttributes = Readonly<{
  "data-ui-page": string;
  "data-ui-page-uid": string;
}>;

/**
 * Adds page context to a DOM node that already owns its canonical source UID.
 * Unlike `uiPageAttributes`, this helper never writes `data-ui-uid`,
 * `data-ui-id`, or `data-ui`, so it cannot replace the source-site identity.
 */
export function uiPageContextAttributes(page: UiPageDefinition): UiPageContextDataAttributes {
  const id = assertUiToken(page.id, "UI page id");
  return {
    "data-ui-page": id,
    "data-ui-page-uid": assertUiUid(page.uid, "UI page uid"),
  };
}
