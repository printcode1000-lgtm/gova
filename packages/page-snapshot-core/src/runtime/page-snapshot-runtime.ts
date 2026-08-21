import {
  PAGE_SNAPSHOT_VERSION,
  type PageSnapshotFormField,
  type PageSnapshotIdentity,
  type PageSnapshotRecord,
  type PageSnapshotRuntimeConfig,
  type RestorePageSnapshotInput,
  type SavePageSnapshotInput,
} from "../domain/page-snapshot.types";
export {
  createPageSnapshotKey,
  normalizeSnapshotRecord,
  queryToRecord,
  stableSerializeSnapshotValue,
} from "./page-snapshot-key";
import {
  createPageSnapshotKey,
  normalizeSnapshotRecord,
  queryToRecord,
} from "./page-snapshot-key";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_FIELD_LENGTH = 5000;
const SENSITIVE_PATTERN =
  /(password|passcode|pin|otp|token|auth|secret|payment|card|credit|debit|cvv|cvc|iban|bank|private)/i;

let snapshotsPaused = false;
let runtimeConfig: PageSnapshotRuntimeConfig | null = null;

export function configurePageSnapshotCore(config: PageSnapshotRuntimeConfig): void {
  runtimeConfig = config;
}

function requireRuntimeConfig(): PageSnapshotRuntimeConfig {
  if (!runtimeConfig) throw new Error("pageSnapshotCoreNotConfigured");
  return runtimeConfig;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function selectorForElement(element: Element): string | null {
  const escape = (value: string) => {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/["\\]/g, "\\$&");
  };
  const explicit = element.getAttribute("data-snapshot-id");
  if (explicit) return `[data-snapshot-id="${escape(explicit)}"]`;
  if (element.id) return `#${escape(element.id)}`;
  const name = element.getAttribute("name");
  if (name) {
    const tag = element.tagName.toLowerCase();
    return `${tag}[name="${escape(name)}"]`;
  }
  return null;
}

export function isSensitiveSnapshotElement(element: Element): boolean {
  const input = element as HTMLInputElement;
  const type = input.type?.toLowerCase();
  const name = element.getAttribute("name") ?? "";
  const id = element.id ?? "";
  const autocomplete = element.getAttribute("autocomplete") ?? "";
  return (
    type === "password" ||
    type === "hidden" ||
    SENSITIVE_PATTERN.test(name) ||
    SENSITIVE_PATTERN.test(id) ||
    SENSITIVE_PATTERN.test(autocomplete) ||
    element.hasAttribute("data-snapshot-sensitive")
  );
}

function captureFormValues(): PageSnapshotFormField[] {
  if (!isBrowser()) return [];
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select",
    ),
  );
  return fields.flatMap((field): PageSnapshotFormField[] => {
    if (field.disabled || isSensitiveSnapshotElement(field)) return [];
    const selector = selectorForElement(field);
    if (!selector) return [];
    if (field instanceof HTMLInputElement) {
      if (field.type === "file") return [];
      if (field.type === "checkbox") return [{ selector, value: field.checked, kind: "input" }];
      if (field.type === "radio") {
        if (!field.checked) return [];
        return [{ selector, value: field.value.slice(0, MAX_FIELD_LENGTH), kind: "input" }];
      }
    }
    if (field instanceof HTMLSelectElement && field.multiple) {
      return [
        {
          selector,
          value: Array.from(field.selectedOptions).map((option) =>
            option.value.slice(0, MAX_FIELD_LENGTH),
          ),
          kind: "select",
        },
      ];
    }
    return [
      {
        selector,
        value: String(field.value ?? "").slice(0, MAX_FIELD_LENGTH),
        kind: field instanceof HTMLTextAreaElement ? "textarea" : field instanceof HTMLSelectElement ? "select" : "input",
      },
    ];
  });
}

function captureElementScroll(): Record<string, { x: number; y: number }> {
  if (!isBrowser()) return {};
  const result: Record<string, { x: number; y: number }> = {};
  document.querySelectorAll<HTMLElement>("[data-snapshot-scroll]").forEach((element) => {
    const snapshotId = element.getAttribute("data-snapshot-id");
    if (snapshotId?.startsWith("profile-edit-")) return;
    const selector = selectorForElement(element);
    if (!selector) return;
    result[selector] = { x: element.scrollLeft, y: element.scrollTop };
  });
  return result;
}

function captureBooleanMap(attribute: string): Record<string, boolean> {
  if (!isBrowser()) return {};
  const result: Record<string, boolean> = {};
  document.querySelectorAll<HTMLElement>(`[${attribute}]`).forEach((element) => {
    const key = element.getAttribute(attribute) || selectorForElement(element);
    if (!key) return;
    if (element instanceof HTMLDetailsElement) result[key] = element.open;
    else result[key] = element.getAttribute("aria-expanded") === "true";
  });
  return result;
}

function captureSelectedItems(): string[] {
  if (!isBrowser()) return [];
  return Array.from(document.querySelectorAll<HTMLElement>('[data-snapshot-selected="true"]'))
    .map((element) => element.getAttribute("data-snapshot-item") || selectorForElement(element))
    .filter((value): value is string => Boolean(value));
}

function captureFocusedElement(): string | null {
  if (!isBrowser()) return null;
  const active = document.activeElement;
  if (!active || active === document.body || isSensitiveSnapshotElement(active)) return null;
  return selectorForElement(active);
}

function buildSnapshot(input: SavePageSnapshotInput): PageSnapshotRecord {
  const { appBuildId } = requireRuntimeConfig();
  const now = Date.now();
  const pathname = input.pathname || (isBrowser() ? window.location.pathname : "/");
  const route = input.route || pathname;
  const params = normalizeSnapshotRecord(input.params);
  const query = queryToRecord(input.query);
  const key = createPageSnapshotKey({ ...input, pathname, route, params, query });
  return {
    key,
    userId: input.userId || "anonymous",
    route,
    pathname,
    params,
    query,
    scroll: {
      x: isBrowser() ? window.scrollX : 0,
      y: isBrowser() ? window.scrollY : 0,
      elements: captureElementScroll(),
    },
    focusedElement: captureFocusedElement(),
    activeTab: input.partial?.activeTab ?? null,
    accordions: { ...captureBooleanMap("data-snapshot-accordion"), ...input.partial?.accordions },
    selectedItems: input.partial?.selectedItems ?? captureSelectedItems(),
    filters: input.partial?.filters ?? {},
    searchText: input.partial?.searchText ?? null,
    sortOptions: input.partial?.sortOptions ?? {},
    pagination: input.partial?.pagination ?? {},
    infiniteScroll: input.partial?.infiniteScroll ?? {},
    expandedSections: {
      ...captureBooleanMap("data-snapshot-expanded"),
      ...input.partial?.expandedSections,
    },
    formValues: captureFormValues(),
    unsavedDraftData: input.partial?.unsavedDraftData ?? {},
    uiState: input.partial?.uiState ?? {},
    componentState: input.partial?.componentState ?? {},
    routeParameters: params,
    queryParameters: query,
    loadedDataCacheRefs: input.partial?.loadedDataCacheRefs ?? [],
    timestamp: now,
    expiresAt: now + (input.ttlMs ?? DEFAULT_TTL_MS),
    snapshotVersion: PAGE_SNAPSHOT_VERSION,
    appBuildId,
  };
}

export function captureSnapshot(input: SavePageSnapshotInput): PageSnapshotRecord | null {
  if (snapshotsPaused) return null;
  return buildSnapshot(input);
}

export async function persistSnapshot(snapshot: PageSnapshotRecord): Promise<PageSnapshotRecord> {
  await requireRuntimeConfig().storage.set(snapshot.key, snapshot);
  return snapshot;
}

export function isSnapshotCompatible(
  snapshot: PageSnapshotRecord,
  expectedVersion = PAGE_SNAPSHOT_VERSION,
): boolean {
  return (
    snapshot.snapshotVersion === expectedVersion &&
    snapshot.expiresAt > Date.now() &&
    snapshot.appBuildId === requireRuntimeConfig().appBuildId
  );
}

export async function saveSnapshot(input: SavePageSnapshotInput): Promise<PageSnapshotRecord | null> {
  const snapshot = captureSnapshot(input);
  return snapshot ? persistSnapshot(snapshot) : null;
}

export async function restoreSnapshot(input: RestorePageSnapshotInput): Promise<PageSnapshotRecord | null> {
  const key = createPageSnapshotKey(input);
  const snapshot = await requireRuntimeConfig().storage.get<PageSnapshotRecord>(key);
  if (!snapshot) return null;
  if (!isSnapshotCompatible(snapshot, input.expectedVersion)) {
    await requireRuntimeConfig().storage.delete(key);
    return null;
  }
  return snapshot;
}

export async function hasSnapshot(input: RestorePageSnapshotInput): Promise<boolean> {
  return Boolean(await restoreSnapshot(input));
}

export async function deleteSnapshot(input: PageSnapshotIdentity | string): Promise<void> {
  const key = typeof input === "string" ? input : createPageSnapshotKey(input);
  await requireRuntimeConfig().storage.delete(key);
}

export async function clearSnapshots(userId?: string): Promise<void> {
  const { storage } = requireRuntimeConfig();
  if (!userId) {
    await storage.clear();
    return;
  }
  const snapshots = await storage.getAll<PageSnapshotRecord>();
  await Promise.all(
    snapshots
      .filter((row) => row.value.userId === userId)
      .map((row) => storage.delete(row.key)),
  );
}

export function pauseSnapshot(): void {
  snapshotsPaused = true;
}

export function resumeSnapshot(): void {
  snapshotsPaused = false;
}

export async function cleanupExpiredSnapshots(): Promise<number> {
  const { storage } = requireRuntimeConfig();
  const snapshots = await storage.getAll<PageSnapshotRecord>();
  const expired = snapshots.filter((row) => !isSnapshotCompatible(row.value));
  await Promise.all(expired.map((row) => storage.delete(row.key)));
  return expired.length;
}

export function applySnapshotToDom(snapshot: PageSnapshotRecord): void {
  if (!isBrowser()) return;
  for (const field of snapshot.formValues) {
    const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      field.selector,
    );
    if (!element || element.disabled || isSensitiveSnapshotElement(element)) continue;
    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = Boolean(field.value);
    } else if (element instanceof HTMLInputElement && element.type === "radio") {
      element.checked = element.value === field.value;
    } else if (element instanceof HTMLSelectElement && element.multiple) {
      const selectedValues = Array.isArray(field.value) ? field.value : [];
      Array.from(element.options).forEach((option) => {
        option.selected = selectedValues.includes(option.value);
      });
    } else {
      element.value = String(field.value ?? "");
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  for (const [selector, scroll] of Object.entries(snapshot.scroll.elements)) {
    if (selector.includes("profile-edit-")) continue;
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.scrollTo({ left: scroll.x, top: scroll.y });
  }

  requestAnimationFrame(() => {
    window.scrollTo({ left: snapshot.scroll.x, top: snapshot.scroll.y });
    if (snapshot.focusedElement) {
      const element = document.querySelector<HTMLElement>(snapshot.focusedElement);
      if (element && !isSensitiveSnapshotElement(element)) element.focus({ preventScroll: true });
    }
  });
}
