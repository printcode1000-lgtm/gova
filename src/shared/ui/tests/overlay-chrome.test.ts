import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  INSPECTOR_ACTIVE_ATTRIBUTE,
  OVERLAY_CHROME_ATTRIBUTE,
  isInspectorActive,
  isOutsideDismissExempt,
  isOverlayChromeTarget,
  preventDismissForOverlayChrome,
} from "../overlay-chrome";

type Probe = {
  getAttribute?: (name: string) => string | null;
  parentElement?: Probe | null;
};

function node(attributes: Record<string, string> = {}, parent: Probe | null = null): Probe {
  return {
    getAttribute(name) {
      return name in attributes ? attributes[name] : null;
    },
    parentElement: parent,
  };
}

const chrome = node({ [OVERLAY_CHROME_ATTRIBUTE]: "true" });
const child = node({}, chrome);
const inspectorControl = node({ "data-asol-ui-inspector-control": "true" });
const page = node({});

assert.equal(isOverlayChromeTarget(null), false);
assert.equal(isOverlayChromeTarget({} as EventTarget), false);
assert.equal(isOverlayChromeTarget(page as EventTarget), false);
assert.equal(isOverlayChromeTarget(chrome as EventTarget), true);
assert.equal(isOverlayChromeTarget(child as EventTarget), true);
assert.equal(isOverlayChromeTarget(inspectorControl as EventTarget), true);
assert.equal(
  isOverlayChromeTarget({ parentElement: chrome } as EventTarget),
  true,
);

const saveDialog = node({ role: "dialog" });
const saveControl = node({}, saveDialog);
assert.equal(isOutsideDismissExempt(null), false);
assert.equal(isOutsideDismissExempt(page as EventTarget), false);
assert.equal(isOutsideDismissExempt(chrome as EventTarget), true);
assert.equal(isOutsideDismissExempt(saveControl as EventTarget), true);

let prevented = false;
preventDismissForOverlayChrome({
  preventDefault() {
    prevented = true;
  },
  target: page as EventTarget,
});
assert.equal(prevented, false);

preventDismissForOverlayChrome({
  preventDefault() {
    prevented = true;
  },
  target: page as EventTarget,
  detail: { originalEvent: { target: child as EventTarget } },
});
assert.equal(prevented, true);

const overlayHit = node({});
prevented = false;
preventDismissForOverlayChrome({
  preventDefault() {
    prevented = true;
  },
  target: overlayHit as EventTarget,
  detail: {
    originalEvent: {
      target: overlayHit as EventTarget,
      composedPath() {
        return [child as EventTarget];
      },
    },
  },
});
assert.equal(prevented, true);

const inactiveRoot = node({});
assert.equal(isInspectorActive(inactiveRoot), false);
assert.equal(isInspectorActive(node({ [INSPECTOR_ACTIVE_ATTRIBUTE]: "true" })), true);

prevented = false;
preventDismissForOverlayChrome(
  {
    preventDefault() {
      prevented = true;
    },
    target: overlayHit as EventTarget,
  },
  node({ [INSPECTOR_ACTIVE_ATTRIBUTE]: "true" }),
);
assert.equal(prevented, true);

const root = process.cwd();
const dialogSource = readFileSync(path.join(root, "src/shared/ui/dialog.tsx"), "utf8");
assert.match(dialogSource, /preventDismissForOverlayChrome\(event\)/);
assert.match(dialogSource, /onPointerDownOutside/);
assert.match(dialogSource, /onInteractOutside/);
assert.match(dialogSource, /onFocusOutside/);

const dropdownSource = readFileSync(
  path.join(root, "src/shared/ui/dropdown-menu.tsx"),
  "utf8",
);
assert.match(dropdownSource, /preventDismissForOverlayChrome\(event\)/);
assert.match(dropdownSource, /onPointerDownOutside/);
assert.match(dropdownSource, /onInteractOutside/);
assert.match(dropdownSource, /onFocusOutside/);

const inspectorSource = readFileSync(
  path.join(root, "src/features/super-admin/presentation/SuperAdminUiAttributeInspector.tsx"),
  "utf8",
);
assert.match(inspectorSource, /OverlayChromeBranch/);
assert.match(inspectorSource, /INSPECTOR_ACTIVE_ATTRIBUTE/);

const branchSource = readFileSync(
  path.join(root, "src/shared/ui/overlay-chrome-branch.tsx"),
  "utf8",
);
assert.match(branchSource, /DismissableLayerBranch/);

const errorButtonSource = readFileSync(
  path.join(root, "src/features/system-logs/application/SuperAdminErrorFloatingButton.tsx"),
  "utf8",
);
assert.match(errorButtonSource, /OverlayChromeBranch/);
assert.match(errorButtonSource, /isOverlayChromeTarget/);

const developerBadgeSource = readFileSync(
  path.join(root, "src/features/dev-tools/presentation/DeveloperBadge.tsx"),
  "utf8",
);
assert.match(developerBadgeSource, /OverlayChromeBranch/);

const sidebarSource = readFileSync(
  path.join(root, "src/shared/layouts/AppSidebar.tsx"),
  "utf8",
);
assert.match(sidebarSource, /isOutsideDismissExempt/);
assert.match(sidebarSource, /allowOutsideClick/);

console.log("overlay chrome keeps project dialogs and the sidebar open.");
