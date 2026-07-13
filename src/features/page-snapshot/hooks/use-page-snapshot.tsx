'use client';

import * as React from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { usePathname } from 'next/navigation';
import { useSession } from '@/features/auth/components/SessionProvider';
import {
  applySnapshotToDom,
  cleanupExpiredSnapshots,
  deleteSnapshot,
  hasSnapshot,
  pauseSnapshot,
  restoreSnapshot,
  resumeSnapshot,
  saveSnapshot,
} from '../services/page-snapshot-service';
import type {
  PageSnapshotIdentity,
  PageSnapshotOptions,
  PageSnapshotRecord,
} from '../entities/page-snapshot.types';

interface SnapshotRegistryEntry<T = unknown> {
  get: () => T;
  set: (value: T) => void;
}

interface SnapshotContextValue {
  registerState: <T>(key: string, entry: SnapshotRegistryEntry<T>) => () => void;
  getIdentity: (options?: PageSnapshotOptions) => PageSnapshotIdentity;
  requestSave: () => void;
  lastSnapshot: PageSnapshotRecord | null;
}

const SnapshotContext = React.createContext<SnapshotContextValue | null>(null);

const DEFAULT_DEBOUNCE_MS = 600;
const DEFAULT_RESTORE_DELAY_MS = 80;

function searchParamsToRecord(params: URLSearchParams): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    const existing = result[key];
    if (Array.isArray(existing)) existing.push(value);
    else if (existing !== undefined) result[key] = [existing, value];
    else result[key] = value;
  });
  return result;
}

function readBrowserQuery(): Record<string, string | string[]> {
  if (typeof window === 'undefined') return {};
  return searchParamsToRecord(new URLSearchParams(window.location.search));
}

let navigationEventsInstalled = false;
let navigationEmitTimer: number | null = null;

function installNavigationEvents(): void {
  if (typeof window === 'undefined' || navigationEventsInstalled) return;
  navigationEventsInstalled = true;
  const emit = () => {
    if (navigationEmitTimer) window.clearTimeout(navigationEmitTimer);
    navigationEmitTimer = window.setTimeout(() => {
      navigationEmitTimer = null;
      window.dispatchEvent(new Event('gova:navigation'));
    }, 0);
  };
  const patch = (name: 'pushState' | 'replaceState') => {
    const original = window.history[name];
    window.history[name] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      emit();
      return result;
    };
  };
  patch('pushState');
  patch('replaceState');
}

function usePageSnapshotIdentity(namespace?: string): PageSnapshotIdentity {
  const pathname = usePathname() || '/';
  const { session } = useSession();
  const [query, setQuery] = React.useState<Record<string, string | string[]>>({});
  const route = namespace ? `${namespace}:${pathname}` : pathname;

  React.useEffect(() => {
    installNavigationEvents();
    const updateQuery = () => setQuery(readBrowserQuery());
    updateQuery();
    window.addEventListener('popstate', updateQuery);
    window.addEventListener('gova:navigation', updateQuery);
    return () => {
      window.removeEventListener('popstate', updateQuery);
      window.removeEventListener('gova:navigation', updateQuery);
    };
  }, [pathname]);

  return React.useMemo(
    () => ({
      userId: session?.uid || 'anonymous',
      route,
      pathname,
      params: {},
      query,
    }),
    [pathname, query, route, session?.uid],
  );
}

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  const identity = usePageSnapshotIdentity();
  const registryRef = React.useRef(new Map<string, SnapshotRegistryEntry>());
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const identityRef = React.useRef(identity);
  const identitySignature = React.useMemo(
    () => JSON.stringify([identity.userId, identity.route, identity.pathname, identity.query]),
    [identity],
  );
  const [lastSnapshot, setLastSnapshot] = React.useState<PageSnapshotRecord | null>(null);
  const lastSnapshotRef = React.useRef<PageSnapshotRecord | null>(null);

  React.useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  const buildPartial = React.useCallback(() => {
    const componentState: Record<string, unknown> = {};
    registryRef.current.forEach((entry, key) => {
      componentState[key] = entry.get();
    });
    return { componentState };
  }, []);

  const runSave = React.useCallback(async () => {
    const saved = await saveSnapshot({
      ...identityRef.current,
      partial: buildPartial(),
    });
    if (saved) {
      lastSnapshotRef.current = saved;
      setLastSnapshot(saved);
    }
  }, [buildPartial]);

  const requestSave = React.useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void runSave();
    }, DEFAULT_DEBOUNCE_MS);
  }, [runSave]);

  const flushSave = React.useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void runSave();
  }, [runSave]);

  const registerState = React.useCallback(
    <T,>(key: string, entry: SnapshotRegistryEntry<T>) => {
      registryRef.current.set(key, entry as SnapshotRegistryEntry);
      if (
        lastSnapshotRef.current &&
        Object.prototype.hasOwnProperty.call(lastSnapshotRef.current.componentState, key)
      ) {
        entry.set(lastSnapshotRef.current.componentState[key] as T);
      }
      return () => {
        registryRef.current.delete(key);
      };
    },
    [],
  );

  const restoreCurrent = React.useCallback(async () => {
    const snapshot = await restoreSnapshot(identityRef.current);
    if (!snapshot) return;
    lastSnapshotRef.current = snapshot;
    setLastSnapshot(snapshot);
    window.setTimeout(() => {
      Object.entries(snapshot.componentState).forEach(([key, value]) => {
        registryRef.current.get(key)?.set(value);
      });
      applySnapshotToDom(snapshot);
    }, DEFAULT_RESTORE_DELAY_MS);
  }, []);

  React.useEffect(() => {
    void cleanupExpiredSnapshots();
  }, []);

  React.useEffect(() => {
    void restoreCurrent();
    return () => {
      flushSave();
    };
  }, [flushSave, identitySignature, restoreCurrent]);

  React.useEffect(() => {
    const onPageHide = () => flushSave();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushSave]);

  React.useEffect(() => {
    const onImportantChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-snapshot-ignore]')) return;
      requestSave();
    };
    document.addEventListener('input', onImportantChange, true);
    document.addEventListener('change', onImportantChange, true);
    document.addEventListener('click', onImportantChange, true);
    return () => {
      document.removeEventListener('input', onImportantChange, true);
      document.removeEventListener('change', onImportantChange, true);
      document.removeEventListener('click', onImportantChange, true);
    };
  }, [requestSave]);

  React.useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | undefined;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) flushSave();
    }).then((handle) => {
      if (cancelled) {
        void handle.remove();
        return;
      }
      remove = () => {
        void handle.remove();
      };
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [flushSave]);

  const value = React.useMemo<SnapshotContextValue>(
    () => ({
      registerState,
      getIdentity: () => identityRef.current,
      requestSave,
      lastSnapshot,
    }),
    [lastSnapshot, registerState, requestSave],
  );

  return (
    <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>
  );
}

export function usePageSnapshot(options: PageSnapshotOptions = {}) {
  const context = React.useContext(SnapshotContext);
  const identity = usePageSnapshotIdentity(options.namespace);
  const enabled = options.enabled !== false;
  const restoreWhen = options.restoreWhen !== false;
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = React.useCallback(
    async (partial?: Parameters<typeof saveSnapshot>[0]['partial']) => {
      if (!enabled) return null;
      return saveSnapshot({ ...identity, ttlMs: options.ttlMs, partial });
    },
    [enabled, identity, options.ttlMs],
  );

  const debouncedSave = React.useCallback(
    (partial?: Parameters<typeof saveSnapshot>[0]['partial']) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        void save(partial);
      }, debounceMs);
    },
    [debounceMs, save],
  );

  const restore = React.useCallback(async () => {
    if (!enabled || !restoreWhen) return null;
    const snapshot = await restoreSnapshot(identity);
    if (snapshot) applySnapshotToDom(snapshot);
    return snapshot;
  }, [enabled, identity, restoreWhen]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    saveSnapshot: save,
    restoreSnapshot: restore,
    deleteSnapshot: () => deleteSnapshot(identity),
    clearSnapshot: () => deleteSnapshot(identity),
    hasSnapshot: () => hasSnapshot(identity),
    pauseSnapshot,
    resumeSnapshot,
    requestSave: context?.requestSave ?? (() => debouncedSave()),
    lastSnapshot: context?.lastSnapshot ?? null,
  };
}

export function useSnapshotState<T>(
  key: string,
  initialValue: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const context = React.useContext(SnapshotContext);
  const [value, setValue] = React.useState<T>(initialValue);
  const valueRef = React.useRef(value);

  React.useEffect(() => {
    valueRef.current = value;
    context?.requestSave();
  }, [context, value]);

  React.useEffect(() => {
    if (!context) return undefined;
    return context.registerState<T>(key, {
      get: () => valueRef.current,
      set: (next) => {
        setValue(next);
      },
    });
  }, [context, key]);

  return [value, setValue];
}
