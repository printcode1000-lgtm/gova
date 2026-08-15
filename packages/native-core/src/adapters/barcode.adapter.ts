import { createLazyPlugin } from "./lazy-plugin";
import { toNativeCoreError, NativeCoreError } from "../errors/native-core-error";
import { isNativePlatform } from "./platform.adapter";
import type { BarcodeScanOptions, BarcodeScanResult } from "../domain/barcode/types";

const MODULE = "BarcodeScanner";

const scannerPlugin = createLazyPlugin(MODULE, async () => {
  const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
  return { plugin: BarcodeScanner };
});

export const barcodeAdapter = {
  async isAvailable(): Promise<boolean> {
    if (!isNativePlatform()) return false;
    const plugin = (await scannerPlugin.optional())?.plugin;
    if (!plugin) return false;
    try {
      return (await plugin.isSupported()).supported;
    } catch {
      return false;
    }
  },

  async scan(options: BarcodeScanOptions = {}): Promise<BarcodeScanResult> {
    try {
      const plugin = (await scannerPlugin.required()).plugin;
      const { barcodes } = await plugin.scan({
        formats: options.formats as any,
      });
      return {
        barcodes: (barcodes ?? []).map((b) => ({
          rawValue: b.rawValue || b.displayValue || "",
          format: b.format || "UNKNOWN",
        })),
      };
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
