export const OVERLAY_CHROME_ATTRIBUTE = "data-asol-overlay-chrome";
export const INSPECTOR_CONTROL_ATTRIBUTE = "data-asol-ui-inspector-control";

type ClosestLike = {
  getAttribute?: (name: string) => string | null;
  parentElement?: ClosestLike | null;
};

function asClosestLike(target: EventTarget | null | undefined): ClosestLike | null {
  if (!target || typeof target !== "object") return null;
  const candidate = target as ClosestLike;
  if (typeof candidate.getAttribute === "function") return candidate;
  return candidate.parentElement ?? null;
}

function isChromeNode(node: ClosestLike): boolean {
  const overlay = node.getAttribute?.(OVERLAY_CHROME_ATTRIBUTE);
  if (overlay === "" || overlay === "true") return true;
  const inspector = node.getAttribute?.(INSPECTOR_CONTROL_ATTRIBUTE);
  return inspector === "" || inspector === "true";
}

export function isOverlayChromeTarget(target: EventTarget | null | undefined): boolean {
  let current = asClosestLike(target);
  while (current) {
    if (isChromeNode(current)) return true;
    current = current.parentElement ?? null;
  }
  return false;
}

function isDialogLayerTarget(target: EventTarget | null | undefined): boolean {
  let current = asClosestLike(target);
  while (current) {
    if (current.getAttribute?.("role") === "dialog") return true;
    current = current.parentElement ?? null;
  }
  return false;
}

/** Overlay chrome or another project dialog — outside dismiss must not close the host. */
export function isOutsideDismissExempt(target: EventTarget | null | undefined): boolean {
  return isOverlayChromeTarget(target) || isDialogLayerTarget(target);
}

type DismissEvent = {
  preventDefault: () => void;
  target?: EventTarget | null;
  detail?: { originalEvent?: { target?: EventTarget | null } };
};

export function preventDismissForOverlayChrome(event: DismissEvent): void {
  const originalTarget = event.detail?.originalEvent?.target ?? event.target;
  if (isOverlayChromeTarget(originalTarget)) event.preventDefault();
}
