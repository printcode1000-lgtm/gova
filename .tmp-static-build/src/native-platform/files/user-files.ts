/**
 * User-facing file access: picking, opening, and saving to the device.
 *
 * Single responsibility: bridge the OS document UI and return normalized
 * `PickedFile` objects carrying real bytes. Application-private storage is a
 * separate concern handled by `app-storage.ts`.
 */

import { base64ToBytes } from "../core/binary";
import { NativePlatformError, toNativeError } from "../core/errors";
import { createLazyPlugin } from "../core/lazy-plugin";
import { hasDom, isNativePlatform } from "../core/platform";
import {
  AcceptPresets,
  type PickedFile,
  type PickFilesOptions,
  type SaveToDeviceOptions,
} from "./types";

const MODULE = "Files";

interface PickerFileResult {
  name?: string;
  mimeType?: string;
  size?: number;
  data?: string;
  blob?: Blob;
  path?: string;
}

interface FilePickerApi {
  pickFiles: (options: Record<string, unknown>) => Promise<{
    files: PickerFileResult[];
  }>;
}

interface ShareApi {
  share: (options: Record<string, unknown>) => Promise<unknown>;
}

const filePickerPlugin = createLazyPlugin(MODULE, async () => {
  const { FilePicker } = await import("@capawesome/capacitor-file-picker");
  return FilePicker as unknown as FilePickerApi;
});

const sharePlugin = createLazyPlugin(MODULE, async () => {
  const { Share } = await import("@capacitor/share");
  return Share as unknown as ShareApi;
});

async function toPickedFile(result: PickerFileResult): Promise<PickedFile> {
  const name = result.name ?? `file-${Date.now()}`;
  const mimeType = result.mimeType ?? "application/octet-stream";

  let file: File;
  if (result.blob) {
    file = new File([result.blob], name, { type: mimeType });
  } else if (result.data) {
    file = new File([base64ToBytes(result.data)], name, {
      type: mimeType,
    });
  } else {
    throw NativePlatformError.internal(
      MODULE,
      new Error(`The picked file "${name}" contained no readable data.`),
    );
  }

  return { name, mimeType, byteSize: result.size ?? file.size, file };
}

/** Browser picker used on the web and as a native fallback. */
function openWebPicker(options: PickFilesOptions): Promise<File[]> {
  if (!hasDom()) {
    return Promise.reject(NativePlatformError.unavailable(MODULE));
  }

  return new Promise<File[]>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = options.multiple ?? false;
    if (options.accept?.length) input.accept = options.accept.join(",");
    input.style.display = "none";

    let settled = false;
    const settle = (files: File[]) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener("focus", onFocus);
      resolve(files);
    };

    const onFocus = () => {
      window.setTimeout(() => {
        if (!settled && (input.files?.length ?? 0) === 0) settle([]);
      }, 400);
    };

    input.addEventListener("change", () => settle([...(input.files ?? [])]));
    input.addEventListener("cancel", () => settle([]));
    window.addEventListener("focus", onFocus);

    document.body.appendChild(input);
    input.click();
  });
}

export class UserFiles {
  /** Pick any file type. */
  async pickFiles(options: PickFilesOptions = {}): Promise<PickedFile[]> {
    if (isNativePlatform()) {
      const picker = await filePickerPlugin.optional();
      if (picker) {
        try {
          const { files } = await picker.pickFiles({
            types: options.accept?.length ? options.accept : undefined,
            limit: options.multiple ? (options.limit ?? 0) : 1,
            readData: true,
          });
          if (files.length === 0) throw NativePlatformError.cancelled(MODULE);
          return await Promise.all(files.map(toPickedFile));
        } catch (error) {
          throw toNativeError(MODULE, error);
        }
      }
    }

    const files = await openWebPicker(options);
    if (files.length === 0) throw NativePlatformError.cancelled(MODULE);
    const limited = options.limit ? files.slice(0, options.limit) : files;
    return limited.map((file) => ({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      byteSize: file.size,
      file,
    }));
  }

  /** Pick exactly one file. */
  async pickFile(options: PickFilesOptions = {}): Promise<PickedFile> {
    const [first] = await this.pickFiles({ ...options, multiple: false });
    if (!first) throw NativePlatformError.cancelled(MODULE);
    return first;
  }

  /** Pick one or more images. */
  pickImages(options: Omit<PickFilesOptions, "accept"> = {}): Promise<PickedFile[]> {
    return this.pickFiles({ ...options, accept: [...AcceptPresets.Images] });
  }

  /** Pick a single PDF. */
  pickPdf(): Promise<PickedFile> {
    return this.pickFile({ accept: [...AcceptPresets.Pdf] });
  }

  /** Pick one or more documents (PDF, Office, plain text). */
  pickDocuments(
    options: Omit<PickFilesOptions, "accept"> = {},
  ): Promise<PickedFile[]> {
    return this.pickFiles({ ...options, accept: [...AcceptPresets.Documents] });
  }

  /**
   * Hand a file to the OS so the user can store it wherever they choose.
   * Native platforms route through the share sheet, which is the sanctioned
   * "save to device" path and needs no storage permission.
   */
  async saveToDevice(
    data: Blob | File,
    options: SaveToDeviceOptions,
  ): Promise<void> {
    if (!isNativePlatform()) {
      if (!hasDom()) throw NativePlatformError.unavailable(MODULE);
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = options.fileName;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      return;
    }

    // Write into the private cache, then let the OS copy it out.
    const { appStorage } = await import("./app-storage");
    const cachePath = `outbox/${Date.now()}-${options.fileName}`;
    await appStorage.write(cachePath, await data.arrayBuffer(), {
      area: "cache",
    });

    const uri = await this.resolveCacheUri(cachePath);
    const share = await sharePlugin.required();
    try {
      await share.share({ title: options.fileName, files: [uri] });
    } catch (error) {
      throw toNativeError(MODULE, error);
    }
  }

  /** Open a previously saved application file in an external viewer. */
  async openExternally(cachePath: string): Promise<void> {
    if (!isNativePlatform()) {
      throw NativePlatformError.unavailable(
        MODULE,
        "Opening files externally requires a native platform.",
      );
    }
    const uri = await this.resolveCacheUri(cachePath);
    const share = await sharePlugin.required();
    try {
      await share.share({ files: [uri] });
    } catch (error) {
      throw toNativeError(MODULE, error);
    }
  }

  /**
   * Resolve a sandbox-relative cache path into the opaque URI the OS needs.
   * The URI is passed straight to a plugin and never returned to callers.
   */
  private async resolveCacheUri(path: string): Promise<string> {
    const filesystem = await import("@capacitor/filesystem");
    const { uri } = await filesystem.Filesystem.getUri({
      path,
      directory: filesystem.Directory.Cache,
    });
    return uri;
  }
}

export const userFiles = new UserFiles();
