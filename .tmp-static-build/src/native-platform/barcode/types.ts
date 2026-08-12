/**
 * Barcode Scanner contract.
 */

export const BarcodeFormats = {
  QrCode: "QR_CODE",
  Aztec: "AZTEC",
  DataMatrix: "DATA_MATRIX",
  Pdf417: "PDF_417",
  Ean13: "EAN_13",
  Ean8: "EAN_8",
  UpcA: "UPC_A",
  UpcE: "UPC_E",
  Code128: "CODE_128",
  Code39: "CODE_39",
  Code93: "CODE_93",
  Codabar: "CODABAR",
  Itf: "ITF",
} as const;

export type BarcodeFormat =
  (typeof BarcodeFormats)[keyof typeof BarcodeFormats];

/** Every 2D and 1D format the scanner understands. */
export const ALL_FORMATS: BarcodeFormat[] = Object.values(BarcodeFormats);

/** QR-only preset for the common "scan a QR" case. */
export const QR_ONLY: BarcodeFormat[] = [BarcodeFormats.QrCode];

export const CameraFacings = {
  Back: "back",
  Front: "front",
} as const;

export type CameraFacing = (typeof CameraFacings)[keyof typeof CameraFacings];

export interface ScanOptions {
  /** Formats to accept. Defaults to every supported format. */
  formats?: BarcodeFormat[];
  /** Which camera to open. Default `back`. */
  facing?: CameraFacing;
  /**
   * Ignore a value already seen within this window, in milliseconds.
   * Default 2000. Set to 0 to report every frame.
   */
  duplicateWindowMs?: number;
}

/** Normalized scan result. */
export interface ScanResult {
  /** Decoded payload. */
  value: string;
  format: BarcodeFormat | string;
  /** Epoch milliseconds when the code was decoded. */
  scannedAt: number;
}

export type ScanListener = (result: ScanResult) => void;

export interface ScanSession {
  /** Fires for each accepted (non-duplicate) scan. */
  onScan: (listener: ScanListener) => () => void;
  /** Turn the torch on or off, when the device has one. */
  setTorch: (enabled: boolean) => Promise<void>;
  isTorchAvailable: () => Promise<boolean>;
  /** Stop scanning and release the camera. */
  stop: () => Promise<void>;
}

export const DEFAULT_DUPLICATE_WINDOW_MS = 2_000;
