type StoreNameDraft = {
  value: string;
  dirty: boolean;
};

const drafts = new Map<string, StoreNameDraft>();
const listeners = new Map<string, Set<() => void>>();

function emit(uid: string): void {
  const uidListeners = listeners.get(uid);
  if (!uidListeners) return;
  uidListeners.forEach((listener) => listener());
}

export function readSharedStoreName(uid: string, fallback: string): string {
  if (!uid) return fallback;
  const draft = drafts.get(uid);
  if (!draft) return fallback;
  return draft.value;
}

export function writeSharedStoreName(uid: string, value: string): void {
  if (!uid) return;
  drafts.set(uid, { value, dirty: true });
  emit(uid);
}

export function hydrateSharedStoreName(uid: string, value: string): void {
  if (!uid) return;
  const draft = drafts.get(uid);
  if (draft?.dirty) return;
  if (draft && draft.value === value) return;
  drafts.set(uid, { value, dirty: false });
  emit(uid);
}

export function commitSharedStoreName(uid: string, value: string): void {
  if (!uid) return;
  drafts.set(uid, { value, dirty: false });
  emit(uid);
}

export function subscribeSharedStoreName(
  uid: string,
  listener: () => void,
): () => void {
  if (!uid) return () => undefined;
  let uidListeners = listeners.get(uid);
  if (!uidListeners) {
    uidListeners = new Set();
    listeners.set(uid, uidListeners);
  }
  uidListeners.add(listener);
  return () => {
    uidListeners.delete(listener);
    if (uidListeners.size === 0) {
      listeners.delete(uid);
    }
  };
}

export function resetSharedStoreNameDrafts(): void {
  drafts.clear();
  listeners.clear();
}
