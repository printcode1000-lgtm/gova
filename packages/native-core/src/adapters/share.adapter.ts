import { Share } from "@capacitor/share";
import { registerPlugin } from "@capacitor/core";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError } from "../errors/native-core-error";
import { isNativePlatform, hasDom } from "./platform.adapter";
import type { ShareOptions, ShareResult } from "../domain/share/types";
import {
  type ValidatedReceivedItem,
  validatePayload,
  validatePayloads,
} from "../domain/share/share-validator";
import { globalShareQueue, type ShareListener } from "../domain/share/share-queue";
import type { Unsubscribe } from "../domain/listener";

const MODULE = "Share";

const sharePlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(Share);
});

interface ShareReceivePluginApi {
  getLaunchShare?: () => Promise<{ items?: unknown[] } | unknown>;
  getPendingItems?: () => Promise<{ items?: unknown[] }>;
  clearLaunchShare?: () => Promise<void>;
  clearPendingItems?: () => Promise<void>;
  addListener: (
    event: string,
    callback: (data: unknown) => void,
  ) => Promise<{ remove: () => Promise<void> }>;
}

const shareReceivePlugin = createLazyPlugin("ShareReceive", async () => {
  return { plugin: registerPlugin<ShareReceivePluginApi>("ShareReceive") };
});

let bridgeListenerAttached = false;

async function ensureBridgeListener(): Promise<void> {
  if (bridgeListenerAttached || !isNativePlatform()) return;
  try {
    const pluginInstance = (await shareReceivePlugin.optional())?.plugin;
    if (!pluginInstance) return;

    // Attach native event listener that feeds the queue
    await pluginInstance.addListener("shareReceived", (rawData: unknown) => {
      const validated = validatePayload(rawData);
      if (validated) {
        globalShareQueue.enqueue(validated);
      }
    });

    bridgeListenerAttached = true;

    // Pull any items that were pending on launch before listener attachment
    const pending =
      (await pluginInstance.getPendingItems?.().catch(() => null)) ??
      (await pluginInstance.getLaunchShare?.().catch(() => null));

    if (pending && typeof pending === "object") {
      const rawList = Array.isArray(pending)
        ? pending
        : Array.isArray((pending as { items?: unknown[] }).items)
          ? (pending as { items?: unknown[] }).items!
          : [pending];
      const validatedItems = validatePayloads(rawList);
      globalShareQueue.enqueueAll(validatedItems);
      await pluginInstance.clearPendingItems?.().catch(() => {});
      await pluginInstance.clearLaunchShare?.().catch(() => {});
    }
  } catch (error) {
    // Intentional fallback: if ShareReceive plugin is not supported on this platform/device,
    // share-receive is silently disabled without crashing the app.
    console.debug("[ShareAdapter] ShareReceive bridge not available on this shell:", error);
  }
}

export const shareAdapter = {
  async canShare(): Promise<boolean> {
    if (isNativePlatform()) {
      const plugin = await sharePlugin.optional();
      if (!plugin) return false;
      const res = await plugin.canShare().catch(() => ({ value: false }));
      return res.value;
    }
    return hasDom() && typeof navigator !== "undefined" && typeof navigator.share === "function";
  },

  async share(options: ShareOptions): Promise<ShareResult> {
    try {
      if (isNativePlatform()) {
        const plugin = await sharePlugin.required();
        const res = await plugin.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle,
          files: options.files as string[],
        });
        return { activityType: res.activityType };
      }

      if (hasDom() && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        return {};
      }

      throw new Error("Sharing is not available on this platform.");
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getPendingShareItems(): Promise<ValidatedReceivedItem[]> {
    await ensureBridgeListener();
    return globalShareQueue.drain();
  },

  async onShareReceived(listener: ShareListener): Promise<Unsubscribe> {
    await ensureBridgeListener();
    return globalShareQueue.subscribe(listener);
  },
};
