/**
 * Public Barcode Scanner API.
 *
 * Single responsibility: run the ML Kit scanner and emit normalized results.
 * Duplicate suppression is delegated to `DuplicateFilter`; camera permission
 * to the Permission Manager.
 */

import { NativePlatformError, toNativeError } from "../core/errors";
import {
  createEmitter,
  removeHandles,
  type PluginHandle,
} from "../core/listener";
import { createLazyPlugin } from "../core/lazy-plugin";
import { isNativePlatform } from "../core/platform";
import { permissionManager } from "../permissions/permission-manager";
import { PermissionKinds } from "../permissions/types";
import { DuplicateFilter } from "./duplicate-filter";
import {
  ALL_FORMATS,
  DEFAULT_DUPLICATE_WINDOW_MS,
  type ScanOptions,
  type ScanResult,
  type ScanSession,
} from "./types";

const MODULE = "BarcodeScanner";

interface NativeBarcode {
  rawValue?: string;
  displayValue?: string;
  format?: string;
}

interface BarcodeScannerApi {
  isSupported: () => Promise<{ supported: boolean }>;
  startScan: (options?: Record<string, unknown>) => Promise<void>;
  stopScan: () => Promise<void>;
  scan: (options?: Record<string, unknown>) => Promise<{
    barcodes: NativeBarcode[];
  }>;
  isTorchAvailable: () => Promise<{ available: boolean }>;
  enableTorch: () => Promise<void>;
  disableTorch: () => Promise<void>;
  addListener: (
    event: string,
    callback: (data: never) => void,
  ) => Promise<PluginHandle>;
  removeAllListeners: () => Promise<void>;
  isGoogleBarcodeScannerModuleAvailable?: () => Promise<{ available: boolean }>;
  installGoogleBarcodeScannerModule?: () => Promise<void>;
}

const scannerPlugin = createLazyPlugin(MODULE, async () => {
  const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
  // Boxed: returning the proxy itself would make this promise call its
  // then() on the native bridge.
  return { plugin: BarcodeScanner as unknown as BarcodeScannerApi };
});

function toResult(barcode: NativeBarcode): ScanResult | null {
  const value = barcode.rawValue ?? barcode.displayValue;
  if (!value) return null;
  return {
    value,
    format: barcode.format ?? "UNKNOWN",
    scannedAt: Date.now(),
  };
}

export class BarcodeScannerModule {
  private activeSession: ScanSession | null = null;

  /** True when the device can scan barcodes. */
  async isAvailable(): Promise<boolean> {
    if (!isNativePlatform()) return false;
    const plugin = (await scannerPlugin.optional())?.plugin ?? null;
    if (!plugin) return false;
    try {
      return (await plugin.isSupported()).supported;
    } catch {
      return false;
    }
  }

  /**
   * Scan once and return the first accepted code.
   * @throws `Cancelled` when the user closes the scanner.
   */
  async scanOnce(options: ScanOptions = {}): Promise<ScanResult> {
    await this.ensureReady();
    const plugin = (await scannerPlugin.required()).plugin;
    try {
      const { barcodes } = await plugin.scan({
        formats: options.formats ?? ALL_FORMATS,
      });
      const result = barcodes.map(toResult).find((entry) => entry !== null);
      if (!result) throw NativePlatformError.cancelled(MODULE);
      return result;
    } catch (error) {
      throw toNativeError(MODULE, error);
    }
  }

  /**
   * Start continuous scanning. The caller must invoke `stop()` on the
   * returned session; only one session may run at a time.
   */
  async startScan(options: ScanOptions = {}): Promise<ScanSession> {
    await this.ensureReady();
    await this.stopActiveSession();

    const plugin = (await scannerPlugin.required()).plugin;
    const scans = createEmitter<ScanResult>("barcode:scan");
    const filter = new DuplicateFilter(
      options.duplicateWindowMs ?? DEFAULT_DUPLICATE_WINDOW_MS,
    );
    const handles: PluginHandle[] = [];
    let stopped = false;

    handles.push(
      await plugin.addListener("barcodesScanned", ((event: {
        barcodes: NativeBarcode[];
      }) => {
        for (const barcode of event.barcodes ?? []) {
          const result = toResult(barcode);
          if (!result) continue;
          if (!filter.accept(result.value, result.scannedAt)) continue;
          scans.emit(result);
        }
      }) as (data: never) => void),
    );

    try {
      await plugin.startScan({
        formats: options.formats ?? ALL_FORMATS,
        ...(options.facing === "front" ? { lensFacing: "FRONT" } : {}),
      });
    } catch (error) {
      await removeHandles(handles);
      throw toNativeError(MODULE, error);
    }

    const session: ScanSession = {
      onScan: scans.add,
      async isTorchAvailable() {
        try {
          return (await plugin.isTorchAvailable()).available;
        } catch {
          return false;
        }
      },
      async setTorch(enabled) {
        try {
          if (enabled) await plugin.enableTorch();
          else await plugin.disableTorch();
        } catch (error) {
          throw toNativeError(MODULE, error);
        }
      },
      async stop() {
        if (stopped) return;
        stopped = true;
        await plugin.stopScan().catch(() => {
          // The scanner may already have closed.
        });
        await removeHandles(handles);
        scans.clear();
        filter.reset();
      },
    };

    this.activeSession = session;
    return session;
  }

  /** Stop any running session. */
  async stopScan(): Promise<void> {
    await this.stopActiveSession();
  }

  isScanning(): boolean {
    return this.activeSession !== null;
  }

  private async stopActiveSession(): Promise<void> {
    const session = this.activeSession;
    if (!session) return;
    this.activeSession = null;
    await session.stop();
  }

  /**
   * Verify support, secure the camera permission, and make sure the Google
   * scanner module is present on Android before opening the camera.
   */
  private async ensureReady(): Promise<void> {
    if (!isNativePlatform()) {
      throw NativePlatformError.unavailable(
        MODULE,
        "Barcode scanning requires a native platform.",
      );
    }

    const plugin = (await scannerPlugin.required()).plugin;
    const supported = await plugin.isSupported().catch(() => ({
      supported: false,
    }));
    if (!supported.supported) {
      throw NativePlatformError.unavailable(
        MODULE,
        "This device cannot scan barcodes.",
      );
    }

    const permission = await permissionManager.requestIfNeeded(
      PermissionKinds.Camera,
    );
    if (!permission.granted) {
      throw NativePlatformError.permissionDenied(
        MODULE,
        permission.requiresSettings
          ? "Camera access is blocked. Enable it from the application settings."
          : "Camera access was not granted.",
      );
    }

    // On Android the ML Kit model ships separately and downloads on demand.
    if (plugin.isGoogleBarcodeScannerModuleAvailable) {
      try {
        const { available } =
          await plugin.isGoogleBarcodeScannerModuleAvailable();
        if (!available) {
          await plugin.installGoogleBarcodeScannerModule?.();
        }
      } catch {
        // A failed model check must not block a device that already has it.
      }
    }
  }
}

export const barcodeScanner = new BarcodeScannerModule();
