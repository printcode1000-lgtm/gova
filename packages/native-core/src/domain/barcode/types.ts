export type BarcodeFormat =
  | "qr_code"
  | "aztec"
  | "codabar"
  | "code_39"
  | "code_93"
  | "code_128"
  | "data_matrix"
  | "ean_8"
  | "ean_13"
  | "itf"
  | "maxicode"
  | "pdf_417"
  | "rss_14"
  | "rss_expanded"
  | "upc_a"
  | "upc_e"
  | "upc_ean_extension";

export interface BarcodeScanOptions {
  formats?: readonly BarcodeFormat[];
}

export interface BarcodeResult {
  rawValue: string;
  format: string;
}

export interface BarcodeScanResult {
  barcodes: readonly BarcodeResult[];
}
