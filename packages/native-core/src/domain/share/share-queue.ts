/**
 * In-memory FIFO queue for inbound share intents.
 *
 * The OS can launch the application directly into a share intent long before
 * React has mounted. Without this queue, that content would be lost.
 *
 * Enforces:
 * - Bounded queue depth (MAX_QUEUE_LENGTH = 50, oldest-eviction)
 * - Deduplication by item identifier
 * - Deliver-once semantics
 * - Automatic flush to active subscribers
 */

import type { ValidatedReceivedItem } from "./share-validator";

export const MAX_QUEUE_LENGTH = 50;

export type ShareListener = (item: ValidatedReceivedItem) => void;

export class ShareQueue {
  private items: ValidatedReceivedItem[] = [];
  private seenIds = new Set<string>();
  private listeners = new Set<ShareListener>();
  private maxDepth: number;

  constructor(maxDepth = MAX_QUEUE_LENGTH) {
    this.maxDepth = maxDepth;
  }

  /**
   * Enqueue a validated share item. If subscribers exist, deliver immediately.
   */
  public enqueue(item: ValidatedReceivedItem): ValidatedReceivedItem | null {
    if (!item || !item.id) return null;
    if (this.seenIds.has(item.id)) {
      return item; // Deduplicate
    }

    this.seenIds.add(item.id);

    // If active listeners exist, deliver directly
    if (this.listeners.size > 0) {
      for (const listener of this.listeners) {
        try {
          listener(item);
        } catch {
          // Listener errors do not abort delivery to other subscribers
        }
      }
      return item;
    }

    // Otherwise buffer in queue
    if (this.items.length >= this.maxDepth) {
      const evicted = this.items.shift();
      if (evicted) {
        this.seenIds.delete(evicted.id);
      }
    }

    this.items.push(item);
    return item;
  }

  /**
   * Enqueue multiple validated items.
   */
  public enqueueAll(items: readonly ValidatedReceivedItem[]): void {
    for (const item of items) {
      this.enqueue(item);
    }
  }

  /**
   * Peek at all pending items without consuming them.
   */
  public getPending(): readonly ValidatedReceivedItem[] {
    return [...this.items];
  }

  /**
   * Consume a single item by id (deliver-once semantics).
   */
  public consume(id: string): boolean {
    const idx = this.items.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  /**
   * Subscribe a listener. Immediately drains and delivers any pending queued items.
   */
  public subscribe(listener: ShareListener): () => void {
    this.listeners.add(listener);

    // Flush pending items
    if (this.items.length > 0) {
      const pending = [...this.items];
      this.items = [];
      for (const item of pending) {
        try {
          listener(item);
        } catch {
          // Continue delivering remaining items
        }
      }
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Drain all pending items without subscribing a persistent listener.
   */
  public drain(): ValidatedReceivedItem[] {
    const drained = [...this.items];
    this.items = [];
    return drained;
  }

  /**
   * Current queue size.
   */
  public size(): number {
    return this.items.length;
  }

  /**
   * Clear all items and seen cache.
   */
  public clear(): void {
    this.items = [];
    this.seenIds.clear();
  }
}

export const ShareQueueManager = ShareQueue;
export const globalShareQueue = new ShareQueue();
