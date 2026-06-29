import { unzipSync } from 'fflate';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';

interface CapacitorWebViewPlugin {
  setServerBasePath(options: { path: string }): Promise<void>;
  getServerBasePath(): Promise<{ path: string }>;
  persistServerBasePath(): Promise<void>;
}

const WebView = registerPlugin<CapacitorWebViewPlugin>('WebView');
const OTA_ROOT = 'gova-ota/releases';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function safeArchivePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('../') || normalized === '..' || normalized.includes('\0')) {
    throw new Error(`Unsafe OTA archive path: ${value}`);
  }
  return normalized;
}

function filesystemPathFromUri(uri: string): string {
  if (!uri.startsWith('file://')) return uri;
  return decodeURIComponent(new URL(uri).pathname);
}

export const capacitorOtaAdapter = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform();
  },

  async install(version: string, archive: ArrayBuffer): Promise<string> {
    const releaseRoot = `${OTA_ROOT}/${version}`;
    const entries = unzipSync(new Uint8Array(archive));
    const fileNames = Object.keys(entries).map(safeArchivePath);
    if (!fileNames.includes('index.html')) throw new Error('OTA bundle does not contain index.html');

    try {
      await Filesystem.rmdir({ path: releaseRoot, directory: Directory.Data, recursive: true });
    } catch {
      // The first installation has no previous directory.
    }
    await Filesystem.mkdir({ path: releaseRoot, directory: Directory.Data, recursive: true });

    const createdDirectories = new Set<string>();
    for (const originalName of Object.keys(entries)) {
      const name = safeArchivePath(originalName);
      if (name.endsWith('/')) continue;
      const parent = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : '';
      if (parent && !createdDirectories.has(parent)) {
        await Filesystem.mkdir({
          path: `${releaseRoot}/${parent}`,
          directory: Directory.Data,
          recursive: true,
        });
        createdDirectories.add(parent);
      }
      await Filesystem.writeFile({
        path: `${releaseRoot}/${name}`,
        directory: Directory.Data,
        data: bytesToBase64(entries[originalName]!),
        recursive: true,
      });
    }

    const { uri } = await Filesystem.getUri({ path: releaseRoot, directory: Directory.Data });
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
