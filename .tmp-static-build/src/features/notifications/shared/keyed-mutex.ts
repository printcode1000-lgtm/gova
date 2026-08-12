/**
 * The two concurrency primitives the notification module needs.
 *
 * Both exist because notification work is triggered by things that fire
 * together and are outside our control: a push arriving while the resume
 * listener is importing the tray, two `visibilitychange` events in the same
 * tick, a service worker and a foreground handler writing the same list.
 *
 * They are not interchangeable:
 *
 * - `KeyedMutex` **serializes**. Two different saves must both happen, one after
 *   the other. Used for every read-modify-write against a stored list, because
 *   IndexedDB gives no compare-and-swap and interleaved reads silently drop the
 *   write that finished first.
 * - `SingleFlight` **coalesces**. Two concurrent requests to import the tray are
 *   the same request; running the second is duplicated work and a duplicate-card
 *   risk, so it joins the first instead.
 */

/** Serializes tasks that share a key, in call order. */
export class KeyedMutex {
  private readonly tails = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T> | T): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    // Chained off a settled predecessor either way: one caller's failure must
    // not strand every caller queued behind it.
    const result = previous.then(
      () => task(),
      () => task(),
    );
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.tails.set(key, tail);
    void tail.then(() => {
      // Only the last task for a key clears it, so the map cannot grow per call.
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return result;
  }

  /** Whether work is currently queued for a key. Test and diagnostic use. */
  isBusy(key: string): boolean {
    return this.tails.has(key);
  }
}

/** Joins concurrent callers of the same key onto one execution. */
export class SingleFlight {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  run<T>(key: string, task: () => Promise<T> | T): Promise<T> {
    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const started = (async () => task())();
    // Cleared before the caller's `.then` runs, so a task that re-triggers
    // itself gets a fresh flight rather than the settled one.
    const tracked = started.finally(() => {
      if (this.inFlight.get(key) === tracked) this.inFlight.delete(key);
    });
    this.inFlight.set(key, tracked);
    return tracked;
  }

  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }
}
