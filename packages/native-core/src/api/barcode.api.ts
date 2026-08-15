import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { barcodeAdapter } from "../adapters/barcode.adapter";
import type { BarcodeScanOptions, BarcodeScanResult } from "../domain/barcode/types";

const MODULE = "Barcode";

export const barcodeApi = {
  async scanBarcode(options?: BarcodeScanOptions): Promise<Result<BarcodeScanResult, NativeCoreError>> {
    try {
      const res = await barcodeAdapter.scan(options);
      return ok(res);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
