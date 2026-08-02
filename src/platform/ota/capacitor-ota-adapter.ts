import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

interface CapacitorWebViewPlugin {
  setServerAssetPath(options: { path: string }): Promise<void>;
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
const ACTIVE_ROOT = `${OTA_ROOT}/active`;

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
  // Recursive mkdir is idempotent. Calling stat for every new parent causes
  // Capacitor Android to emit a native console error for expected misses.
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

  /**
   * The staged release *is* the activation candidate. Downloading straight into
   * the candidate keeps peak disk at one served tree plus one candidate, and
   * leaves activation a pure path switch with no copying at startup.
   */
  releaseRoot(version: string): string {
    return `${ACTIVE_ROOT}/${safeReleasePath(version)}`;
  },

  /**
   * Materialize a complete candidate beside the served tree by cloning the base
   * version, so partially downloaded files never leave it incomplete.
   */
  async prepareRelease(baseVersion: string, version: string): Promise<void> {
    const candidateRoot = this.releaseRoot(version);
    const priorActiveRoot = `${ACTIVE_ROOT}/${safeReleasePath(baseVersion)}`;
    const sourceRoot = (await exists(priorActiveRoot))
      ? priorActiveRoot
      : WORKING_ROOT;
    if (!(await exists(sourceRoot))) {
      throw new Error(`OTA candidate source is missing: ${baseVersion}`);
    }
    await removeReleaseRoot(candidateRoot);
    await ensureDirectory(ACTIVE_ROOT);
    await Filesystem.copy({
      from: sourceRoot,
      to: candidateRoot,
      directory: Directory.Data,
      toDirectory: Directory.Data,
    });
  },

  /** A resume is only valid while its candidate tree still exists. */
  async releaseExists(version: string): Promise<boolean> {
    return exists(this.releaseRoot(version));
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

  async beginReleaseFile(version: string, filePath: string): Promise<void> {
    const releaseRoot = this.releaseRoot(version);
    const safePath = safeReleasePath(filePath);
    const parent = safePath.includes("/")
      ? safePath.slice(0, safePath.lastIndexOf("/"))
      : "";
    if (parent) await ensureDirectory(`${releaseRoot}/${parent}`);
    await Filesystem.writeFile({
      path: `${releaseRoot}/${safePath}`,
      directory: Directory.Data,
      data: "",
      recursive: true,
    });
  },

  async appendReleaseFile(
    version: string,
    filePath: string,
    data: Uint8Array,
  ): Promise<void> {
    await Filesystem.appendFile({
      path: `${this.releaseRoot(version)}/${safeReleasePath(filePath)}`,
      directory: Directory.Data,
      data: bytesToBase64(data),
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
    return path === (await this.workingPath()) || path.includes("/asol-ota/active/");
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

  async prepareWorkingBaseline(): Promise<void> {
    await removeReleaseRoot(WORKING_ROOT);
    await ensureDirectory(WORKING_ROOT);
  },

  async readWorkingFile(filePath: string): Promise<ArrayBuffer> {
    const result = await Filesystem.readFile({
      path: `${WORKING_ROOT}/${safeReleasePath(filePath)}`,
      directory: Directory.Data,
    });
    const encoded = typeof result.data === "string"
      ? result.data
      : await result.data.text();
    const binary = atob(encoded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
  },

  /**
   * Complete the candidate by dropping the files this release removes. The
   * changed files were written straight into it while downloading, so nothing
   * is copied here and activation stays a single path switch.
   */
  async finalizeCandidate(
    version: string,
    deleted: readonly string[],
  ): Promise<string> {
    const candidateRoot = this.releaseRoot(version);
    if (!(await exists(candidateRoot))) {
      throw new Error(`OTA candidate is missing: ${version}`);
    }
    for (const filePath of deleted)
      await removeFile(`${candidateRoot}/${safeReleasePath(filePath)}`);
    return this.activationPath(version);
  },

  async rollbackDelta(version: string): Promise<void> {
    await removeReleaseRoot(this.releaseRoot(version));
  },

  async activationPath(version: string): Promise<string> {
    return this.releasePath(version);
  },

  async confirmActivation(version: string, previousVersion: string): Promise<void> {
    // The candidate for `version` is now the served tree — never remove it.
    if (previousVersion !== version)
      await removeReleaseRoot(`${ACTIVE_ROOT}/${safeReleasePath(previousVersion)}`);
    await removeReleaseRoot(WORKING_ROOT);
  },

  async cleanupTransaction(version: string): Promise<void> {
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

  async revertToNativeBaseline(): Promise<void> {
    // Capacitor 8 exposes bundled assets through the `public` asset path. An
    // empty persisted base path makes the next launch choose those assets too.
    await webViewPlugin().setServerBasePath({ path: "" });
    await webViewPlugin().persistServerBasePath();
    await webViewPlugin().setServerAssetPath({ path: "public" });
    await removeReleaseRoot(OTA_ROOT);
  },
};
