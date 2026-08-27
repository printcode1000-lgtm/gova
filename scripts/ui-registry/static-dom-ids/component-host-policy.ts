/**
 * JSX component names that never own a document host of their own.
 * Usage-site HTML ids would not land on a visible root.
 */
export const NON_DOM_ROOT_COMPONENTS: ReadonlySet<string> = new Set([
  "Fragment",
  "Suspense",
  "StrictMode",
  "Profiler",
  "Activity",
  "ViewTransition",
  "Select",
  "SelectGroup",
  "SelectValue",
  "Dialog",
  "DialogPortal",
  "Tabs",
  "DropdownMenu",
  "DropdownMenuPortal",
  "DropdownMenuSub",
  "DropdownMenuRadioGroup",
  "RadioGroup",
  "Slot",
  "Controller",
  "FormProvider",
  "StorageImageManager",
  "FocusTrap",
]);

export function isNonDomRootComponent(name: string): boolean {
  if (NON_DOM_ROOT_COMPONENTS.has(name)) return true;
  return name.endsWith("Provider") || name.endsWith("Context");
}

export function semanticHostToken(tag: string): string {
  return tag
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isSharedUiFile(relativePath: string): boolean {
  return relativePath.replace(/\\/g, "/").startsWith("src/shared/ui/");
}
