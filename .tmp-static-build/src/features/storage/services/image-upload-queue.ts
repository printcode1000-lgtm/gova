"use client";

export type ImageUploadQueueStatus = "queued" | "running";

export interface ImageUploadQueueState {
  status: ImageUploadQueueStatus;
  position: number;
}

export interface EnqueueImageUploadOptions<T> {
  deduplicationKey: string;
  run: (signal: AbortSignal) => Promise<T>;
  onStateChange?: (state: ImageUploadQueueState) => void;
}

export interface ImageUploadQueueHandle<T> {
  id: string;
  promise: Promise<T>;
  cancel: () => boolean;
}

interface QueueItem<T = unknown> {
  id: string;
  deduplicationKey: string;
  controller: AbortController;
  run: (signal: AbortSignal) => Promise<T>;
  onStateChange?: (state: ImageUploadQueueState) => void;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export class ImageUploadCancelledError extends Error {
  constructor(message = "Image upload was cancelled") {
    super(message);
    this.name = "ImageUploadCancelledError";
  }
}

export class DuplicateImageUploadError extends Error {
  constructor() {
    super("This image is already waiting or uploading");
    this.name = "DuplicateImageUploadError";
  }
}

export function isImageUploadCancelledError(
  error: unknown,
): error is ImageUploadCancelledError {
  return (
    error instanceof ImageUploadCancelledError ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

export class ImageUploadQueue {
  private pending: QueueItem[] = [];
  private active: QueueItem | null = null;
  private sequence = 0;
  private readonly keys = new Set<string>();

  enqueue<T>(options: EnqueueImageUploadOptions<T>): ImageUploadQueueHandle<T> {
    if (this.keys.has(options.deduplicationKey)) {
      const promise = Promise.reject<T>(new DuplicateImageUploadError());
      return { id: "duplicate", promise, cancel: () => false };
    }

    const id = `image-upload-${++this.sequence}`;
    let resolvePromise!: (value: T) => void;
    let rejectPromise!: (reason: unknown) => void;
    const promise = new Promise<T>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    const item: QueueItem<T> = {
      id,
      deduplicationKey: options.deduplicationKey,
      controller: new AbortController(),
      run: options.run,
      onStateChange: options.onStateChange,
      resolve: resolvePromise,
      reject: rejectPromise,
    };

    this.keys.add(item.deduplicationKey);
    this.pending.push(item as QueueItem);
    this.notifyPendingPositions();
    void this.startNext();

    return {
      id,
      promise,
      cancel: () => this.cancel(id),
    };
  }

  cancel(id: string): boolean {
    if (this.active?.id === id) {
      this.active.controller.abort(new ImageUploadCancelledError());
      return true;
    }

    const index = this.pending.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const [item] = this.pending.splice(index, 1);
    this.keys.delete(item.deduplicationKey);
    item.controller.abort(new ImageUploadCancelledError());
    item.reject(new ImageUploadCancelledError());
    this.notifyPendingPositions();
    return true;
  }

  clear(): void {
    const queued = this.pending.splice(0);
    queued.forEach((item) => {
      this.keys.delete(item.deduplicationKey);
      item.controller.abort(new ImageUploadCancelledError());
      item.reject(new ImageUploadCancelledError());
    });
    this.active?.controller.abort(new ImageUploadCancelledError());
  }

  getSnapshot(): { active: number; queued: number } {
    return { active: this.active ? 1 : 0, queued: this.pending.length };
  }

  private notifyPendingPositions(): void {
    this.pending.forEach((item, index) => {
      item.onStateChange?.({ status: "queued", position: index + 1 });
    });
  }

  private async startNext(): Promise<void> {
    if (this.active) return;
    const item = this.pending.shift();
    if (!item) return;

    this.active = item;
    this.notifyPendingPositions();
    item.onStateChange?.({ status: "running", position: 0 });
    try {
      if (item.controller.signal.aborted) throw new ImageUploadCancelledError();
      const result = await item.run(item.controller.signal);
      if (item.controller.signal.aborted) throw new ImageUploadCancelledError();
      item.resolve(result);
    } catch (error) {
      item.reject(
        item.controller.signal.aborted
          ? new ImageUploadCancelledError()
          : error,
      );
    } finally {
      this.keys.delete(item.deduplicationKey);
      this.active = null;
      void this.startNext();
    }
  }
}

export const imageUploadQueue = new ImageUploadQueue();
