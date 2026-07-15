'use client';

import { publicEnv } from '@/core/config/public-env';
import {
  ASOL_DB_STORES,
  asolDbClearStore,
  asolDbDelete,
  asolDbGet,
  asolDbGetAll,
  asolDbSet,
} from '@/lib/asol-db';
import {
  PAGE_SNAPSHOT_VERSION,
  type PageSnapshotFormField,
  type PageSnapshotIdentity,
  type PageSnapshotRecord,
  type RestorePageSnapshotInput,
  type SavePageSnapshotInput,
} from '../entities/page-snapshot.types';

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_FIELD_LENGTH = 5000;
const SENSITIVE_PATTERN =
  /(password|passcode|pin|otp|token|auth|secret|payment|card|credit|debit|cvv|cvc|iban|bank|private)/i;

let snapshotsPaused = false;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function normalizeRecord(value?: Record<string, string | string[]>): Record<string, string | string[]> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function queryToRecord(query?: Record<string, string | string[]>): Record<string, string | string[]> {
  if (query) return normalizeRecord(query);
  if (!isBrowser()) return {};
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of params.entries()) {
    const existing = result[key];
    if (Array.isArray(existing)) existing.push(value);
    else if (existing !== undefined) result[key] = [existing, value];
    else result[key] = value;
  }
  return normalizeRecord(result);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`)
    .join(',')}}`;
}

export function createPageSnapshotKey(identity: PageSnapshotIdentity): string {
  const params = normalizeRecord(identity.params);
  const query = queryToRecord(identity.query);
  return [
    'page-snapshot',
    identity.userId || 'anonymous',
    identity.route || identity.pathname || '/',
    identity.pathname || '/',
    stableSerialize(params),
    stableSerialize(query),
  ].join('|');
}

function selectorForElement(element: Element): string | null {
  const escape = (value: string) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/["\\]/g, '\\$&');
  };
  const explicit = element.getAttribute('data-snapshot-id');
  if (explicit) return `[data-snapshot-id="${escape(explicit)}"]`;
  if (element.id) return `#${escape(element.id)}`;
  const name = element.getAttribute('name');
  if (name) {
    const tag = element.tagName.toLowerCase();
    return `${tag}[name="${escape(name)}"]`;
  }
  return null;
}

function isSensitiveElement(element: Element): boolean {
  const input = element as HTMLInputElement;
  const type = input.type?.toLowerCase();
  const name = element.getAttribute('name') ?? '';
  const id = element.id ?? '';
  const autocomplete = element.getAttribute('autocomplete') ?? '';
  return (
    type === 'password' ||
    type === 'hidden' ||
    SENSITIVE_PATTERN.test(name) ||
    SENSITIVE_PATTERN.test(id) ||
    SENSITIVE_PATTERN.test(autocomplete) ||
    element.hasAttribute('data-snapshot-sensitive')
  );
}

function captureFormValues(): PageSnapshotFormField[] {
  if (!isBrowser()) return [];
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select',
    ),
  );
  return fields.flatMap((field): PageSnapshotFormField[] => {
    if (field.disabled || isSensitiveElement(field)) return [];
    const selector = selectorForElement(field);
    if (!selector) return [];
    if (field instanceof HTMLInputElement) {
      if (field.type === 'file') return [];
      if (field.type === 'checkbox') return [{ selector, value: field.checked, kind: 'input' }];
      if (field.type === 'radio') {
        if (!field.checked) return [];
        return [{ selector, value: field.value.slice(0, MAX_FIELD_LENGTH), kind: 'input' }];
      }
    }
    if (field instanceof HTMLSelectElement && field.multiple) {
      return [
        {
          selector,
          value: Array.from(field.selectedOptions).map((option) =>
            option.value.slice(0, MAX_FIELD_LENGTH),
          ),
          kind: 'select',
        },
      ];
    }
    return [
      {
        selector,
        value: String(field.value ?? '').slice(0, MAX_FIELD_LENGTH),
        kind: field instanceof HTMLTextAreaElement ? 'textarea' : field instanceof HTMLSelectElement ? 'select' : 'input',
      },
    ];
  });
}

function captureElementScroll(): Record<string, { x: number; y: number }> {
  if (!isBrowser()) return {};
  const result: Record<string, { x: number; y: number }> = {};
  document.querySelectorAll<HTMLElement>('[data-snapshot-scroll]').forEach((element) => {
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
    else result[key] = element.getAttribute('aria-expanded') === 'true';
  });
  return result;
}

function captureSelectedItems(): string[] {
  if (!isBrowser()) return [];
  return Array.from(document.querySelectorAll<HTMLElement>('[data-snapshot-selected="true"]'))
    .map((element) => element.getAttribute('data-snapshot-item') || selectorForElement(element))
    .filter((value): value is string => Boolean(value));
}

function captureFocusedElement(): string | null {
  if (!isBrowser()) return null;
  const active = document.activeElement;
  if (!active || active === document.body || isSensitiveElement(active)) return null;
  return selectorForElement(active);
}

function buildSnapshot(input: SavePageSnapshotInput): PageSnapshotRecord {
  const now = Date.now();
  const pathname = input.pathname || (isBrowser() ? window.location.pathname : '/');
  const route = input.route || pathname;
  const params = normalizeRecord(input.params);
  const query = queryToRecord(input.query);
  const key = createPageSnapshotKey({ ...input, pathname, route, params, query });
  return {
    key,
    userId: input.userId || 'anonymous',
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
    accordions: { ...captureBooleanMap('data-snapshot-accordion'), ...input.partial?.accordions },
    selectedItems: input.partial?.selectedItems ?? captureSelectedItems(),
    filters: input.partial?.filters ?? {},
    searchText: input.partial?.searchText ?? null,
    sortOptions: input.partial?.sortOptions ?? {},
    pagination: input.partial?.pagination ?? {},
    infiniteScroll: input.partial?.infiniteScroll ?? {},
    expandedSections: {
      ...captureBooleanMap('data-snapshot-expanded'),
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
    appBuildId: publicEnv.buildId,
  };
}

function isSnapshotCompatible(snapshot: PageSnapshotRecord, expectedVersion = PAGE_SNAPSHOT_VERSION): boolean {
  return (
    snapshot.snapshotVersion === expectedVersion &&
    snapshot.expiresAt > Date.now() &&
    snapshot.appBuildId === publicEnv.buildId
  );
}

export async function saveSnapshot(input: SavePageSnapshotInput): Promise<PageSnapshotRecord | null> {
  if (snapshotsPaused) return null;
  const snapshot = buildSnapshot(input);
  await asolDbSet(ASOL_DB_STORES.PAGE_SNAPSHOTS, snapshot.key, snapshot);
  return snapshot;
}

export async function restoreSnapshot(input: RestorePageSnapshotInput): Promise<PageSnapshotRecord | null> {
  const key = createPageSnapshotKey(input);
  const snapshot = await asolDbGet<PageSnapshotRecord>(ASOL_DB_STORES.PAGE_SNAPSHOTS, key);
  if (!snapshot) return null;
  if (!isSnapshotCompatible(snapshot, input.expectedVersion)) {
    await asolDbDelete(ASOL_DB_STORES.PAGE_SNAPSHOTS, key);
    return null;
  }
  return snapshot;
}

export async function hasSnapshot(input: RestorePageSnapshotInput): Promise<boolean> {
  return Boolean(await restoreSnapshot(input));
}

export async function deleteSnapshot(input: PageSnapshotIdentity | string): Promise<void> {
  const key = typeof input === 'string' ? input : createPageSnapshotKey(input);
  await asolDbDelete(ASOL_DB_STORES.PAGE_SNAPSHOTS, key);
}

export async function clearSnapshots(userId?: string): Promise<void> {
  if (!userId) {
    await asolDbClearStore(ASOL_DB_STORES.PAGE_SNAPSHOTS);
    return;
  }
  const snapshots = await asolDbGetAll<PageSnapshotRecord>(ASOL_DB_STORES.PAGE_SNAPSHOTS);
  await Promise.all(
    snapshots
      .filter((row) => row.value.userId === userId)
      .map((row) => asolDbDelete(ASOL_DB_STORES.PAGE_SNAPSHOTS, row.key)),
  );
}

export function pauseSnapshot(): void {
  snapshotsPaused = true;
}

export function resumeSnapshot(): void {
  snapshotsPaused = false;
}

export async function cleanupExpiredSnapshots(): Promise<number> {
  const snapshots = await asolDbGetAll<PageSnapshotRecord>(ASOL_DB_STORES.PAGE_SNAPSHOTS);
  const expired = snapshots.filter((row) => !isSnapshotCompatible(row.value));
  await Promise.all(expired.map((row) => asolDbDelete(ASOL_DB_STORES.PAGE_SNAPSHOTS, row.key)));
  return expired.length;
}

export function applySnapshotToDom(snapshot: PageSnapshotRecord): void {
  if (!isBrowser()) return;
  for (const field of snapshot.formValues) {
    const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      field.selector,
    );
    if (!element || element.disabled || isSensitiveElement(element)) continue;
    if (element instanceof HTMLInputElement && element.type === 'checkbox') {
      element.checked = Boolean(field.value);
    } else if (element instanceof HTMLInputElement && element.type === 'radio') {
      element.checked = element.value === field.value;
    } else if (element instanceof HTMLSelectElement && element.multiple) {
      const selectedValues = Array.isArray(field.value) ? field.value : [];
      Array.from(element.options).forEach((option) => {
        option.selected = selectedValues.includes(option.value);
      });
    } else {
      element.value = String(field.value ?? '');
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  for (const [selector, scroll] of Object.entries(snapshot.scroll.elements)) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.scrollTo({ left: scroll.x, top: scroll.y });
  }

  requestAnimationFrame(() => {
    window.scrollTo({ left: snapshot.scroll.x, top: snapshot.scroll.y });
    if (snapshot.focusedElement) {
      const element = document.querySelector<HTMLElement>(snapshot.focusedElement);
      if (element && !isSensitiveElement(element)) element.focus({ preventScroll: true });
    }
  });
}
