export type Unsubscribe = () => void;

export interface Emitter<T> {
  add(listener: (event: T) => void): Unsubscribe;
  emit(event: T): void;
  clear(): void;
  size(): number;
}

export function createEmitter<T>(label: string): Emitter<T> {
  const listeners = new Set<(event: T) => void>();

  return {
    add(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(event) {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch (error) {
          console.warn(`[NativeCore:${label}] listener failed.`, error);
        }
      }
    },
    clear() {
      listeners.clear();
    },
    size: () => listeners.size,
  };
}

export interface PluginHandle {
  remove: () => Promise<void>;
}

export async function removeHandles(handles: PluginHandle[]): Promise<void> {
  await Promise.all(
    handles.map((handle) =>
      handle.remove().catch(() => {
        // A handle already removed by the plugin is not an error.
      }),
    ),
  );
}
