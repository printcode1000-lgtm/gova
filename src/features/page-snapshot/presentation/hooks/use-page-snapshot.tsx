'use client';

import * as React from 'react';
import { NativeCore } from '@asol/native-core';
import {
  applySnapshotToDom,
  captureSnapshot,
  cleanupExpiredSnapshots,
  createPageSnapshotKey,
  deleteSnapshot,
  hasSnapshot,
  pauseSnapshot,
  persistSnapshot,
  registerPageSnapshotCorePorts,
  restoreSnapshot,
  resumeSnapshot,
  saveSnapshot,
} from '../../application/services/page-snapshot-service';
import type {
  PageSnapshotIdentity,
  PageSnapshotOptions,
  PageSnapshotRecord,
} from '../../domain/page-snapshot.types';
import {
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_RESTORE_DELAY_MS,
  SnapshotContext,
  type SnapshotContextValue,
  type SnapshotRegistryEntry,
} from './page-snapshot-context';
import { usePageSnapshotIdentity } from './use-page-snapshot-identity';

export function SnapshotProvider({ children }: { children: React.ReactNode }) {
  registerPageSnapshotCorePorts();

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
      .catch((error) => {
        console.warn('[PageSnapshot] Previous save failed before retry.', error);
        return null;
      })
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
      const registeredEntry = entry as SnapshotRegistryEntry;
      registryRef.current.set(key, registeredEntry);
      if (
        lastSnapshotRef.current &&
        lastSnapshotRef.current.key === createPageSnapshotKey(identityRef.current) &&
        Object.prototype.hasOwnProperty.call(lastSnapshotRef.current.componentState, key)
      ) {
        entry.set(lastSnapshotRef.current.componentState[key] as T);
      }
      return () => {
        if (registryRef.current.get(key) === registeredEntry) {
          registryRef.current.delete(key);
        }
      };
    },
    [],
  );

  const restoreCurrent = React.useCallback(async (targetIdentity: PageSnapshotIdentity) => {
    const requestId = ++restoreRequestRef.current;
    const targetKey = createPageSnapshotKey(targetIdentity);
    await pendingSavesRef.current.get(targetKey)?.catch((error) => {
      console.warn('[PageSnapshot] Pending save failed before restore.', error);
      return null;
    });
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
    void NativeCore.onAppStateChange(({ isActive }) => {
      if (!isActive) flushSave();
    }).then((res) => {
      if (res.ok) {
        if (cancelled) {
          res.value();
          return;
        }
        remove = res.value;
      }
    }).catch((error) => {
      console.warn('[PageSnapshot] Failed to install app state listener.', error);
    });
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
  registerPageSnapshotCorePorts();

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
  const registerState = context?.registerState;
  const [value, setValue] = React.useState<T>(initialValue);
  const valueRef = React.useRef(value);
  const requestSaveRef = React.useRef(context?.requestSave);

  requestSaveRef.current = context?.requestSave;

  const setSnapshotValue = React.useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (update) => {
      const previous = valueRef.current;
      const next =
        typeof update === 'function'
          ? (update as (previousValue: T) => T)(previous)
          : update;

      valueRef.current = next;
      setValue(next);
      if (!Object.is(previous, next)) {
        requestSaveRef.current?.();
      }
    },
    [],
  );

  React.useEffect(() => {
    if (!registerState) return undefined;
    return registerState<T>(key, {
      get: () => valueRef.current,
      set: (next) => {
        valueRef.current = next;
        setValue(next);
      },
    });
  }, [key, registerState]);

  return [value, setSnapshotValue];
}
