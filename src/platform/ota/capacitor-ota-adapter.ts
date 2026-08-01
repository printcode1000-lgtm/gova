import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";

interface CapacitorWebViewPlugin {
  setServerBasePath(options: { path: string }): Promise<void>;
  getServerBasePath(): Promise<{ path: string }>;
  persistServerBasePath(): Promise<void>;
}

const globalCapacitorPlugins = globalThis as typeof globalThis & {
  __asolWebViewPlugin?: CapacitorWebViewPlugin;
};

function webViewPlugin(): CapacitorWebViewPlugin {
  const existing = globalCapacitorPlugins.__asolWebViewPlugin;
  if (existing) return existing;

  const plugin = registerPlugin<CapacitorWebViewPlugin>("WebView");
  globalCapacitorPlugins.__asolWebViewPlugin = plugin;
  return plugin;
}
const OTA_ROOT = "asol-ota";
const WORKING_ROOT = `${OTA_ROOT}/current`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function safeReleasePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("../") ||
    normalized === ".." ||
    normalized.includes("\0")
  ) {
    throw new Error(`Unsafe OTA file path: ${value}`);
  }
  return normalized;
}

function filesystemPathFromUri(uri: string): string {
  if (!uri.startsWith("file://")) return uri;
  return decodeURIComponent(new URL(uri).pathname);
}

async function removeReleaseRoot(releaseRoot: string): Promise<void> {
  try {
    await Filesystem.rmdir({
      path: releaseRoot,
      directory: Directory.Data,
      recursive: true,
    });
  } catch {
    // A clean install has no previous release directory.
  }
}

async function ensureDirectory(path: string): Promise<void> {
  let existingType: "directory" | "file" | null = null;
  try {
    existingType = (await Filesystem.stat({ path, directory: Directory.Data }))
      .type;
  } catch {
    // Missing directories are created below.
  }

  if (existingType === "directory") return;
  if (existingType === "file")
    throw new Error(`OTA directory path is occupied by a file: ${path}`);

  await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
}

async function exists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

async function removeFile(path: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Data });
  } catch {
    /* Missing files are already removed. */
  }
}

export const capacitorOtaAdapter = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  async nativeVersion(): Promise<string> {
    return (await App.getInfo()).version;
  },

  releaseRoot(version: string): string {
    return `${OTA_ROOT}/staging/${safeReleasePath(version)}`;
  },

  async prepareRelease(version: string): Promise<void> {
    const releaseRoot = this.releaseRoot(version);
    await removeReleaseRoot(releaseRoot);
    await ensureDirectory(releaseRoot);
  },

  async ensureRelease(version: string): Promise<void> {
    await ensureDirectory(this.releaseRoot(version));
  },

  async releaseFileExists(version: string, filePath: string): Promise<boolean> {
    return exists(`${this.releaseRoot(version)}/${safeReleasePath(filePath)}`);
  },

  async readReleaseFile(
    version: string,
    filePath: string,
  ): Promise<ArrayBuffer> {
    const result = await Filesystem.readFile({
      path: `${this.releaseRoot(version)}/${safeReleasePath(filePath)}`,
      directory: Directory.Data,
    });
    const encoded =
      typeof result.data === "string" ? result.data : await result.data.text();
    const binary = atob(encoded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
      .buffer;
  },

  async writeReleaseFile(
    version: string,
    filePath: string,
    data: ArrayBuffer,
  ): Promise<void> {
    const releaseRoot = this.releaseRoot(version);
    const safePath = safeReleasePath(filePath);
    const parent = safePath.includes("/")
      ? safePath.slice(0, safePath.lastIndexOf("/"))
      : "";
    if (parent) {
      await ensureDirectory(`${releaseRoot}/${parent}`);
    }

    await Filesystem.writeFile({
      path: `${releaseRoot}/${safePath}`,
      directory: Directory.Data,
      data: bytesToBase64(new Uint8Array(data)),
      recursive: true,
    });
  },

  async writeReleaseTextFile(
    version: string,
    filePath: string,
    text: string,
  ): Promise<void> {
    await this.writeReleaseFile(
      version,
      filePath,
      new TextEncoder().encode(text).buffer,
    );
  },

  async releasePath(version: string): Promise<string> {
    const { uri } = await Filesystem.getUri({
      path: this.releaseRoot(version),
      directory: Directory.Data,
    });
    return filesystemPathFromUri(uri);
  },

  async workingPath(): Promise<string> {
    await ensureDirectory(WORKING_ROOT);
    const { uri } = await Filesystem.getUri({
      path: WORKING_ROOT,
      directory: Directory.Data,
    });
    return filesystemPathFromUri(uri);
  },

  async isWorkingPath(path: string): Promise<boolean> {
    return path === (await this.workingPath());
  },

  async writeWorkingFile(filePath: string, data: ArrayBuffer): Promise<void> {
    const safePath = safeReleasePath(filePath);
    const parent = safePath.includes("/")
      ? safePath.slice(0, safePath.lastIndexOf("/"))
      : "";
    if (parent) await ensureDirectory(`${WORKING_ROOT}/${parent}`);
    await Filesystem.writeFile({
      path: `${WORKING_ROOT}/${safePath}`,
      directory: Directory.Data,
      data: bytesToBase64(new Uint8Array(data)),
      recursive: true,
    });
  },

  async applyDelta(
    version: string,
    changed: readonly string[],
    deleted: readonly string[],
  ): Promise<{ addedFiles: string[] }> {
    const backupRoot = `${OTA_ROOT}/rollback/${safeReleasePath(version)}`;
    await removeReleaseRoot(backupRoot);
    await ensureDirectory(backupRoot);
    const addedFiles: string[] = [];
    const touched = [
      ...new Set([...changed, ...deleted, "asol-web-manifest.json"]),
    ];
    for (const filePath of touched) {
      const safePath = safeReleasePath(filePath);
      const source = `${WORKING_ROOT}/${safePath}`;
      if (!(await exists(source))) {
        addedFiles.push(safePath);
        continue;
      }
      const parent = safePath.includes("/")
        ? safePath.slice(0, safePath.lastIndexOf("/"))
        : "";
      if (parent) await ensureDirectory(`${backupRoot}/${parent}`);
      await Filesystem.copy({
        from: source,
        to: `${backupRoot}/${safePath}`,
        directory: Directory.Data,
        toDirectory: Directory.Data,
      });
    }
    await Filesystem.writeFile({
      path: `${backupRoot}/rollback-meta.json`,
      directory: Directory.Data,
      data: JSON.stringify({ addedFiles }),
    });
    for (const filePath of changed) {
      const safePath = safeReleasePath(filePath);
      const parent = safePath.includes("/")
        ? safePath.slice(0, safePath.lastIndexOf("/"))
        : "";
      if (parent) await ensureDirectory(`${WORKING_ROOT}/${parent}`);
      await Filesystem.copy({
        from: `${this.releaseRoot(version)}/${safePath}`,
        to: `${WORKING_ROOT}/${safePath}`,
        directory: Directory.Data,
        toDirectory: Directory.Data,
      });
    }
    for (const filePath of deleted)
      await removeFile(`${WORKING_ROOT}/${safeReleasePath(filePath)}`);
    await Filesystem.copy({
      from: `${this.releaseRoot(version)}/asol-web-manifest.json`,
      to: `${WORKING_ROOT}/asol-web-manifest.json`,
      directory: Directory.Data,
      toDirectory: Directory.Data,
    });
    return { addedFiles };
  },

  async rollbackDelta(version: string): Promise<void> {
    const backupRoot = `${OTA_ROOT}/rollback/${safeReleasePath(version)}`;
    let addedFiles: string[] = [];
    try {
      const metadata = await Filesystem.readFile({
        path: `${backupRoot}/rollback-meta.json`,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      addedFiles = JSON.parse(String(metadata.data)).addedFiles ?? [];
    } catch {
      /* An activation interrupted before mutation has nothing new to remove. */
    }
    for (const filePath of addedFiles)
      await removeFile(`${WORKING_ROOT}/${safeReleasePath(filePath)}`);
    const restore = async (relative = ""): Promise<void> => {
      const root = relative ? `${backupRoot}/${relative}` : backupRoot;
      let listing: Awaited<ReturnType<typeof Filesystem.readdir>>;
      try {
        listing = await Filesystem.readdir({
          path: root,
          directory: Directory.Data,
        });
      } catch {
        return;
      }
      for (const entry of listing.files) {
        const child = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.type === "directory") await restore(child);
        else if (child !== "rollback-meta.json") {
          const parent = child.includes("/")
            ? child.slice(0, child.lastIndexOf("/"))
            : "";
          if (parent) await ensureDirectory(`${WORKING_ROOT}/${parent}`);
          await Filesystem.copy({
            from: `${backupRoot}/${child}`,
            to: `${WORKING_ROOT}/${child}`,
            directory: Directory.Data,
            toDirectory: Directory.Data,
          });
        }
      }
    };
    await restore();
  },

  async cleanupTransaction(version: string): Promise<void> {
    await removeReleaseRoot(`${OTA_ROOT}/rollback/${safeReleasePath(version)}`);
    await removeReleaseRoot(this.releaseRoot(version));
  },

  async currentBasePath(): Promise<string> {
    return (await webViewPlugin().getServerBasePath()).path;
  },

  async activate(path: string): Promise<void> {
    await webViewPlugin().setServerBasePath({ path });
  },

  async persistCurrentPath(): Promise<void> {
    await webViewPlugin().persistServerBasePath();
  },
};
