/**
 * Application-private file storage.
 *
 * Single responsibility: save/read/delete files the application owns, in a
 * sandbox the user never browses. Callers pass a logical relative path and a
 * `StorageArea`; absolute platform paths never cross this boundary.
 *
 * On the web the same contract is served by IndexedDB-free in-memory +
 * `localStorage` metadata is deliberately avoided; the browser fallback keeps
 * bytes in memory for the page lifetime only, which matches the "cache"
 * semantics the web platform can actually honour.
 */

import { base64ToBytes, bytesToBase64 } from "../core/binary";
import { NativePlatformError, toNativeError } from "../core/errors";
import { createLazyPlugin } from "../core/lazy-plugin";
import { isNativePlatform } from "../core/platform";
import { StorageAreas, type AppFileInfo, type StorageArea } from "./types";

const MODULE = "Files";

interface FilesystemApi {
  writeFile: (options: Record<string, unknown>) => Promise<{ uri: string }>;
  readFile: (options: Record<string, unknown>) => Promise<{ data: string | Blob }>;
  deleteFile: (options: Record<string, unknown>) => Promise<void>;
  stat: (options: Record<string, unknown>) => Promise<{
    size: number;
    mtime: number;
    type: string;
  }>;
  mkdir: (options: Record<string, unknown>) => Promise<void>;
  rmdir: (options: Record<string, unknown>) => Promise<void>;
  readdir: (options: Record<string, unknown>) => Promise<{ files: unknown[] }>;
  getUri: (options: Record<string, unknown>) => Promise<{ uri: string }>;
}

const filesystemPlugin = createLazyPlugin(MODULE, async () => {
  const plugin = await import("@capacitor/filesystem");
  return {
    api: plugin.Filesystem as unknown as FilesystemApi,
    Directory: plugin.Directory,
  };
});

/**
 * Reject traversal and absolute paths so a caller can never escape the
 * application sandbox through a crafted relative path.
 */
export function assertSafePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (
    !normalized ||
    normalized.includes("../") ||
    normalized === ".." ||
    normalized.includes("\0") ||
    /^[a-zA-Z]:/.test(value)
  ) {
    throw NativePlatformError.invalidArgument(
      MODULE,
      `Unsafe application file path: ${value}`,
    );
  }
  return normalized;
}

async function directoryFor(area: StorageArea) {
  const plugin = await filesystemPlugin.required();
  return area === StorageAreas.Cache
    ? plugin.Directory.Cache
    : plugin.Directory.Data;
}

/** In-memory store backing the web implementation. */
const webStore = new Map<string, { bytes: Uint8Array; modifiedAt: number }>();

function webKey(area: StorageArea, path: string): string {
  return `${area}:${path}`;
}

export class AppStorage {
  async write(
    path: string,
    data: ArrayBuffer | Uint8Array | string,
    options: { area?: StorageArea; recursive?: boolean } = {},
  ): Promise<void> {
    const safePath = assertSafePath(path);
    const area = options.area ?? StorageAreas.Data;
    const bytes =
      typeof data === "string"
        ? new TextEncoder().encode(data)
        : data instanceof Uint8Array
          ? data
          : new Uint8Array(data);

    if (!isNativePlatform()) {
      webStore.set(webKey(area, safePath), {
        bytes,
        modifiedAt: Date.now(),
      });
      return;
    }

    const plugin = await filesystemPlugin.required();
    try {
      await plugin.api.writeFile({
        path: safePath,
        directory: await directoryFor(area),
        data: bytesToBase64(bytes),
        recursive: options.recursive ?? true,
      });
    } catch (error) {
      throw toNativeError(MODULE, error);
    }
  }

  async writeText(
    path: string,
    text: string,
    options: { area?: StorageArea; recursive?: boolean } = {},
  ): Promise<void> {
    await this.write(path, text, options);
  }

  async read(
    path: string,
    options: { area?: StorageArea } = {},
  ): Promise<Uint8Array> {
    const safePath = assertSafePath(path);
    const area = options.area ?? StorageAreas.Data;

    if (!isNativePlatform()) {
      const entry = webStore.get(webKey(area, safePath));
      if (!entry) {
        throw NativePlatformError.invalidArgument(
          MODULE,
          `File not found: ${safePath}`,
        );
      }
      return entry.bytes;
    }

    const plugin = await filesystemPlugin.required();
    try {
      const result = await plugin.api.readFile({
        path: safePath,
        directory: await directoryFor(area),
      });
      if (typeof result.data === "string") return base64ToBytes(result.data);
      return new Uint8Array(await result.data.arrayBuffer());
    } catch (error) {
      throw toNativeError(MODULE, error);
    }
  }

  async readText(
    path: string,
    options: { area?: StorageArea } = {},
  ): Promise<string> {
    return new TextDecoder().decode(await this.read(path, options));
  }

  async exists(
    path: string,
    options: { area?: StorageArea } = {},
  ): Promise<boolean> {
    const safePath = assertSafePath(path);
    const area = options.area ?? StorageAreas.Data;

    if (!isNativePlatform()) {
      return webStore.has(webKey(area, safePath));
    }

    const plugin = await filesystemPlugin.required();
    try {
      await plugin.api.stat({
        path: safePath,
        directory: await directoryFor(area),
      });
      return true;
    } catch {
      return false;
    }
  }

  async info(
    path: string,
    options: { area?: StorageArea } = {},
  ): Promise<AppFileInfo | null> {
    const safePath = assertSafePath(path);
    const area = options.area ?? StorageAreas.Data;

    if (!isNativePlatform()) {
      const entry = webStore.get(webKey(area, safePath));
      return entry
        ? {
            path: safePath,
            byteSize: entry.bytes.byteLength,
            modifiedAt: entry.modifiedAt,
          }
        : null;
    }

    const plugin = await filesystemPlugin.required();
    try {
      const stat = await plugin.api.stat({
        path: safePath,
        directory: await directoryFor(area),
      });
      return {
        path: safePath,
        byteSize: stat.size,
        modifiedAt: stat.mtime ?? null,
      };
    } catch {
      return null;
    }
  }

  async delete(
    path: string,
    options: { area?: StorageArea } = {},
  ): Promise<void> {
    const safePath = assertSafePath(path);
    const area = options.area ?? StorageAreas.Data;

    if (!isNativePlatform()) {
      webStore.delete(webKey(area, safePath));
      return;
    }

    const plugin = await filesystemPlugin.required();
    try {
      await plugin.api.deleteFile({
        path: safePath,
        directory: await directoryFor(area),
      });
    } catch (error) {
      // Deleting an absent file is a no-op, not a failure.
      if (await this.exists(safePath, { area })) {
        throw toNativeError(MODULE, error);
      }
    }
  }

  /** Remove every file the application wrote to the cache area. */
  async clearCache(): Promise<void> {
    if (!isNativePlatform()) {
      for (const key of [...webStore.keys()]) {
        if (key.startsWith(`${StorageAreas.Cache}:`)) webStore.delete(key);
      }
      return;
    }

    const plugin = await filesystemPlugin.required();
    try {
      await plugin.api.rmdir({
        path: "",
        directory: plugin.Directory.Cache,
        recursive: true,
      });
    } catch {
      // A cache directory that does not exist is already clear.
    }
  }

  /** Ensure a directory exists inside the application sandbox. */
  async ensureDirectory(
    path: string,
    options: { area?: StorageArea } = {},
  ): Promise<void> {
    const safePath = assertSafePath(path);
    if (!isNativePlatform()) return;

    const plugin = await filesystemPlugin.required();
    try {
      await plugin.api.mkdir({
        path: safePath,
        directory: await directoryFor(options.area ?? StorageAreas.Data),
        recursive: true,
      });
    } catch {
      // `mkdir` throws when the directory already exists.
    }
  }
}

export const appStorage = new AppStorage();
