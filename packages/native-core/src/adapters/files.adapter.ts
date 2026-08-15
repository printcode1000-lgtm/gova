import { Filesystem, Directory } from "@capacitor/filesystem";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import { Share } from "@capacitor/share";
import { createLazyPlugin, sanitizePlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError, isCancelledError } from "../errors/native-core-error";
import { base64ToBytes, bytesToBase64, blobToBase64 } from "../domain/binary/binary";
import { isNativePlatform, hasDom } from "./platform.adapter";
import type { PickFilesOptions, PickedFile, SaveFileOptions, SaveFileResult, ReadFileOptions, ReadFileResult, DeleteFileOptions, OpenFileExternallyOptions } from "../domain/files/types";

const MODULE = "Files";

const filePickerPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(FilePicker);
});

const filesystemPlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(Filesystem);
});

const sharePlugin = createLazyPlugin(MODULE, async () => {
  return sanitizePlugin(Share);
});

function resolveDirectory(dir?: string): Directory {
  switch (dir) {
    case "documents":
      return Directory.Documents;
    case "cache":
      return Directory.Cache;
    case "external":
      return Directory.External;
    case "data":
    default:
      return Directory.Data;
  }
}

export const filesAdapter = {
  async pickFiles(options: PickFilesOptions = {}): Promise<PickedFile[]> {
    if (isNativePlatform()) {
      try {
        const picker = await filePickerPlugin.required();
        const result = await picker.pickFiles({
          types: options.types as string[],
          multiple: options.multiple ?? false,
          readData: options.readData ?? true,
        } as any);

        if (!result.files || result.files.length === 0) {
          throw NativeCoreError.cancelled(MODULE);
        }

        return result.files.map((f) => {
          const name = f.name || `file_${Date.now()}`;
          const mimeType = f.mimeType || "application/octet-stream";
          let fileObj: File | undefined;
          if (f.blob) {
            fileObj = new File([f.blob], name, { type: mimeType });
          } else if (f.data) {
            fileObj = new File([base64ToBytes(f.data)], name, { type: mimeType });
          }
          return {
            name,
            mimeType,
            size: f.size || (fileObj ? fileObj.size : 0),
            data: f.data,
            path: f.path,
            file: fileObj,
          };
        });
      } catch (error) {
        throw toNativeCoreError(MODULE, error);
      }
    }

    if (!hasDom()) {
      throw NativeCoreError.unavailable(MODULE);
    }

    return new Promise<PickedFile[]>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = options.multiple ?? false;
      if (options.types?.length) input.accept = options.types.join(",");
      input.style.display = "none";

      let settled = false;
      const settle = (files: File[]) => {
        if (settled) return;
        settled = true;
        input.remove();
        if (files.length === 0) {
          reject(NativeCoreError.cancelled(MODULE));
          return;
        }
        resolve(
          files.map((file) => ({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            file,
          })),
        );
      };

      input.addEventListener("change", () => settle([...(input.files ?? [])]));
      input.addEventListener("cancel", () => settle([]));
      document.body.appendChild(input);
      input.click();
    });
  },

  async saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
    try {
      const fs = await filesystemPlugin.required();
      let base64Data = "";
      if (typeof options.data === "string") {
        base64Data = options.data;
      } else if (options.data instanceof Uint8Array) {
        base64Data = bytesToBase64(options.data);
      } else if (options.data instanceof Blob) {
        base64Data = await blobToBase64(options.data);
      }

      const res = await fs.writeFile({
        path: options.fileName,
        directory: resolveDirectory(options.directory),
        data: base64Data,
        recursive: true,
      });

      return { uri: res.uri };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async readFile(options: ReadFileOptions): Promise<ReadFileResult> {
    try {
      const fs = await filesystemPlugin.required();
      const res = await fs.readFile({
        path: options.path,
        directory: resolveDirectory(options.directory),
      });
      const data = typeof res.data === "string" ? res.data : await blobToBase64(res.data);
      return { data };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async deleteFile(options: DeleteFileOptions): Promise<void> {
    try {
      const fs = await filesystemPlugin.required();
      await fs.deleteFile({
        path: options.path,
        directory: resolveDirectory(options.directory),
      });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  /**
   * Hand a file the application already wrote to an external viewer.
   *
   * Routed through the share sheet, which is the sanctioned way to open a
   * sandbox file on both platforms and needs no storage permission. The opaque
   * OS URI is resolved here and never returned to callers.
   */
  async openExternally(options: OpenFileExternallyOptions): Promise<void> {
    if (!isNativePlatform()) {
      throw NativeCoreError.unavailable(
        MODULE,
        "Opening files externally requires a native platform.",
      );
    }
    try {
      const fs = await filesystemPlugin.required();
      const { uri } = await fs.getUri({
        path: options.path,
        directory: resolveDirectory(options.directory ?? "cache"),
      });
      const share = await sharePlugin.required();
      await share.share({ files: [uri] });
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  user: {
    async openExternally(path: string): Promise<void> {
      await filesAdapter.openExternally({ path });
    },

    async pickFile(options: { types?: readonly string[]; accept?: readonly string[] } = {}): Promise<PickedFile | null> {
      try {
        const types = options.types ?? options.accept;
        const result = await filesAdapter.pickFiles({ types, multiple: false });
        return result[0] ?? null;
      } catch (error) {
        if (isCancelledError(error)) return null;
        throw error;
      }
    },

    async saveToDevice(
      blob: Blob | Uint8Array | string,
      options: { fileName: string; mimeType?: string },
    ): Promise<void> {
      await filesAdapter.saveFile({
        fileName: options.fileName,
        data: blob,
        mimeType: options.mimeType,
        directory: "documents",
      });
    },
  },
};

export const files = filesAdapter;
