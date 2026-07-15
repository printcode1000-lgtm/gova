import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

interface CapacitorWebViewPlugin {
  setServerBasePath(options: { path: string }): Promise<void>;
  getServerBasePath(): Promise<{ path: string }>;
  persistServerBasePath(): Promise<void>;
}

const WebView = registerPlugin<CapacitorWebViewPlugin>('WebView');
const OTA_ROOT = 'asol-ota/releases';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function safeReleasePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (
    !normalized ||
    normalized.includes('../') ||
    normalized === '..' ||
    normalized.includes('\0')
  ) {
    throw new Error(`Unsafe OTA file path: ${value}`);
  }
  return normalized;
}

function filesystemPathFromUri(uri: string): string {
  if (!uri.startsWith('file://')) return uri;
  return decodeURIComponent(new URL(uri).pathname);
}

async function removeReleaseRoot(releaseRoot: string): Promise<void> {
  try {
    await Filesystem.rmdir({ path: releaseRoot, directory: Directory.Data, recursive: true });
  } catch {
    // A clean install has no previous release directory.
  }
}

async function ensureDirectory(path: string): Promise<void> {
  let existingType: 'directory' | 'file' | null = null;
  try {
    existingType = (await Filesystem.stat({ path, directory: Directory.Data })).type;
  } catch {
    // Missing directories are created below.
  }

  if (existingType === 'directory') return;
  if (existingType === 'file') throw new Error(`OTA directory path is occupied by a file: ${path}`);

  await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true });
}

export const capacitorOtaAdapter = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  releaseRoot(version: string): string {
    return `${OTA_ROOT}/${safeReleasePath(version)}`;
  },

  async prepareRelease(version: string): Promise<void> {
    const releaseRoot = this.releaseRoot(version);
    await removeReleaseRoot(releaseRoot);
    await ensureDirectory(releaseRoot);
  },

  async writeReleaseFile(version: string, filePath: string, data: ArrayBuffer): Promise<void> {
    const releaseRoot = this.releaseRoot(version);
    const safePath = safeReleasePath(filePath);
    const parent = safePath.includes('/') ? safePath.slice(0, safePath.lastIndexOf('/')) : '';
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

  async writeReleaseTextFile(version: string, filePath: string, text: string): Promise<void> {
    await this.writeReleaseFile(version, filePath, new TextEncoder().encode(text).buffer);
  },

  async releasePath(version: string): Promise<string> {
    const { uri } = await Filesystem.getUri({
      path: this.releaseRoot(version),
      directory: Directory.Data,
    });
    return filesystemPathFromUri(uri);
  },

  async currentBasePath(): Promise<string> {
    return (await WebView.getServerBasePath()).path;
  },

  async activate(path: string): Promise<void> {
    await WebView.setServerBasePath({ path });
  },

  async persistCurrentPath(): Promise<void> {
    await WebView.persistServerBasePath();
  },
};
