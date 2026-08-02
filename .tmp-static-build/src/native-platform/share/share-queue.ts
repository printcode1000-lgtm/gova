/**
 * Pending queue for received shares.
 *
 * Single responsibility: hold validated items that arrived before the
 * application was ready to consume them, and hand them out exactly once.
 *
 * The OS can launch the application directly into a share intent, long before
 * React has mounted. Without this queue that content would be lost.
 */

import { createEmitter } from "../core/listener";
import type { ReceivedItem, ShareReceiveListener } from "./types";

const MAX_QUEUE_LENGTH = 50;

export class ShareQueue {
  private readonly items = new Map<string, ReceivedItem>();
  private readonly emitter = createEmitter<ReceivedItem>("share:received");

  /** Add a validated item and notify live listeners. */
  enqueue(item: ReceivedItem): void {
    // Bound the queue so a misbehaving sender cannot grow it without limit.
    if (this.items.size >= MAX_QUEUE_LENGTH) {
      const oldest = [...this.items.values()].sort(
        (left, right) => left.receivedAt - right.receivedAt,
      )[0];
      if (oldest) this.items.delete(oldest.id);
    }
    this.items.set(item.id, item);
    this.emitter.emit(item);
  }

  enqueueAll(items: ReceivedItem[]): void {
    for (const item of items) this.enqueue(item);
  }

  /** Every item still waiting. Does not consume. */
  list(): ReceivedItem[] {
    return [...this.items.values()].sort(
      (left, right) => left.receivedAt - right.receivedAt,
    );
  }

  /** Take one item and remove it from the queue. */
  consume(id: string): ReceivedItem | null {
    const item = this.items.get(id) ?? null;
    if (item) this.items.delete(id);
    return item;
  }

  /** Take every item and empty the queue. */
  consumeAll(): ReceivedItem[] {
    const all = this.list();
    this.items.clear();
    return all;
  }

  /** Discard one item without processing it. */
  clear(id: string): void {
    this.items.delete(id);
  }

  clearAll(): void {
    this.items.clear();
  }

  size(): number {
    return this.items.size;
  }

  /**
   * Subscribe to arrivals. New subscribers immediately receive everything
   * already queued, so a late-mounting component never misses a share.
   */
  addListener(listener: ShareReceiveListener): () => void {
    const unsubscribe = this.emitter.add(listener);
    for (const item of this.list()) {
      try {
        listener(item);
      } catch (error) {
        console.warn("[NativePlatform:Share] replay to listener failed.", error);
      }
    }
    return unsubscribe;
  }
}

export const shareQueue = new ShareQueue();
