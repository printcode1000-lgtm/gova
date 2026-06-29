import { unzipSync } from 'fflate';

type PluginMethod<T = unknown> = (options?: Record<string, unknown>) => Promise<T>;

interface CapacitorFilesystemPlugin {
  mkdir: PluginMethod;
  rmdir: PluginMethod;
  writeFile: PluginMethod;
  getUri: PluginMethod<{ uri: string }>;
}

interface CapacitorWebViewPlugin {
  setServerBasePath: PluginMethod;
  getServerBasePath: PluginMethod<{ path: string }>;
  persistServerBasePath: PluginMethod;
}

interface CapacitorRuntime {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Filesystem?: CapacitorFilesystemPlugin;
    WebView?: CapacitorWebViewPlugin;
  };
}

declare global {
  interface Window {
    Capacitor?: CapacitorRuntime;
  }
}

const DATA_DIRECTORY = 'DATA';
const OTA_ROOT = 'gova-ota/releases';

function runtime(): CapacitorRuntime | undefined {
  return typeof window === 'undefined' ? undefined : window.Capacitor;
}

function plugins() {
  const filesystem = runtime()?.Plugins?.Filesystem;
  const webView = runtime()?.Plugins?.WebView;
  if (!filesystem || !webView) throw new Error('Capacitor OTA plugins are unavailable');
  return { filesystem, webView };
}

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
    const cap = runtime();
    const native = cap?.isNativePlatform?.() ?? (cap?.getPlatform?.() !== 'web');
    return Boolean(native && cap?.Plugins?.Filesystem && cap?.Plugins?.WebView);
  },

  async install(version: string, archive: ArrayBuffer): Promise<string> {
    const { filesystem } = plugins();
    const releaseRoot = `${OTA_ROOT}/${version}`;
    const entries = unzipSync(new Uint8Array(archive));
    const fileNames = Object.keys(entries).map(safeArchivePath);
    if (!fileNames.includes('index.html')) throw new Error('OTA bundle does not contain index.html');

    try {
      await filesystem.rmdir({ path: releaseRoot, directory: DATA_DIRECTORY, recursive: true });
    } catch {
      // The first installation has no previous directory.
    }
    await filesystem.mkdir({ path: releaseRoot, directory: DATA_DIRECTORY, recursive: true });

    const createdDirectories = new Set<string>();
    for (const originalName of Object.keys(entries)) {
      const name = safeArchivePath(originalName);
      if (name.endsWith('/')) continue;
      const parent = name.includes('/') ? name.slice(0, name.lastIndexOf('/')) : '';
      if (parent && !createdDirectories.has(parent)) {
        await filesystem.mkdir({
          path: `${releaseRoot}/${parent}`,
          directory: DATA_DIRECTORY,
          recursive: true,
        });
        createdDirectories.add(parent);
      }
      await filesystem.writeFile({
        path: `${releaseRoot}/${name}`,
        directory: DATA_DIRECTORY,
        data: bytesToBase64(entries[originalName]!),
        recursive: true,
      });
    }

    const { uri } = await filesystem.getUri({ path: releaseRoot, directory: DATA_DIRECTORY });
    return filesystemPathFromUri(uri);
  },

  async currentBasePath(): Promise<string> {
    return (await plugins().webView.getServerBasePath()).path;
  },

  async activate(path: string): Promise<void> {
    await plugins().webView.setServerBasePath({ path });
  },

  async persistCurrentPath(): Promise<void> {
    await plugins().webView.persistServerBasePath();
  },
};
