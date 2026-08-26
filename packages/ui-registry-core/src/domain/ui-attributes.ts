import type { UiDataAttributes } from "./ui-data-attributes";
import type { UiDescriptor } from "./ui-descriptor";
import { simulationAttributes } from "./ui-simulation-attributes";
import { statesToValue } from "./ui-state-value";
import { assertUiToken } from "./ui-token";
import { UI_UID_ATTRIBUTE, assertUiUid } from "./ui-uid";

/** Builds DOM-safe attributes. Never write `data-ui-*` literals in JSX. */
export function uiAttributes(descriptor: UiDescriptor): UiDataAttributes {
  const uid = assertUiUid(descriptor.uid);
  const id = assertUiToken(descriptor.id, "UI id");
  const kind = descriptor.kind ?? "component";
  const state = statesToValue(descriptor.state);
  const action = descriptor.action
    ? assertUiToken(descriptor.action, "UI action")
    : undefined;
  const part = descriptor.part ? assertUiToken(descriptor.part, "UI part") : undefined;

  return {
    [UI_UID_ATTRIBUTE]: uid,
    "data-ui": kind,
    "data-ui-id": id,
    ...(state ? { "data-ui-state": state } : {}),
    ...(action ? { "data-ui-action": action } : {}),
    ...(part ? { "data-ui-part": part } : {}),
    ...simulationAttributes(descriptor.simulation),
  };
}
