/**
 * Public Share & Receive API.
 *
 * Single responsibility: send payloads out to the OS share sheet, and wire the
 * native receive bridge into the pending queue. Validation lives in
 * `share-validator.ts`; queueing lives in `share-queue.ts`.
 *
 * Received content is never uploaded automatically. It is validated, copied
 * into application-private storage, queued, and handed to the application only
 * when the application asks for it.
 */

import { NativePlatformError, toNativeError } from "../core/errors";
import { removeHandles, type PluginHandle } from "../core/listener";
import { createLazyPlugin } from "../core/lazy-plugin";
import { hasDom, isNativePlatform } from "../core/platform";
import { appStorage } from "../files/app-storage";
import { shareQueue } from "./share-queue";
import { validatePayload, validatePayloads } from "./share-validator";
import type {
  RawSharePayload,
  ReceivedItem,
  ShareReceiveListener,
  ShareSendOptions,
} from "./types";

const MODULE = "Share";

interface ShareApi {
  share: (options: Record<string, unknown>) => Promise<unknown>;
  canShare?: () => Promise<{ value: boolean }>;
}

/**
 * The receive bridge is a small custom plugin registered by the native
 * projects. It is optional: without it, sending still works and receiving
 * simply reports unavailable.
 */
interface ShareReceiveBridge {
  getPendingItems: () => Promise<{ items: RawSharePayload[] }>;
  clearPendingItems?: () => Promise<void>;
  addListener: (
    event: string,
    callback: (data: unknown) => void,
  ) => Promise<PluginHandle>;
}

const sharePlugin = createLazyPlugin(MODULE, async () => {
  const { Share } = await import("@capacitor/share");
  return Share as unknown as ShareApi;
});

const receiveBridge = createLazyPlugin(MODULE, async () => {
  const { registerPlugin } = await import("@capacitor/core");
  return registerPlugin<ShareReceiveBridge>("ShareReceive");
});

export class ShareModule {
  private bridgeHandles: PluginHandle[] = [];
  private initialized = false;

  /** True when the platform can present a share sheet. */
  async canSend(): Promise<boolean> {
    if (isNativePlatform()) {
      const plugin = await sharePlugin.optional();
      if (!plugin) return false;
      try {
        return plugin.canShare ? (await plugin.canShare()).value : true;
      } catch {
        return false;
      }
    }
    return hasDom() && typeof navigator.share === "function";
  }

  /**
   * Present the OS share sheet.
   * @throws `Cancelled` when the user dismisses the sheet.
   */
  async send(options: ShareSendOptions): Promise<void> {
    if (!options.text && !options.url && !options.title && !options.files?.length) {
      throw NativePlatformError.invalidArgument(
        MODULE,
        "send() requires at least one of: title, text, url, files.",
      );
    }

    if (isNativePlatform()) {
      const plugin = await sharePlugin.required();
      const fileUris = await this.stageFiles(options.files ?? []);
      try {
        await plugin.share({
          ...(options.title ? { title: options.title } : {}),
          ...(options.text ? { text: options.text } : {}),
          ...(options.url ? { url: options.url } : {}),
          ...(fileUris.length ? { files: fileUris } : {}),
          ...(options.dialogTitle ? { dialogTitle: options.dialogTitle } : {}),
        });
      } catch (error) {
        throw toNativeError(MODULE, error);
      }
      return;
    }

    if (!hasDom() || typeof navigator.share !== "function") {
      throw NativePlatformError.unavailable(
        MODULE,
        "This browser cannot present a share sheet.",
      );
    }

    try {
      const webFiles = (options.files ?? []).map((entry) =>
        entry instanceof File
          ? entry
          : new File([entry], `share-${Date.now()}`, { type: entry.type }),
      );
      await navigator.share({
        ...(options.title ? { title: options.title } : {}),
        ...(options.text ? { text: options.text } : {}),
        ...(options.url ? { url: options.url } : {}),
        ...(webFiles.length && navigator.canShare?.({ files: webFiles })
          ? { files: webFiles }
          : {}),
      });
    } catch (error) {
      throw toNativeError(MODULE, error);
    }
  }

  /**
   * Start listening for content shared *into* the application and drain
   * anything the OS queued before startup. Safe to call more than once.
   */
  async initializeReceiving(): Promise<void> {
    if (this.initialized || !isNativePlatform()) return;
    this.initialized = true;

    const bridge = await receiveBridge.optional();
    if (!bridge) return;

    try {
      this.bridgeHandles.push(
        await bridge.addListener("shareReceived", (data) => {
          const payload = data as RawSharePayload | { items?: RawSharePayload[] };
          const items = Array.isArray((payload as { items?: unknown }).items)
            ? validatePayloads((payload as { items: RawSharePayload[] }).items)
            : [validatePayload(payload as RawSharePayload)].filter(
                (item): item is ReceivedItem => item !== null,
              );
          shareQueue.enqueueAll(items);
        }),
      );

      // Drain anything delivered while the WebView was still booting.
      const { items } = await bridge.getPendingItems();
      shareQueue.enqueueAll(validatePayloads(items));
      await bridge.clearPendingItems?.();
    } catch (error) {
      console.warn("[NativePlatform:Share] receive bridge failed.", error);
    }
  }

  /** Everything waiting to be handled. Does not consume. */
  getPendingItems(): ReceivedItem[] {
    return shareQueue.list();
  }

  /** Take one item; it will not be returned again. */
  consumeItem(id: string): ReceivedItem | null {
    return shareQueue.consume(id);
  }

  /** Take everything at once. */
  consumeAllItems(): ReceivedItem[] {
    return shareQueue.consumeAll();
  }

  /** Discard an item without handling it. */
  clearItem(id: string): void {
    shareQueue.clear(id);
  }

  clearAllItems(): void {
    shareQueue.clearAll();
  }

  /** Subscribe to incoming shares; replays anything already queued. */
  addListener(listener: ShareReceiveListener): () => void {
    return shareQueue.addListener(listener);
  }

  /** Detach the native bridge. */
  async dispose(): Promise<void> {
    await removeHandles(this.bridgeHandles);
    this.bridgeHandles = [];
    this.initialized = false;
  }

  /**
   * Copy outgoing blobs into application cache and return their native URIs.
   * The share sheet cannot read an in-memory Blob.
   */
  private async stageFiles(files: Array<Blob | File>): Promise<string[]> {
    if (files.length === 0) return [];

    const filesystem = await import("@capacitor/filesystem");
    const uris: string[] = [];

    for (const [index, entry] of files.entries()) {
      const name =
        entry instanceof File ? entry.name : `share-${Date.now()}-${index}`;
      const path = `outbox/${Date.now()}-${index}-${name}`;
      await appStorage.write(path, await entry.arrayBuffer(), {
        area: "cache",
      });
      const { uri } = await filesystem.Filesystem.getUri({
        path,
        directory: filesystem.Directory.Cache,
      });
      uris.push(uri);
    }
    return uris;
  }
}

export const share = new ShareModule();
