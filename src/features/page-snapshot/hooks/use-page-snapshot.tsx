'use client';

import * as React from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from '@/features/auth/components/SessionProvider';
import {
  applySnapshotToDom,
  captureSnapshot,
  cleanupExpiredSnapshots,
  createPageSnapshotKey,
  deleteSnapshot,
  hasSnapshot,
  pauseSnapshot,
  persistSnapshot,
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

let navigationEventsInstalled = false;

function installNavigationEvents(): void {
  if (typeof window === 'undefined' || navigationEventsInstalled) return;
  navigationEventsInstalled = true;
  const patch = (name: 'pushState' | 'replaceState') => {
    const original = window.history[name];
    window.history[name] = function patchedHistoryMethod(...args) {
      window.dispatchEvent(new Event('asol:before-navigation'));
      return original.apply(this, args);
    };
  };
  patch('pushState');
  patch('replaceState');
}

function usePageSnapshotIdentity(namespace?: string): PageSnapshotIdentity {
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  const { session } = useSession();
  const querySignature = searchParams.toString();
  const query = React.useMemo(
    () => searchParamsToRecord(new URLSearchParams(querySignature)),
    [querySignature],
  );
  const route = namespace ? `${namespace}:${pathname}` : pathname;

  React.useEffect(() => {
    installNavigationEvents();
  }, []);

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
  const restoreRequestRef = React.useRef(0);
  const pendingSavesRef = React.useRef(
    new Map<string, Promise<PageSnapshotRecord | null>>(),
  );

  identityRef.current = identity;

  const buildPartial = React.useCallback(() => {
    const componentState: Record<string, unknown> = {};
    registryRef.current.forEach((entry, key) => {
      componentState[key] = entry.get();
    });
    return { componentState };
  }, []);

  const runSave = React.useCallback(async (targetIdentity = identityRef.current) => {
    const targetKey = createPageSnapshotKey(targetIdentity);
    const capturedSnapshot = captureSnapshot({
      ...targetIdentity,
      partial: buildPartial(),
    });
    if (!capturedSnapshot) return;
    const previousSave = pendingSavesRef.current.get(targetKey);
    const saveOperation = (previousSave ?? Promise.resolve(null))
      .catch(() => null)
      .then(() => persistSnapshot(capturedSnapshot));
    pendingSavesRef.current.set(targetKey, saveOperation);
    const saved = await saveOperation;
    if (pendingSavesRef.current.get(targetKey) === saveOperation) {
      pendingSavesRef.current.delete(targetKey);
    }
    if (saved && createPageSnapshotKey(identityRef.current) === targetKey) {
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

  const flushSave = React.useCallback((targetIdentity = identityRef.current) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void runSave(targetIdentity);
  }, [runSave]);

  const registerState = React.useCallback(
    <T,>(key: string, entry: SnapshotRegistryEntry<T>) => {
      registryRef.current.set(key, entry as SnapshotRegistryEntry);
      if (
        lastSnapshotRef.current &&
        lastSnapshotRef.current.key === createPageSnapshotKey(identityRef.current) &&
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

  const restoreCurrent = React.useCallback(async (targetIdentity: PageSnapshotIdentity) => {
    const requestId = ++restoreRequestRef.current;
    const targetKey = createPageSnapshotKey(targetIdentity);
    await pendingSavesRef.current.get(targetKey)?.catch(() => null);
    const snapshot = await restoreSnapshot(targetIdentity);
    if (
      !snapshot ||
      requestId !== restoreRequestRef.current ||
      createPageSnapshotKey(identityRef.current) !== targetKey
    ) return;
    lastSnapshotRef.current = snapshot;
    setLastSnapshot(snapshot);
    window.setTimeout(() => {
      if (
        requestId !== restoreRequestRef.current ||
        createPageSnapshotKey(identityRef.current) !== targetKey
      ) return;
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
    const targetIdentity = identity;
    const targetKey = createPageSnapshotKey(targetIdentity);
    if (lastSnapshotRef.current?.key !== targetKey) {
      lastSnapshotRef.current = null;
      setLastSnapshot(null);
    }
    void restoreCurrent(targetIdentity);
    return () => {
      restoreRequestRef.current += 1;
    };
  }, [identity, identitySignature, restoreCurrent]);

  React.useEffect(() => {
    const onPageHide = () => flushSave();
    const onBeforeNavigation = () => flushSave(identityRef.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    window.addEventListener('asol:before-navigation', onBeforeNavigation);
    window.addEventListener('popstate', onBeforeNavigation);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      window.removeEventListener('asol:before-navigation', onBeforeNavigation);
      window.removeEventListener('popstate', onBeforeNavigation);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushSave]);

  React.useEffect(() => {
    const onImportantChange = (event: Event) => {
      if (event.type === 'scroll') {
        requestSave();
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-snapshot-ignore]')) return;
      requestSave();
    };
    document.addEventListener('input', onImportantChange, true);
    document.addEventListener('change', onImportantChange, true);
    document.addEventListener('click', onImportantChange, true);
    document.addEventListener('scroll', onImportantChange, true);
    return () => {
      document.removeEventListener('input', onImportantChange, true);
      document.removeEventListener('change', onImportantChange, true);
      document.removeEventListener('click', onImportantChange, true);
      document.removeEventListener('scroll', onImportantChange, true);
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
